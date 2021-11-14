import { Cached, CacheTimestampInterface, Redis } from '@gapizza/redis';
import Bluebird from 'bluebird';
import { classToPlain } from 'class-transformer';
import cleanDeep from 'clean-deep';
import Err from 'err';
import stringify from 'fast-json-stable-stringify';
import admin from 'firebase-admin';
import flatten from 'flat';
import HTTP_STATUS from 'http-status';
import { isDate, isNil, reduce, round, last } from 'lodash-es';
import { DateTime } from 'luxon';
import traverse, { TraverseContext } from 'traverse';
import { DeepPartial } from 'ts-essentials';

import { firestore } from 'firebase-admin/lib/firestore';
import { DocumentData } from '@google-cloud/firestore';
import log from './logger';
import Timestamp = firestore.Timestamp;

export enum FILTER_OPERATORS {
  GT = '>',
  GTE = '>=',
  LT = '<',
  LTE = '<=',
  EQ = '==',
  NOT_EQ = '!=',
  IN = 'in',
  NOT_IN = 'not-in',
  CONTAINS = 'array-contains',
  CONTAINS_ANY = 'array-contains-any',
}

export type DalModelValue = string | Array<string> | Date | number | null | boolean;

export interface ListFilterInterface {
  property: string;
  operator: FILTER_OPERATORS;
  value: DalModelValue;
}

export enum SORT_DIRECTION {
  ASC = 'asc',
  DESC = 'desc',
}

export interface ListSortInterface {
  property: string;
  direction: SORT_DIRECTION;
}

export interface QueryInterface {
  filters?: ListFilterInterface[];
  sort?: ListSortInterface;
  offset?: number;
  limit?: number;
  before?: DalModelValue;
  after?: DalModelValue;
}

export interface DalModel {
  id: string;
  validate(): void | Promise<void>;
  createdAt: Date;
  updatedAt: Date;
}

interface ServicesInterface {
  firestore: admin.firestore.Firestore;
  redis: Redis;
}

export interface FirestoreConfigInterface<T extends DalModel> {
  readTimestampsToDates?: boolean;
  collection: string;
  convertForDb(instance: DeepPartial<T>): any;
  convertFromDb(params: any): T | Promise<T>;
}

interface InternalFirestoreConfigInterface<T extends DalModel> extends Omit<FirestoreConfigInterface<T>, 'readTimestampsToDates'> {
  readTimestampsToDates: boolean;
}

export interface FirestoreCacheConfigInterface<T extends DalModel> {
  cacheTtlSec: number;
  stringifyForCache(instance: T): Promise<string> | string;
  parseFromCache(instance: string): Promise<T> | T;
}

const CLEAN_CONFIG = {
  emptyArrays: false,
  emptyObjects: false,
  emptyStrings: false,
  nullValues: false,
  undefinedValues: true,
};

const CONFIG_ERROR = 'firestore instance not configured';
const PAGINATE_CONCURRENCY = 25;

/**
 * @class
 */
export class Firestore<T extends DalModel> extends Cached<T> {
  /**
   * @param {ServicesInterface} services
   */
  constructor(services: ServicesInterface) {
    super();

    this.services = services;
  }

  /* eslint-disable @typescript-eslint/explicit-module-boundary-types */

  /**
   * Translate dates to timestamp
   *
   * @param {any} obj
   * @returns {any}
   */
  static translateDatesToTimestamps(obj: any): any {
    // eslint-disable-next-line array-callback-return,func-names
    return traverse(classToPlain(obj)).map(function (this: TraverseContext, property): void {
      if (isDate(property)) {
        this.update(admin.firestore.Timestamp.fromDate(property));
      }
    });
  }

  /**
   * Translate timestamps to dates
   *
   * @param {any} obj
   * @returns {any}
   */
  static translateTimestampsToDates(obj: any): any {
    // eslint-disable-next-line array-callback-return,func-names
    return traverse(obj).map(function (this: TraverseContext, property): void {
      if (property instanceof admin.firestore.Timestamp) {
        this.update(property.toDate());
      }
    });
  }

  /* eslint-enable @typescript-eslint/explicit-module-boundary-types */

  /**
   * Get cache timestamp from firestore timestamp, or fall back to redisTimestamp
   *
   * @param {FirebaseFirestore.Timestamp} timestamp
   * @returns {CacheTimestampInterface}
   */
  static getCacheTimestamp(timestamp: Timestamp): CacheTimestampInterface {
    return {
      seconds: timestamp.seconds,
      // eslint-disable-next-line no-magic-numbers
      microseconds: round(timestamp.nanoseconds / 1000),
    };
  }

  /**
   * Configure firestore
   *
   * @param {FirestoreConfigInterface<T>} config
   * @param {FirestoreCacheConfigInterface<T>} cacheConfig
   * @returns {void}
   */
  configure(config: FirestoreConfigInterface<T>, cacheConfig?: FirestoreCacheConfigInterface<T>): void {
    this.config = { readTimestampsToDates: false, ...config };

    const { redis } = this.services;

    if (cacheConfig) {
      const { cacheTtlSec: ttlSec, stringifyForCache, parseFromCache } = cacheConfig;
      this.configureCache({ redis }, { ttlSec, stringifyForCache, parseFromCache, prefix: config.collection });
    }
  }

  readonly services: ServicesInterface;

  private config?: InternalFirestoreConfigInterface<T>;

  /**
   * Clean model of common properties that shouldn't be written
   *
   * @param {{}} model
   * @returns {{}}
   */
  private static cleanModel(model: { [k: string]: any }): { [k: string]: any } {
    model = classToPlain(model);

    if (model.createdAt) delete model.createdAt;
    if (model.id) delete model.id;

    return cleanDeep(model, CLEAN_CONFIG);
  }

  /**
   * Build firestore query from structured query
   * NOTE: Firestore doesn't work as expected when you combine endBefore and limit, and this corrects that
   *
   * @param {QueryInterface} query
   * @returns {Query}
   */
  private async getQuerySnapshot(query: QueryInterface): Promise<{ reverse: boolean; querySnapshot: admin.firestore.QuerySnapshot }> {
    if (!this.config) throw new Err(CONFIG_ERROR);

    let reverse = false;

    query = Firestore.translateDatesToTimestamps(query);

    let ref: firestore.Query<DocumentData> = this.services.firestore.collection(this.config.collection);

    if (query.filters) {
      ref = reduce(query.filters, (result, filter) => result.where(filter.property, filter.operator, filter.value), ref);
    }

    if (query.offset) {
      ref = ref.offset(query.offset);
    }

    if (query.sort) {
      if (query.before && query.limit) {
        ref = ref.orderBy(query.sort.property, query.sort.direction === SORT_DIRECTION.DESC ? SORT_DIRECTION.ASC : SORT_DIRECTION.DESC);
        reverse = true;
      } else {
        ref = ref.orderBy(query.sort.property, query.sort.direction);
      }
    }

    if (!isNil(query.before) && !isNil(query.after)) {
      throw new Err('cannot provide both before and after for pagination');
    }

    if ((!isNil(query.before) || !isNil(query.after)) && !query.sort) {
      throw new Err('if before or after is provided, must provide sort');
    }

    if (query.before) {
      ref = reverse ? ref.startAfter(query.before) : ref.endBefore(query.before);
    }

    if (query.after) {
      ref = ref.startAfter(query.after);
    }

    if (query.limit) {
      ref = ref.limit(query.limit);
    }

    return {
      reverse,
      querySnapshot: await ref.get(),
    };
  }

  /**
   * Create instance of model in db
   *
   * @param {T} instance
   * @returns {Promise<T>}
   */
  async create(instance: T): Promise<T> {
    if (!this.config) throw new Err(CONFIG_ERROR);

    await instance.validate();

    // I don't know why that casting is necessary
    const data = await this.config.convertForDb(instance as DeepPartial<T>);

    if (!isDate(data.createdAt)) {
      throw new Err('createdAt must be a Date');
    }

    if (!isDate(data.updatedAt)) {
      throw new Err('updatedAt must be a Date');
    }

    try {
      const cleanedData = cleanDeep(Firestore.translateDatesToTimestamps(data), CLEAN_CONFIG);
      const { writeTime } = await this.services.firestore.collection(this.config.collection).doc(instance.id).create(cleanedData);

      await this.cache.delLists();
      await this.cache.setSafe(instance.id, instance, Firestore.getCacheTimestamp(writeTime));

      return instance;
    } catch (error: any) {
      // eslint-disable-next-line no-magic-numbers
      if (error?.code === 6) {
        throw new Err('Already exists', HTTP_STATUS.CONFLICT);
      } else {
        log.error(`Error during create: ${error?.message}`);
        throw new Err('Could not create');
      }
    }
  }

  /**
   * Get instance
   *
   * @param {string} id
   * @returns {Promise<T | null>}
   */
  async get(id: string): Promise<T | null> {
    const cached = await this.cache.get(id);
    if (cached) return cached;
    const { instance, timestamp } = await this.internalGet(id);

    await (instance ? this.cache.setSafe(id, instance, timestamp) : this.cache.delSafe(id, timestamp));

    return instance;
  }

  /**
   * Get instance without touching cache
   *
   * @param {string} id
   * @returns {Promise<T | null>}
   */
  async internalGet(id: string): Promise<{ instance: T | null; timestamp: CacheTimestampInterface }> {
    if (!this.config) throw new Err(CONFIG_ERROR);

    const snapshot = await this.services.firestore.collection(this.config.collection).doc(id).get();
    const timestamp = Firestore.getCacheTimestamp(snapshot.updateTime || snapshot.createTime || snapshot.readTime);

    if (!snapshot.exists) {
      return {
        instance: null,
        timestamp,
      };
    }

    const data = this.config.readTimestampsToDates ? Firestore.translateTimestampsToDates(snapshot.data()) : snapshot.data();

    try {
      const result = data ? await this.config.convertFromDb({ id, ...data }) : null;
      return {
        instance: result,
        timestamp,
      };
    } catch (error: any) {
      log.error(`Error while reading from db: ${error?.message}`);
      log.error('Data: ', data);
      throw error;
    }
  }

  /**
   * Get value directly from the db, by-passing cache and convertFromDb
   *
   * @param {string} id
   * @returns {Promise<any | null>}
   */
  async rawGet(id: string): Promise<any | null> {
    const { raw } = await this.internalRawGet(id);
    return raw;
  }

  /**
   * Get value directly from the db, by-passing cache and convertFromDb
   *
   * @param {string} id
   * @returns {Promise<{ instance: any, timestamp: CacheTimestampInterface }>}
   */
  private async internalRawGet(id: string): Promise<{ raw: any | null; timestamp: CacheTimestampInterface }> {
    if (!this.config) throw new Err(CONFIG_ERROR);

    const snapshot = await this.services.firestore.collection(this.config.collection).doc(id).get();
    const timestamp = Firestore.getCacheTimestamp(snapshot.updateTime || snapshot.createTime || snapshot.readTime);
    if (!snapshot.exists) return { raw: null, timestamp };

    const data = this.config.readTimestampsToDates ? Firestore.translateTimestampsToDates(snapshot.data()) : snapshot.data();
    return {
      raw: data ? { id, ...data } : null,
      timestamp,
    };
  }

  /**
   * Get instance or throw
   *
   * @param {string} id
   * @param {boolean} throw404
   * @returns {Promise<T>}
   */
  async getOrThrow(id: string, throw404 = false): Promise<T> {
    const cached = await this.cache.get(id);
    if (cached) return cached;

    const { instance, timestamp } = await this.internalGetOrThrow(id, throw404);
    await this.cache.setSafe(id, instance, timestamp);
    return instance;
  }

  /**
   * Internal get or throw without touching cache
   *
   * @param {string} id
   * @param {boolean} throw404
   * @returns {Promise<T>}
   */
  private async internalGetOrThrow(id: string, throw404 = false): Promise<{ instance: T; timestamp: CacheTimestampInterface }> {
    const { instance, timestamp } = await this.internalGet(id);
    if (!instance) throw new Err(`id: ${id} not found`, throw404 ? HTTP_STATUS.NOT_FOUND : HTTP_STATUS.INTERNAL_SERVER_ERROR);
    return { instance, timestamp };
  }

  /**
   * Update properties of model
   *
   * @param {string} id
   * @param {{}} patchUpdate
   * @param {Date} [curDate]
   * @returns {Promise<T>}
   */
  async patch(id: string, patchUpdate: DeepPartial<T>, curDate = DateTime.utc().toJSDate()): Promise<T> {
    if (!this.config) throw new Err(CONFIG_ERROR);

    const flattened = Firestore.cleanModel(flatten({ ...(await this.config.convertForDb(patchUpdate)), updatedAt: curDate }, { safe: true }));

    await this.services.firestore
      .collection(this.config.collection)
      .doc(id)
      .update(Firestore.translateDatesToTimestamps(flattened as any));

    const { raw, timestamp } = await this.internalRawGet(id);
    const instance = await this.config.convertFromDb(raw);
    await this.cache.setSafe(id, instance, timestamp);
    await this.cache.delLists();

    return instance;
  }

  /**
   * Model exists
   *
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async exists(id: string): Promise<boolean> {
    return !!(await this.get(id));
  }

  /**
   * Remove model
   *
   * @param {string} id
   * @returns {Promise<void>}
   */
  async remove(id: string): Promise<void> {
    const timestamp = await this.internalRemove(id);
    await this.cache.delSafe(id, timestamp);
    await this.cache.delLists();
  }

  /**
   * Remove model without touching cache
   *
   * @param {string} id
   * @returns {Promise<void>}
   */
  private async internalRemove(id: string): Promise<CacheTimestampInterface> {
    if (!this.config) throw new Err(CONFIG_ERROR);

    const { writeTime } = await this.services.firestore.collection(this.config.collection).doc(id).delete();
    return Firestore.getCacheTimestamp(writeTime);
  }

  /**
   * Overwrite model
   *
   * @param {string} id
   * @param {{}} instance
   * @param {Date} [curDate]
   * @returns {Promise<T>}
   */
  async update(id: string, instance: T, curDate = DateTime.utc().toJSDate()): Promise<T> {
    if (!this.config) throw new Err(CONFIG_ERROR);

    await instance.validate();

    // Retain the original createdAt, and ensure it exists
    const { createdAt } = await this.getOrThrow(id);

    // I don't know why that casting is necessary
    const updated = { ...Firestore.cleanModel({ ...(await this.config.convertForDb(instance as DeepPartial<T>)), updatedAt: curDate }), createdAt };

    const { writeTime } = await this.services.firestore.collection(this.config.collection).doc(id).set(Firestore.translateDatesToTimestamps(updated));
    const timestamp = Firestore.getCacheTimestamp(writeTime);

    const updatedInstance = await this.config.convertFromDb({ id, ...updated });
    await this.cache.setSafe(id, updatedInstance, timestamp);
    await this.cache.delLists();
    return updatedInstance;
  }

  /**
   * List models satisfying query
   *
   * @param {QueryInterface} query
   * @returns {Promise<T[]>}
   */
  async query(query: QueryInterface = {}): Promise<T[]> {
    const cacheKey = stringify(query);
    const cacheResults = await this.cache.getList(cacheKey);
    if (cacheResults) return cacheResults;

    const { reverse, querySnapshot } = await this.getQuerySnapshot(query);

    const snapshots = [] as any[];

    querySnapshot.forEach((snapshot) => {
      if (!snapshot.exists) return;
      if (!this.config) throw new Err(CONFIG_ERROR);

      const data = this.config.readTimestampsToDates ? Firestore.translateTimestampsToDates(snapshot.data()) : snapshot.data();
      snapshots.push({ id: snapshot.id, ...data });
    });

    const results = await Bluebird.map(snapshots, (snapshot) => {
      if (!this.config) throw new Err(CONFIG_ERROR);
      return this.config.convertFromDb(snapshot);
    });

    if (reverse) {
      results.reverse();
    }

    const timestamp = Firestore.getCacheTimestamp(querySnapshot.readTime);
    await this.cache.setListSafe(cacheKey, results, timestamp);
    return results;
  }

  /**
   * Get value directly from the db, by-passing cache and convertFromDb
   *
   * @param {QueryInterface} query
   * @returns {Promise<any[]>}
   */
  async rawQuery(query: QueryInterface): Promise<any[]> {
    const { reverse, querySnapshot } = await this.getQuerySnapshot(query);

    const results = [] as any[];

    querySnapshot.forEach((snapshot) => {
      if (!snapshot.exists) return;
      if (!this.config) throw new Err(CONFIG_ERROR);

      const data = this.config.readTimestampsToDates ? Firestore.translateTimestampsToDates(snapshot.data()) : snapshot.data();
      results.push({ id: snapshot.id, ...data });
    });

    if (reverse) {
      results.reverse();
    }

    return results;
  }

  /**
   * Remove by query
   *
   * @param {QueryInterface} query
   * @param paginate
   * @param {PAGINATE_CONCURRENCY} pageSize
   * @returns {Promise<void>}
   */
  async removeByQuery(query: QueryInterface, paginate = false, pageSize = PAGINATE_CONCURRENCY): Promise<string[]> {
    let ids = [] as string[];

    let isReverse = false;

    const internalRemoveByQuery = async (_query): Promise<string[]> => {
      const { reverse, querySnapshot } = await this.getQuerySnapshot(_query);

      const pageIds = [] as string[];

      querySnapshot.forEach((snapshot) => {
        if (!snapshot.exists) return;
        pageIds.push(snapshot.id);
      });

      await Bluebird.each(pageIds, async (id) => {
        const timestamp = await this.internalRemove(id);
        await this.cache.delSafe(id, timestamp);
      });

      ids = [...ids, ...pageIds];
      isReverse = reverse;
      return pageIds;
    };

    if (paginate) {
      const nextPage = async (after?: DalModelValue): Promise<void> => {
        const paginatedQuery: QueryInterface = after
          ? { sort: { property: 'id', direction: SORT_DIRECTION.ASC }, ...query, limit: pageSize, after }
          : { sort: { property: 'id', direction: SORT_DIRECTION.ASC }, ...query, limit: pageSize };

        const pageIds = await internalRemoveByQuery(paginatedQuery);

        if (pageIds.length >= pageSize) {
          await nextPage(last(pageIds));
        }
      };

      await nextPage();
    } else {
      await internalRemoveByQuery(query);
    }

    if (isReverse) {
      ids.reverse();
    }

    await this.cache.delLists();

    return ids;
  }
}

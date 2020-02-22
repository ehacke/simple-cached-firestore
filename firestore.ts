import { Cached, Redis } from '@ehacke/redis';
import Bluebird from 'bluebird';
import cleanDeep from 'clean-deep';
import Err from 'err';
import stringify from 'fast-json-stable-stringify';
import admin from 'firebase-admin';
import flatten from 'flat';
import HTTP_STATUS from 'http-status';
import { defaultsDeep, isDate, reduce } from 'lodash';
import { DateTime } from 'luxon';
import pino from 'pino';
import traverse, { TraverseContext } from 'traverse';
import { DeepPartial } from 'ts-essentials';

export enum FILTER_OPERATORS {
  GT = '>',
  GTE = '>=',
  LT = '<',
  LTE = '<=',
  EQ = '==',
  CONTAINS = 'array-contains',
}

export type DalModelValue = string | Date | number | null | boolean;

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
}

export interface DalModel {
  id: string;
  validate(): any;
  createdAt: Date;
  updatedAt: Date;
}

interface ServicesInterface {
  firestore: admin.firestore.Firestore;
  redis: Redis;
  log?: pino.Logger | undefined;
}

interface InternalServicesInterface {
  firestore: admin.firestore.Firestore;
  redis: Redis;
  log: pino.Logger;
}

interface ConfigInterface {
  logConfig?: pino.LoggerOptions;
}

export interface FirestoreConfigInterface<T extends DalModel> {
  collection: string;
  convertForDb(instance: DeepPartial<T>): any;
  convertFromDb(params: any): T | Promise<T>;
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

/**
 * @class
 */
export class Firestore<T extends DalModel> extends Cached<T> {
  /**
   * @param {ServicesInterface} services
   * @param {FirestoreConfigInterface} config
   */
  constructor(services: ServicesInterface, config?: ConfigInterface) {
    super();

    const logOptions = defaultsDeep({}, config?.logConfig, { name: 'firestore', prettyPrint: { colorize: true } });

    this.services = {
      ...services,
      log: pino(logOptions),
    };
  }

  /**
   * Translate dates to timestamp
   * @param {any} obj
   * @returns {any}
   */
  static translateDatesToTimestamps(obj): any {
    // eslint-disable-next-line array-callback-return
    return traverse(obj).map(function(this: TraverseContext, property): void {
      if (isDate(property)) {
        this.update(admin.firestore.Timestamp.fromDate(property));
      }
    });
  }

  /**
   * Translate timestamps to dates
   * @param {any} obj
   * @returns {any}
   */
  static translateTimestampsToDates(obj): any {
    // eslint-disable-next-line array-callback-return
    return traverse(obj).map(function(this: TraverseContext, property): void {
      if (property instanceof admin.firestore.Timestamp) {
        this.update((property as admin.firestore.Timestamp).toDate());
      }
    });
  }

  /**
   * Configure firestore
   * @param {FirestoreConfigInterface<T>} config
   * @param {FirestoreCacheConfigInterface<T>} cacheConfig
   * @returns {void}
   */
  configure(config: FirestoreConfigInterface<T>, cacheConfig?: FirestoreCacheConfigInterface<T>): void {
    this.config = config;

    const { redis } = this.services;

    if (cacheConfig) {
      const { cacheTtlSec: ttlSec, stringifyForCache, parseFromCache } = cacheConfig;
      this.configureCache({ redis }, { ttlSec, stringifyForCache, parseFromCache, prefix: config.collection });
    }
  }

  readonly services: InternalServicesInterface;

  private config?: FirestoreConfigInterface<T>;

  /**
   * Clean model of common properties that shouldn't be written
   * @param {{}} model
   * @returns {{}}
   */
  private static cleanModel(model: { [k: string]: any }): { [k: string]: any } {
    model = { ...model };

    if (model.createdAt) delete model.createdAt;
    if (model.id) delete model.id;

    return cleanDeep(model, CLEAN_CONFIG);
  }

  /**
   * Build firestore query from structured query
   * @param {QueryInterface} query
   * @returns {Query}
   */
  private getQuerySnapshot(query: QueryInterface): Promise<admin.firestore.QuerySnapshot> {
    if (!this.config) throw new Err(CONFIG_ERROR);

    let ref = this.services.firestore.collection(this.config.collection) as any;

    if (query.filters) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
      // @ts-ignore // assuming the filter banning null is wrong
      ref = reduce(query.filters, (result, filter) => result.where(filter.property, filter.operator, filter.value), ref);
    }

    if (query.offset) {
      ref = ref.offset(query.offset);
    }

    if (query.sort) {
      ref = ref.orderBy(query.sort.property, query.sort.direction);
    }

    if (query.limit) {
      ref = ref.limit(query.limit);
    }

    return ref.get();
  }

  /**
   * Create instance of model in db
   * @param {T} instance
   * @returns {Promise<T>}
   */
  async create(instance: T): Promise<T> {
    if (!this.config) throw new Err(CONFIG_ERROR);

    await instance.validate();

    // I don't know why that casting is necessary
    const data = cleanDeep(await this.config.convertForDb(instance as DeepPartial<T>), CLEAN_CONFIG);

    if (!isDate(data.createdAt)) {
      throw new Err('createdAt must be a Date');
    }

    if (!isDate(data.updatedAt)) {
      throw new Err('updatedAt must be a Date');
    }

    await this.cache.del(instance.id);
    await this.cache.delLists();

    await this.services.firestore
      .collection(this.config.collection)
      .doc(instance.id)
      .create(Firestore.translateDatesToTimestamps(data));

    await this.cache.delLists();
    await this.cache.set(instance.id, instance);

    return instance;
  }

  /**
   * Get instance
   * @param {string} id
   * @returns {Promise<T | null>}
   */
  async get(id: string): Promise<T | null> {
    let instance = await this.cache.get(id);
    if (instance) return instance;
    instance = await this.internalGet(id);

    if (instance) {
      await this.cache.set(id, instance);
    } else {
      await this.cache.del(id);
    }

    return instance;
  }

  /**
   * Get instance without touching cache
   * @param {string} id
   * @returns {Promise<T | null>}
   */
  private async internalGet(id: string): Promise<T | null> {
    if (!this.config) throw new Err(CONFIG_ERROR);

    const snapshot = await this.services.firestore
      .collection(this.config.collection)
      .doc(id)
      .get();
    if (!snapshot.exists) return null;

    const data = Firestore.translateTimestampsToDates(snapshot.data());

    try {
      const result = data ? await this.config.convertFromDb({ id, ...data }) : null;
      if (!result) await this.cache.del(id);
      return result;
    } catch (error) {
      this.services.log.error(`Error while reading from db: ${error.message}`);
      this.services.log.error('Data: ', data);
      throw error;
    }
  }

  /**
   * Get value directly from the db, by-passing cache and convertFromDb
   * @param {string} id
   * @returns {Promise<any | null>}
   */
  async rawGet(id: string): Promise<any | null> {
    if (!this.config) throw new Err(CONFIG_ERROR);

    const snapshot = await this.services.firestore
      .collection(this.config.collection)
      .doc(id)
      .get();
    if (!snapshot.exists) return null;

    const data = Firestore.translateTimestampsToDates(snapshot.data());
    return data ? { id, ...data } : null;
  }

  /**
   * Get instance or throw
   * @param {string} id
   * @param {boolean} throw404
   * @returns {Promise<T>}
   */
  async getOrThrow(id: string, throw404 = false): Promise<T> {
    let instance = await this.cache.get(id);
    if (instance) return instance;

    instance = await this.internalGetOrThrow(id, throw404);
    await this.cache.set(id, instance);
    return instance;
  }

  /**
   * Internal get or throw without touching cache
   * @param {string} id
   * @param {boolean} throw404
   * @returns {Promise<T>}
   */
  private async internalGetOrThrow(id: string, throw404 = false): Promise<T> {
    const instance = await this.internalGet(id);
    if (!instance) throw new Err(`id: ${id} not found`, throw404 ? HTTP_STATUS.NOT_FOUND : HTTP_STATUS.INTERNAL_SERVER_ERROR);
    return instance;
  }

  /**
   * Update properties of model
   * @param {string} id
   * @param {{}} patchUpdate
   * @param {Date} [curDate]
   * @returns {Promise<T>}
   */
  async patch(id: string, patchUpdate: DeepPartial<T>, curDate = DateTime.utc().toJSDate()): Promise<T> {
    if (!this.config) throw new Err(CONFIG_ERROR);

    const flattened = flatten(Firestore.cleanModel({ ...(await this.config.convertForDb(patchUpdate)), updatedAt: curDate }));

    await this.cache.del(id);
    await this.cache.delLists();

    await this.services.firestore
      .collection(this.config.collection)
      .doc(id)
      .update(flattened as any);

    const instance = await this.rawGet(id);
    await this.cache.delLists();
    await this.cache.set(id, instance);

    return instance;
  }

  /**
   * Model exists
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async exists(id: string): Promise<boolean> {
    return !!(await this.get(id));
  }

  /**
   * Remove model
   * @param {string} id
   * @returns {Promise<void>}
   */
  async remove(id: string): Promise<void> {
    await this.internalRemove(id);
    await this.cache.del(id);
    await this.cache.delLists();
  }

  /**
   * Remove model without touching cache
   * @param {string} id
   * @returns {Promise<void>}
   */
  private async internalRemove(id: string): Promise<void> {
    if (!this.config) throw new Err(CONFIG_ERROR);

    await this.services.firestore
      .collection(this.config.collection)
      .doc(id)
      .delete();
  }

  /**
   * Overwrite model
   * @param {string} id
   * @param {{}} instance
   * @param {Date} [curDate]
   * @returns {Promise<T>}
   */
  async update(id: string, instance: T, curDate = DateTime.utc().toJSDate()): Promise<T> {
    if (!this.config) throw new Err(CONFIG_ERROR);

    await instance.validate();

    await this.cache.del(id);
    await this.cache.delLists();

    // I don't know why that casting is necessary
    const updated = Firestore.cleanModel({ ...(await this.config.convertForDb(instance as DeepPartial<T>)), updatedAt: curDate });

    await this.services.firestore
      .collection(this.config.collection)
      .doc(id)
      .set(Firestore.translateDatesToTimestamps(updated));

    const updatedInstance = await this.config.convertFromDb({ id, ...updated });
    await this.cache.del(id);
    await this.cache.delLists();
    await this.cache.set(id, updatedInstance);
    return updatedInstance;
  }

  /**
   * List models satisfying query
   * @param {QueryInterface} query
   * @returns {Promise<T[]>}
   */
  async query(query: QueryInterface): Promise<T[]> {
    const cacheKey = stringify(query);
    const cacheResults = await this.cache.getList(cacheKey);
    if (cacheResults) return cacheResults;

    const querySnapshot = await this.getQuerySnapshot(query);

    const snapshots = [] as any[];

    querySnapshot.forEach((snapshot) => {
      if (!snapshot.exists) return;
      snapshots.push({ id: snapshot.id, ...Firestore.translateTimestampsToDates(snapshot.data()) });
    });

    const results = (await Bluebird.map(snapshots, (snapshot) => {
      if (!this.config) throw new Err(CONFIG_ERROR);
      return this.config.convertFromDb(snapshot);
    })) as T[];

    await this.cache.setList(cacheKey, results);
    return results;
  }

  /**
   * Get value directly from the db, by-passing cache and convertFromDb
   * @param {QueryInterface} query
   * @returns {Promise<any[]>}
   */
  async rawQuery(query: QueryInterface): Promise<any[]> {
    const querySnapshot = await this.getQuerySnapshot(query);

    const results = [] as any[];

    querySnapshot.forEach((snapshot) => {
      if (!snapshot.exists) return;
      if (!this.config) throw new Err(CONFIG_ERROR);
      results.push({ id: snapshot.id, ...Firestore.translateTimestampsToDates(snapshot.data()) });
    });

    return results;
  }

  /**
   * Remove by query
   * @param {QueryInterface} query
   * @returns {Promise<void>}
   */
  async removeByQuery(query: QueryInterface): Promise<string[]> {
    const querySnapshot = await this.getQuerySnapshot(query);

    const ids = [] as string[];

    querySnapshot.forEach((snapshot) => {
      if (!snapshot.exists) return;
      ids.push(snapshot.id);
    });

    await this.cache.delLists();

    await Bluebird.map(ids, async (id) => {
      await this.cache.del(id);
      await this.internalRemove(id);
      return id;
    });

    await this.cache.delLists();

    return ids;
  }
}

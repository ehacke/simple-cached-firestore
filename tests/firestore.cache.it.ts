import { Redis } from '@ehacke/redis';
import Bluebird from 'bluebird';
import { expect } from 'chai';
import getenv from 'getenv';
import { DateTime } from 'luxon';
import sinon from 'sinon';

import { Firestore } from '@/firestore';

import { toDate } from '../utils';
import { db, deleteCollection } from './firestore';

class DeepClass {
  constructor(params) {
    this.thing1 = params?.thing1;
    this.thing2 = params?.thing2;
    this.arrayThing = params?.arrayThing;
  }

  thing1: string;

  thing2: string;

  arrayThing?: { foo: string }[];
}

class TestClass {
  constructor(params) {
    this.id = params.id;
    this.foo = params.foo;
    this.bar = params.bar;
    this.deep = new DeepClass(params.deep);
    this.createdAt = toDate(params.createdAt);
    this.updatedAt = toDate(params.updatedAt);
  }

  id: string;

  foo: string;

  bar: string;

  deep: DeepClass;

  createdAt: Date;

  updatedAt: Date;

  validate() {
    return true;
  }

  getDalSchema() {
    return {
      excludeFromIndexes: [],
    };
  }
}

const defaultServices = {
  firestore: db,
  redis: new Redis({ host: getenv('REDIS_HOST'), port: getenv('REDIS_PORT') }),
};

describe('firestore integration cache tests', function () {
  this.timeout(5000);

  beforeEach(async () => {
    await deleteCollection('collection-foo');
    await defaultServices.redis.flushdb();
  });

  afterEach(() => sinon.restore());

  it('during race condition, update cache with most recently updated snapshot', async () => {
    const curDate = DateTime.fromISO('2019-01-01T00:00:00.000Z').toJSDate();

    const ds = new Firestore<TestClass>(defaultServices);

    const specialConfig = {
      collection: 'collection-foo',
      convertFromDb: async (params) => {
        console.log(`foo ${params?.foo}`);
        // This slows the first update until after the second update
        if (params?.foo === 'first') {
          await Bluebird.delay(500);
        }

        return new TestClass(params);
      },
      convertForDb: (params) => params,
    };

    ds.configure(specialConfig);

    const testInstance = new TestClass({
      id: 'foo-id',
      foo: 'something',
      bar: 'baz',
      createdAt: curDate,
      updatedAt: curDate,
    });

    await ds.create(testInstance);

    const firstPromise = ds.update(testInstance.id, new TestClass({ ...testInstance, foo: 'first' }), curDate);
    await Bluebird.delay(100);
    const secondPromise = ds.update(testInstance.id, new TestClass({ ...testInstance, foo: 'second' }), curDate);

    await firstPromise;
    await secondPromise;

    const found = await ds.getOrThrow(testInstance.id);
    // const cacheVersion = await ds.cache.get(testInstance.id);
    //
    // expect(JSON.parse(cacheVersion as any).foo).to.eql('second');

    expect(found.foo).to.eql('second');
  });
});

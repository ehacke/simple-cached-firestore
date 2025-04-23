
import { Redis } from '@ehacke/redis';
import Bluebird from 'bluebird';
import { expect } from 'chai';
import getenv from 'getenv';
import { DateTime } from 'luxon';
import sinon from 'sinon';

import { Firestore } from '../src/firestore';
import { toDate } from '../src/utils';
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

  validate() {}
}

const defaultServices = {
  firestore: db,
  redis: new Redis({ host: getenv('REDIS_HOST'), port: getenv.int('REDIS_PORT') }),
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
      convertForDb: (params) => params,
      convertFromDb: async (params) => new TestClass(params),
    };

    ds.configure(specialConfig, {
      cacheTtlSec: 5,
      parseFromCache: (instance) => new TestClass(JSON.parse(instance)),
      stringifyForCache: (instance: TestClass) => JSON.stringify(instance),
    });

    const originalSet = ds.cache.setSafe.bind(ds.cache);

    let counter = 0;

    sinon.stub(ds.cache, 'setSafe').callsFake(async (id, instance, timestamp) => {
      if (instance?.foo === 'first') {
        if (counter === 0) {
          counter++;
          await Bluebird.delay(500);
        } else {
          counter++;
        }
      }

      await originalSet(id, instance, timestamp);
    });

    const testInstance = new TestClass({
      bar: 'baz',
      createdAt: curDate,
      foo: 'something',
      id: 'foo-id',
      updatedAt: curDate,
    });

    await ds.create(testInstance);

    const firstPromise = ds.update(testInstance.id, new TestClass({ ...testInstance, foo: 'first' }), curDate);
    await Bluebird.delay(100);
    const secondPromise = ds.update(testInstance.id, new TestClass({ ...testInstance, foo: 'second' }), curDate);

    await firstPromise;
    await secondPromise;

    const found = await ds.getOrThrow(testInstance.id);
    const cacheVersion = await ds.cache.get(testInstance.id);

    expect(found.foo).to.eql('second');
    expect(cacheVersion?.foo).to.eql('second');
  });
});

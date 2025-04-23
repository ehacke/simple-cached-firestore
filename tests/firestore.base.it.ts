/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect } from 'chai';
import { DateTime } from 'luxon';
import sinon from 'sinon';
import HTTP_STATUS from 'http-status';
import { times } from 'lodash-es';
import Bluebird from 'bluebird';
import { FILTER_OPERATORS, Firestore } from '../src/firestore';
import { toDate } from '../src/utils';
import { db, deleteCollection } from './firestore';
import redis from './mockRedis';

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

const config = {
  collection: 'collection-foo',
  convertForDb: (params) => params,
  convertFromDb: (params) => new TestClass(params),
};

const defaultServices = {
  firestore: db,
  redis,
};

const resetSpies = (spied) => {
  spied.get.resetHistory();
  spied.setSafe.resetHistory();
  spied.delSafe.resetHistory();
  spied.setListSafe.resetHistory();
  spied.getList.resetHistory();
  spied.delListSafe.resetHistory();
  spied.delLists.resetHistory();
};

describe('firestore integration tests', function () {
  this.timeout(5000);

  beforeEach(async () => deleteCollection('collection-foo'));

  afterEach(() => sinon.restore());

  it('create model in db', async () => {
    const ds = new Firestore<TestClass>(defaultServices);
    ds.configure(config);

    const spied = sinon.spy<Cache>(ds.cache);

    const testInstance = new TestClass({
      bar: 'baz',
      createdAt: DateTime.fromISO('2019-01-01T00:00:00.000Z').toJSDate(),
      foo: 'something',
      id: 'foo-id',
      updatedAt: DateTime.fromISO('2019-01-01T00:00:00.000Z').toJSDate(),
    });

    const created = await ds.create(testInstance);

    expect(spied.get.callCount).to.eql(0);
    expect(spied.setSafe.callCount).to.eql(1);
    expect(spied.delSafe.callCount).to.eql(0);
    expect(spied.setListSafe.callCount).to.eql(0);
    expect(spied.getList.callCount).to.eql(0);
    expect(spied.delListSafe.callCount).to.eql(0);
    expect(spied.delLists.callCount).to.eql(1);

    const found = await ds.getOrThrow(testInstance.id);

    expect(found).to.eql(created);
    expect(found).to.eql(testInstance);
  });

  it('create model in db - conflict', async () => {
    const ds = new Firestore<TestClass>(defaultServices);
    ds.configure(config);

    const testInstance = new TestClass({
      bar: 'baz',
      createdAt: DateTime.fromISO('2019-01-01T00:00:00.000Z').toJSDate(),
      foo: 'something',
      id: 'foo-id',
      updatedAt: DateTime.fromISO('2019-01-01T00:00:00.000Z').toJSDate(),
    });

    await ds.create(testInstance);
    const result = await ds.create(testInstance).catch((error) => error);

    expect(result.status).to.eql(HTTP_STATUS.CONFLICT);
    expect(result.message).to.eql('Already exists');
  });

  it('create deep model in db with undefined', async () => {
    const ds = new Firestore<TestClass>(defaultServices);
    ds.configure(config);

    const curDate = DateTime.fromISO('2019-01-01T00:00:00.000Z').toJSDate();

    const testInstance = new TestClass({
      bar: 'baz',
      createdAt: curDate,
      deep: {
        thing1: '1',
        thing2: undefined,
      },
      foo: 'something',
      id: 'foo-id',
      updatedAt: curDate,
    });

    const created = await ds.create(testInstance);

    const found = await ds.getOrThrow(testInstance.id);

    expect(found).to.eql(created);
    expect(found).to.eql(testInstance);
  });

  it('dont create model in db if createdAt or updatedAt is not Date', async () => {
    const ds = new Firestore<TestClass>(defaultServices);
    ds.configure(config);

    const testInstance = new TestClass({
      bar: 'baz',
      createdAt: DateTime.fromISO('2019-01-01T00:00:00.000Z').toJSDate(),
      foo: 'something',
      id: 'foo-id',
      updatedAt: DateTime.fromISO('2019-01-01T00:00:00.000Z').toJSDate(),
    });

    (testInstance.createdAt as any) = '2019-01-01T00:00:00.000Z';

    let result = await ds
      .create(testInstance)
      .then(() => null)
      .catch((error) => error);
    expect(result && result.message).to.eql('createdAt must be a Date');

    testInstance.createdAt = DateTime.fromISO('2019-01-01T00:00:00.000Z').toJSDate();
    (testInstance.updatedAt as any) = '2019-01-01T00:00:00.000Z';

    result = await ds
      .create(testInstance)
      .then(() => null)
      .catch((error) => error);
    expect(result && result.message).to.eql('updatedAt must be a Date');
  });

  it('patch deep model in db', async () => {
    const ds = new Firestore<TestClass>(defaultServices);
    ds.configure(config);
    const spied = sinon.spy<Cache>(ds.cache);

    const curDate = DateTime.fromISO('2019-01-01T00:00:00.000Z').toJSDate();

    const testInstance = new TestClass({
      bar: 'baz',
      createdAt: curDate,
      deep: {
        thing1: '1',
        thing2: '2',
      },
      foo: 'something',
      id: 'foo-id',
      updatedAt: curDate,
    });

    const created = await ds.create(testInstance);
    resetSpies(spied);
    const updated = await ds.patch(created.id, { deep: { thing2: '9' }, foo: 'new-foo' }, curDate);

    expect(spied.get.callCount).to.eql(0);
    expect(spied.setSafe.callCount).to.eql(1);
    expect(spied.delSafe.callCount).to.eql(0);
    expect(spied.setListSafe.callCount).to.eql(0);
    expect(spied.getList.callCount).to.eql(0);
    expect(spied.delListSafe.callCount).to.eql(0);
    expect(spied.delLists.callCount).to.eql(1);

    expect(updated.foo).to.eql('new-foo');
    expect(updated.bar).to.eql('baz');
    expect(updated.deep).to.eql({
      arrayThing: undefined,
      thing1: '1',
      thing2: '9',
    });
  });

  it('patch deep model in db with arrays', async () => {
    const ds = new Firestore<TestClass>(defaultServices);
    ds.configure(config);
    const spied = sinon.spy<Cache>(ds.cache);

    const curDate = DateTime.fromISO('2019-01-01T00:00:00.000Z').toJSDate();

    const testInstance = new TestClass({
      bar: 'baz',
      createdAt: curDate,
      deep: {
        thing1: '1',
        thing2: '2',
      },
      foo: 'something',
      id: 'foo-id',
      updatedAt: curDate,
    });

    const created = await ds.create(testInstance);
    resetSpies(spied);
    const updated = await ds.patch(created.id, { deep: { arrayThing: [{ foo: 'yo' }] }, foo: 'new-foo' }, curDate);

    expect(spied.get.callCount).to.eql(0);
    expect(spied.setSafe.callCount).to.eql(1);
    expect(spied.delSafe.callCount).to.eql(0);
    expect(spied.setListSafe.callCount).to.eql(0);
    expect(spied.getList.callCount).to.eql(0);
    expect(spied.delListSafe.callCount).to.eql(0);
    expect(spied.delLists.callCount).to.eql(1);

    const found = await ds.getOrThrow(testInstance.id);

    expect(updated.foo).to.eql('new-foo');
    expect(updated.bar).to.eql('baz');
    expect(updated.deep).to.eql({
      arrayThing: [{ foo: 'yo' }],
      thing1: '1',
      thing2: '2',
    });
    expect(found).to.eql(updated);
  });

  it('patch deep model in db with undefined', async () => {
    const ds = new Firestore<TestClass>(defaultServices);
    ds.configure(config);
    const spied = sinon.spy<Cache>(ds.cache);

    const curDate = DateTime.fromISO('2019-01-01T00:00:00.000Z').toJSDate();

    const testInstance = new TestClass({
      bar: 'baz',
      createdAt: curDate,
      deep: {
        thing1: '1',
      },
      foo: 'something',
      id: 'foo-id',
      updatedAt: curDate,
    });

    const created = await ds.create(testInstance);
    resetSpies(spied);
    const updated = await ds.patch(
      created.id,
      {
        deep: { arrayThing: [{ foo: 'yo' }], thing2: undefined },
        foo: 'new-foo',
      },
      curDate
    );

    expect(spied.get.callCount).to.eql(0);
    expect(spied.setSafe.callCount).to.eql(1);
    expect(spied.delSafe.callCount).to.eql(0);
    expect(spied.setListSafe.callCount).to.eql(0);
    expect(spied.getList.callCount).to.eql(0);
    expect(spied.delListSafe.callCount).to.eql(0);
    expect(spied.delLists.callCount).to.eql(1);

    expect(updated.foo).to.eql('new-foo');
    expect(updated.bar).to.eql('baz');
    expect(updated.deep).to.eql({
      arrayThing: [{ foo: 'yo' }],
      thing1: '1',
      thing2: undefined,
    });
  });

  it('update', async () => {
    const ds = new Firestore<TestClass>(defaultServices);
    ds.configure(config);
    const spied = sinon.spy<Cache>(ds.cache);

    const curDate = DateTime.fromISO('2019-01-01T00:00:00.000Z').toJSDate();

    const testInstance = new TestClass({
      bar: 'baz',
      createdAt: curDate,
      foo: 'something',
      id: 'foo-id',
      updatedAt: curDate,
    });

    const created = await ds.create(testInstance);
    resetSpies(spied);

    const update = new TestClass({ ...testInstance, foo: 'new-foo' });
    const updated = await ds.update(created.id, update, curDate);

    expect(spied.get.callCount).to.eql(1); // Get createdAt from previous
    expect(spied.setSafe.callCount).to.eql(2);
    expect(spied.delSafe.callCount).to.eql(0);
    expect(spied.setListSafe.callCount).to.eql(0);
    expect(spied.getList.callCount).to.eql(0);
    expect(spied.delListSafe.callCount).to.eql(0);
    expect(spied.delLists.callCount).to.eql(1);

    const found = await ds.getOrThrow(testInstance.id);

    expect(updated.foo).to.eql('new-foo');
    expect(updated.bar).to.eql('baz');
    expect(updated).to.eql(update);
    expect(found).to.eql(updated);
  });

  it('remove', async () => {
    const ds = new Firestore<TestClass>(defaultServices);
    ds.configure(config);
    const spied = sinon.spy<Cache>(ds.cache);

    const curDate = DateTime.fromISO('2019-01-01T00:00:00.000Z').toJSDate();

    const testInstance = new TestClass({
      bar: 'baz',
      createdAt: curDate,
      foo: 'something',
      id: 'foo-id',
      updatedAt: curDate,
    });

    const created = await ds.create(testInstance);
    resetSpies(spied);
    await ds.remove(created.id);

    expect(spied.get.callCount).to.eql(0);
    expect(spied.setSafe.callCount).to.eql(0);
    expect(spied.delSafe.callCount).to.eql(1);
    expect(spied.setListSafe.callCount).to.eql(0);
    expect(spied.getList.callCount).to.eql(0);
    expect(spied.delListSafe.callCount).to.eql(0);
    expect(spied.delLists.callCount).to.eql(1);

    const found = await ds.get(created.id);

    await ds.remove(created.id);

    expect(found).to.eql(null);
  });

  it('list', async () => {
    const ds = new Firestore<TestClass>(defaultServices);
    ds.configure(config);
    const spied = sinon.spy<Cache>(ds.cache);

    const testInstance = new TestClass({
      bar: 'baz',
      createdAt: DateTime.fromISO('2019-01-01T00:00:00.000Z').toJSDate(),
      foo: 'something',
      id: 'foo-id',
      updatedAt: DateTime.fromISO('2019-01-01T00:00:00.000Z').toJSDate(),
    });

    const created = [] as any[];

    created.push(await ds.create(testInstance));
    created.push(await ds.create(new TestClass({ ...testInstance, foo: 'another', id: '2' })));
    created.sort((a, b) => a.id.localeCompare(b.id));

    resetSpies(spied);

    const found = await ds.query({});
    found.sort((a, b) => a.id.localeCompare(b.id));

    expect(spied.get.callCount).to.eql(0);
    expect(spied.setSafe.callCount).to.eql(0);
    expect(spied.delSafe.callCount).to.eql(0);
    expect(spied.setListSafe.callCount).to.eql(1);
    expect(spied.getList.callCount).to.eql(1);
    expect(spied.delListSafe.callCount).to.eql(0);
    expect(spied.delLists.callCount).to.eql(0);

    expect(found.length).to.eql(2);
    expect(found).to.eql(created);
  });

  it('list with filters', async () => {
    const ds = new Firestore<TestClass>(defaultServices);
    ds.configure(config);
    const spied = sinon.spy<Cache>(ds.cache);

    const testInstance = new TestClass({
      bar: 'baz',
      createdAt: DateTime.fromISO('2019-01-01T00:00:00.000Z').toJSDate(),
      foo: 'something',
      id: 'foo-id',
      updatedAt: DateTime.fromISO('2019-01-01T00:00:00.000Z').toJSDate(),
    });

    const created = [] as any[];

    created.push(await ds.create(testInstance));
    created.push(await ds.create(new TestClass({ ...testInstance, foo: 'another', id: '2' })));

    resetSpies(spied);

    const found = await ds.query({ filters: [{ operator: FILTER_OPERATORS.EQ, property: 'foo', value: 'something' }] });
    found.sort((a, b) => a.id.localeCompare(b.id));

    expect(spied.get.callCount).to.eql(0);
    expect(spied.setSafe.callCount).to.eql(0);
    expect(spied.delSafe.callCount).to.eql(0);
    expect(spied.setListSafe.callCount).to.eql(1);
    expect(spied.getList.callCount).to.eql(1);
    expect(spied.delListSafe.callCount).to.eql(0);
    expect(spied.delLists.callCount).to.eql(0);

    expect(found.length).to.eql(1);
    expect(found).to.eql([testInstance]);
  });

  it('rawGet returns null for missing objects', async () => {
    const ds = new Firestore<TestClass>(defaultServices);
    ds.configure(config);

    const thing = await ds.rawGet('missing');
    expect(thing).to.eql(null);
  });

  it('paginated delete', async () => {
    const ds = new Firestore<TestClass>(defaultServices);
    ds.configure(config);

    const instances = times(
      30,
      (i) =>
        new TestClass({
          bar: 'baz',
          createdAt: DateTime.fromISO('2019-01-01T00:00:00.000Z').plus({ hours: i }).toJSDate(),
          foo: 'something',
          id: `foo-id-${i}`,
          updatedAt: DateTime.fromISO('2019-01-01T00:00:00.000Z').plus({ hours: i }).toJSDate(),
        })
    );

    await Bluebird.each(instances, (instance: any) => ds.create(instance));

    const foundBeforeDelete = await ds.query();
    expect(foundBeforeDelete.length).to.eql(instances.length);

    await ds.removeByQuery({}, true, 3);

    const foundAfterDelete = await ds.query();
    expect(foundAfterDelete.length).to.eql(0);
  });

  it('non-paginated delete', async () => {
    const ds = new Firestore<TestClass>(defaultServices);
    ds.configure(config);

    const instances = times(
      30,
      (i) =>
        new TestClass({
          bar: 'baz',
          createdAt: DateTime.fromISO('2019-01-01T00:00:00.000Z').plus({ hours: i }).toJSDate(),
          foo: 'something',
          id: `foo-id-${i}`,
          updatedAt: DateTime.fromISO('2019-01-01T00:00:00.000Z').plus({ hours: i }).toJSDate(),
        })
    );

    await Bluebird.each(instances, (instance: any) => ds.create(instance));

    const foundBeforeDelete = await ds.query();
    expect(foundBeforeDelete.length).to.eql(instances.length);

    await ds.removeByQuery({});

    const foundAfterDelete = await ds.query();
    expect(foundAfterDelete.length).to.eql(0);
  });
});

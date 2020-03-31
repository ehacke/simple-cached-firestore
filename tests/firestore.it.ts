import { expect } from 'chai';
import { DateTime } from 'luxon';
import sinon from 'sinon';

import { FILTER_OPERATORS, Firestore } from '@/firestore';

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
    this.createdAt = params.createdAt;
    this.updatedAt = params.updatedAt;
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

const config = {
  collection: 'collection-foo',
  convertFromDb: (params) => new TestClass(params),
  convertForDb: (params) => params,
};

const defaultServices = {
  firestore: db,
  redis,
};

const resetSpies = (spied) => {
  spied.get.resetHistory();
  spied.set.resetHistory();
  spied.del.resetHistory();
  spied.setList.resetHistory();
  spied.getList.resetHistory();
  spied.delList.resetHistory();
  spied.delLists.resetHistory();
};

describe('firestore integration tests', function () {
  this.timeout(5000);

  beforeEach(async () => deleteCollection('collection-foo'));

  afterEach(() => sinon.restore());

  it('create model in db', async () => {
    const ds = new Firestore<TestClass>(defaultServices);
    ds.configure(config);

    // @ts-ignore
    const spied = sinon.spy<Cache>(ds.cache);

    const testInstance = new TestClass({
      id: 'foo-id',
      foo: 'something',
      bar: 'baz',
      createdAt: DateTime.fromISO('2019-01-01T00:00:00.000Z').toJSDate(),
      updatedAt: DateTime.fromISO('2019-01-01T00:00:00.000Z').toJSDate(),
    });

    const created = await ds.create(testInstance);

    expect(spied.get.callCount).to.eql(0);
    expect(spied.set.callCount).to.eql(1);
    expect(spied.del.callCount).to.eql(1);
    expect(spied.setList.callCount).to.eql(0);
    expect(spied.getList.callCount).to.eql(0);
    expect(spied.delList.callCount).to.eql(0);
    expect(spied.delLists.callCount).to.eql(2);

    const found = await ds.getOrThrow(testInstance.id);

    expect(found).to.eql(created);
    expect(found).to.eql(testInstance);
  });

  it('create deep model in db with undefined', async () => {
    const ds = new Firestore<TestClass>(defaultServices);
    ds.configure(config);

    const curDate = DateTime.fromISO('2019-01-01T00:00:00.000Z').toJSDate();

    const testInstance = new TestClass({
      id: 'foo-id',
      foo: 'something',
      bar: 'baz',
      deep: {
        thing1: '1',
        thing2: undefined,
      },
      createdAt: curDate,
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
      id: 'foo-id',
      foo: 'something',
      bar: 'baz',
      createdAt: DateTime.fromISO('2019-01-01T00:00:00.000Z').toJSDate(),
      updatedAt: DateTime.fromISO('2019-01-01T00:00:00.000Z').toJSDate(),
    });

    // @ts-ignore
    testInstance.createdAt = '2019-01-01T00:00:00.000Z';

    let result = await ds
      .create(testInstance)
      .then(() => null)
      .catch((error) => error);
    expect(result && result.message).to.eql('createdAt must be a Date');

    testInstance.createdAt = DateTime.fromISO('2019-01-01T00:00:00.000Z').toJSDate();
    // @ts-ignore
    testInstance.updatedAt = '2019-01-01T00:00:00.000Z';

    result = await ds
      .create(testInstance)
      .then(() => null)
      .catch((error) => error);
    expect(result && result.message).to.eql('updatedAt must be a Date');
  });

  it('patch deep model in db', async () => {
    const ds = new Firestore<TestClass>(defaultServices);
    ds.configure(config);
    // @ts-ignore
    const spied = sinon.spy<Cache>(ds.cache);

    const curDate = DateTime.fromISO('2019-01-01T00:00:00.000Z').toJSDate();

    const testInstance = new TestClass({
      id: 'foo-id',
      foo: 'something',
      bar: 'baz',
      deep: {
        thing1: '1',
        thing2: '2',
      },
      createdAt: curDate,
      updatedAt: curDate,
    });

    const created = await ds.create(testInstance);
    resetSpies(spied);
    const updated = await ds.patch(created.id, { foo: 'new-foo', deep: { thing2: '9' } }, curDate);

    expect(spied.get.callCount).to.eql(0);
    expect(spied.set.callCount).to.eql(1);
    expect(spied.del.callCount).to.eql(1);
    expect(spied.setList.callCount).to.eql(0);
    expect(spied.getList.callCount).to.eql(0);
    expect(spied.delList.callCount).to.eql(0);
    expect(spied.delLists.callCount).to.eql(2);

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
    // @ts-ignore
    const spied = sinon.spy<Cache>(ds.cache);

    const curDate = DateTime.fromISO('2019-01-01T00:00:00.000Z').toJSDate();

    const testInstance = new TestClass({
      id: 'foo-id',
      foo: 'something',
      bar: 'baz',
      deep: {
        thing1: '1',
        thing2: '2',
      },
      createdAt: curDate,
      updatedAt: curDate,
    });

    const created = await ds.create(testInstance);
    resetSpies(spied);
    const updated = await ds.patch(created.id, { foo: 'new-foo', deep: { arrayThing: [{ foo: 'yo' }] } }, curDate);

    expect(spied.get.callCount).to.eql(0);
    expect(spied.set.callCount).to.eql(1);
    expect(spied.del.callCount).to.eql(1);
    expect(spied.setList.callCount).to.eql(0);
    expect(spied.getList.callCount).to.eql(0);
    expect(spied.delList.callCount).to.eql(0);
    expect(spied.delLists.callCount).to.eql(2);

    const found = await ds.getOrThrow(testInstance.id);

    expect(updated.foo).to.eql('new-foo');
    expect(updated.bar).to.eql('baz');
    expect(updated.deep).to.eql({
      thing1: '1',
      arrayThing: [{ foo: 'yo' }],
      thing2: '2',
    });
    expect(found).to.eql(updated);
  });

  it('patch deep model in db with undefined', async () => {
    const ds = new Firestore<TestClass>(defaultServices);
    ds.configure(config);
    // @ts-ignore
    const spied = sinon.spy<Cache>(ds.cache);

    const curDate = DateTime.fromISO('2019-01-01T00:00:00.000Z').toJSDate();

    const testInstance = new TestClass({
      id: 'foo-id',
      foo: 'something',
      bar: 'baz',
      deep: {
        thing1: '1',
      },
      createdAt: curDate,
      updatedAt: curDate,
    });

    const created = await ds.create(testInstance);
    resetSpies(spied);
    const updated = await ds.patch(created.id, { foo: 'new-foo', deep: { arrayThing: [{ foo: 'yo' }], thing2: undefined } }, curDate);

    expect(spied.get.callCount).to.eql(0);
    expect(spied.set.callCount).to.eql(1);
    expect(spied.del.callCount).to.eql(1);
    expect(spied.setList.callCount).to.eql(0);
    expect(spied.getList.callCount).to.eql(0);
    expect(spied.delList.callCount).to.eql(0);
    expect(spied.delLists.callCount).to.eql(2);

    expect(updated.foo).to.eql('new-foo');
    expect(updated.bar).to.eql('baz');
    expect(updated.deep).to.eql({
      thing1: '1',
      thing2: undefined,
      arrayThing: [{ foo: 'yo' }],
    });
  });

  it('update', async () => {
    const ds = new Firestore<TestClass>(defaultServices);
    ds.configure(config);
    // @ts-ignore
    const spied = sinon.spy<Cache>(ds.cache);

    const curDate = DateTime.fromISO('2019-01-01T00:00:00.000Z').toJSDate();

    const testInstance = new TestClass({
      id: 'foo-id',
      foo: 'something',
      bar: 'baz',
      createdAt: curDate,
      updatedAt: curDate,
    });

    const created = await ds.create(testInstance);
    resetSpies(spied);
    const updated = await ds.update(created.id, new TestClass({ ...testInstance, foo: 'new-foo' }), curDate);

    expect(spied.get.callCount).to.eql(0);
    expect(spied.set.callCount).to.eql(1);
    expect(spied.del.callCount).to.eql(2);
    expect(spied.setList.callCount).to.eql(0);
    expect(spied.getList.callCount).to.eql(0);
    expect(spied.delList.callCount).to.eql(0);
    expect(spied.delLists.callCount).to.eql(2);

    const found = await ds.getOrThrow(testInstance.id);

    expect(updated.foo).to.eql('new-foo');
    expect(updated.bar).to.eql('baz');
    expect(found).to.eql(updated);
  });

  it('remove', async () => {
    const ds = new Firestore<TestClass>(defaultServices);
    ds.configure(config);
    // @ts-ignore
    const spied = sinon.spy<Cache>(ds.cache);

    const curDate = DateTime.fromISO('2019-01-01T00:00:00.000Z').toJSDate();

    const testInstance = new TestClass({
      id: 'foo-id',
      foo: 'something',
      bar: 'baz',
      createdAt: curDate,
      updatedAt: curDate,
    });

    const created = await ds.create(testInstance);
    resetSpies(spied);
    await ds.remove(created.id);

    expect(spied.get.callCount).to.eql(0);
    expect(spied.set.callCount).to.eql(0);
    expect(spied.del.callCount).to.eql(1);
    expect(spied.setList.callCount).to.eql(0);
    expect(spied.getList.callCount).to.eql(0);
    expect(spied.delList.callCount).to.eql(0);
    expect(spied.delLists.callCount).to.eql(1);

    const found = await ds.get(created.id);

    await ds.remove(created.id);

    expect(found).to.eql(null);
  });

  it('list', async () => {
    const ds = new Firestore<TestClass>(defaultServices);
    ds.configure(config);
    // @ts-ignore
    const spied = sinon.spy<Cache>(ds.cache);

    const testInstance = new TestClass({
      id: 'foo-id',
      foo: 'something',
      bar: 'baz',
      createdAt: DateTime.fromISO('2019-01-01T00:00:00.000Z').toJSDate(),
      updatedAt: DateTime.fromISO('2019-01-01T00:00:00.000Z').toJSDate(),
    });

    const created = [] as any[];

    created.push(await ds.create(testInstance));
    created.push(await ds.create(new TestClass({ ...testInstance, id: '2', foo: 'another' })));
    created.sort((a, b) => a.id.localeCompare(b.id));

    resetSpies(spied);

    const found = await ds.query({});
    found.sort((a, b) => a.id.localeCompare(b.id));

    expect(spied.get.callCount).to.eql(0);
    expect(spied.set.callCount).to.eql(0);
    expect(spied.del.callCount).to.eql(0);
    expect(spied.setList.callCount).to.eql(1);
    expect(spied.getList.callCount).to.eql(1);
    expect(spied.delList.callCount).to.eql(0);
    expect(spied.delLists.callCount).to.eql(0);

    expect(found.length).to.eql(2);
    expect(found).to.eql(created);
  });

  it('list with filters', async () => {
    const ds = new Firestore<TestClass>(defaultServices);
    ds.configure(config);
    // @ts-ignore
    const spied = sinon.spy<Cache>(ds.cache);

    const testInstance = new TestClass({
      id: 'foo-id',
      foo: 'something',
      bar: 'baz',
      createdAt: DateTime.fromISO('2019-01-01T00:00:00.000Z').toJSDate(),
      updatedAt: DateTime.fromISO('2019-01-01T00:00:00.000Z').toJSDate(),
    });

    const created = [] as any[];

    created.push(await ds.create(testInstance));
    created.push(await ds.create(new TestClass({ ...testInstance, id: '2', foo: 'another' })));

    resetSpies(spied);

    const found = await ds.query({ filters: [{ property: 'foo', operator: FILTER_OPERATORS.EQ, value: 'something' }] });
    found.sort((a, b) => a.id.localeCompare(b.id));

    expect(spied.get.callCount).to.eql(0);
    expect(spied.set.callCount).to.eql(0);
    expect(spied.del.callCount).to.eql(0);
    expect(spied.setList.callCount).to.eql(1);
    expect(spied.getList.callCount).to.eql(1);
    expect(spied.delList.callCount).to.eql(0);
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
});

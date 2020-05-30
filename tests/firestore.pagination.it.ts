import { expect } from 'chai';
import { DateTime } from 'luxon';
import sinon from 'sinon';

import { Firestore, SORT_DIRECTION } from '../src/firestore';
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

describe('pagination logic', function () {
  this.timeout(5000);

  let ds;
  let curDate;

  before(() => {
    curDate = DateTime.fromISO('2019-01-01T00:00:00.000Z');
    ds = new Firestore<TestClass>(defaultServices);
    ds.configure(config);
  });

  beforeEach(async () => {
    await deleteCollection('collection-foo');

    const testInstance = new TestClass({
      id: 'first',
      foo: 'something',
      bar: 'baz',
      createdAt: curDate.toJSDate(),
      updatedAt: curDate.toJSDate(),
    });

    await ds.create(testInstance);
    await ds.create(new TestClass({ ...testInstance, id: 'second', createdAt: curDate.plus({ day: 2 }).toJSDate() }));
    await ds.create(new TestClass({ ...testInstance, id: 'third', createdAt: curDate.plus({ day: 4 }).toJSDate() }));
  });

  afterEach(() => sinon.restore());

  it('find one before second asc', async () => {
    const found = await ds.query({
      limit: 1,
      before: curDate.plus({ day: 1 }).toJSDate(),
      sort: { direction: SORT_DIRECTION.ASC, property: 'createdAt' },
    });

    expect(found.length).to.eql(1);
    expect(found[0].id).to.eql('first');
  });

  it('find all before second asc', async () => {
    const found = await ds.query({
      before: curDate.plus({ day: 1 }).toJSDate(),
      sort: { direction: SORT_DIRECTION.ASC, property: 'createdAt' },
    });

    expect(found.length).to.eql(1);
    expect(found[0].id).to.eql('first');
  });

  it('find one after first asc', async () => {
    const found = await ds.query({
      limit: 1,
      after: curDate.plus({ day: 1 }).toJSDate(),
      sort: { direction: SORT_DIRECTION.ASC, property: 'createdAt' },
    });

    expect(found.length).to.eql(1);
    expect(found[0].id).to.eql('second');
  });

  it('find all after first asc', async () => {
    const found = await ds.query({
      after: curDate.plus({ day: 1 }).toJSDate(),
      sort: { direction: SORT_DIRECTION.ASC, property: 'createdAt' },
    });

    expect(found.length).to.eql(2);
    expect(found[0].id).to.eql('second');
    expect(found[1].id).to.eql('third');
  });

  it('find one before third asc', async () => {
    const found = await ds.query({
      limit: 1,
      before: curDate.plus({ day: 3 }).toJSDate(),
      sort: { direction: SORT_DIRECTION.ASC, property: 'createdAt' },
    });

    expect(found.length).to.eql(1);
    expect(found[0].id).to.eql('second');
  });

  it('find all before third asc', async () => {
    const found = await ds.query({
      before: curDate.plus({ day: 3 }).toJSDate(),
      sort: { direction: SORT_DIRECTION.ASC, property: 'createdAt' },
    });

    expect(found.length).to.eql(2);
    expect(found[0].id).to.eql('first');
    expect(found[1].id).to.eql('second');
  });

  it('find one after second asc', async () => {
    const found = await ds.query({
      limit: 1,
      after: curDate.plus({ day: 3 }).toJSDate(),
      sort: { direction: SORT_DIRECTION.ASC, property: 'createdAt' },
    });

    expect(found.length).to.eql(1);
    expect(found[0].id).to.eql('third');
  });

  it('find all after second asc', async () => {
    const found = await ds.query({
      after: curDate.plus({ day: 3 }).toJSDate(),
      sort: { direction: SORT_DIRECTION.ASC, property: 'createdAt' },
    });

    expect(found.length).to.eql(1);
    expect(found[0].id).to.eql('third');
  });

  it('find one before second desc', async () => {
    const found = await ds.query({
      limit: 1,
      before: curDate.plus({ day: 3 }).toJSDate(),
      sort: { direction: SORT_DIRECTION.DESC, property: 'createdAt' },
    });

    expect(found.length).to.eql(1);
    expect(found[0].id).to.eql('third');
  });

  it('find all before second desc', async () => {
    const found = await ds.query({
      before: curDate.plus({ day: 3 }).toJSDate(),
      sort: { direction: SORT_DIRECTION.DESC, property: 'createdAt' },
    });

    expect(found.length).to.eql(1);
    expect(found[0].id).to.eql('third');
  });

  it('find one after third desc', async () => {
    const found = await ds.query({
      limit: 1,
      after: curDate.plus({ day: 3 }).toJSDate(),
      sort: { direction: SORT_DIRECTION.DESC, property: 'createdAt' },
    });

    expect(found.length).to.eql(1);
    expect(found[0].id).to.eql('second');
  });

  it('find all after third desc', async () => {
    const found = await ds.query({
      after: curDate.plus({ day: 3 }).toJSDate(),
      sort: { direction: SORT_DIRECTION.DESC, property: 'createdAt' },
    });

    expect(found.length).to.eql(2);
    expect(found[0].id).to.eql('second');
    expect(found[1].id).to.eql('first');
  });

  it('find one before first desc', async () => {
    const found = await ds.query({
      limit: 1,
      before: curDate.plus({ day: 1 }).toJSDate(),
      sort: { direction: SORT_DIRECTION.DESC, property: 'createdAt' },
    });

    expect(found.length).to.eql(1);
    expect(found[0].id).to.eql('second');
  });

  it('find one after second desc', async () => {
    const found = await ds.query({
      limit: 1,
      after: curDate.plus({ day: 1 }).toJSDate(),
      sort: { direction: SORT_DIRECTION.DESC, property: 'createdAt' },
    });

    expect(found.length).to.eql(1);
    expect(found[0].id).to.eql('first');
  });

  it('find all after second desc', async () => {
    const found = await ds.query({
      after: curDate.plus({ day: 1 }).toJSDate(),
      sort: { direction: SORT_DIRECTION.DESC, property: 'createdAt' },
    });

    expect(found.length).to.eql(1);
    expect(found[0].id).to.eql('first');
  });
});

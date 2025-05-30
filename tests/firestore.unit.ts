import { expect } from 'chai';
import { isPlainObject } from 'lodash-es';
import { DateTime } from 'luxon';

import { Firestore } from '../src/firestore';

class DeepClass {
  foo: string;

  constructor(params) {
    this.foo = params.foo;
  }
}

class TestClass {
  constructor(params) {
    this.id = params.id;
    this.foo = params.foo;
    this.bar = params.bar;
    this.deep = params.deep;
    this.classy = params.classy.map((classy) => new DeepClass(classy));
    this.createdAt = params.createdAt;
    this.updatedAt = params.updatedAt;
  }

  classy: DeepClass[];

  id: string;

  foo: string;

  bar: string;

  deep: {
    thing1: string;
    thing2: string;
    arrayThing?: { foo: string }[];
  };

  createdAt: Date;

  updatedAt: Date;

  validate() {}

  getDalSchema() {
    return {
      excludeFromIndexes: [],
    };
  }
}

describe('firestore unit tests', () => {
  it('convert dates to timestamps, and classes to objects', () => {
    const curDate = DateTime.fromISO('2019-01-01T00:00:00.000Z').toJSDate();

    const testInstance = new TestClass({
      bar: 'baz',
      classy: [{ foo: 'something' }, { foo: 'something-2' }],
      createdAt: curDate,
      foo: 'something',
      id: 'foo-id',
      updatedAt: curDate,
    });

    const converted = Firestore.translateDatesToTimestamps(testInstance);
    expect(isPlainObject(converted)).to.eql(true);
    expect(isPlainObject(converted.classy[0])).to.eql(true);
    expect(JSON.parse(JSON.stringify(converted))).to.eql({
      bar: 'baz',
      classy: [{ foo: 'something' }, { foo: 'something-2' }],
      createdAt: { _nanoseconds: 0, _seconds: 1_546_300_800 },
      foo: 'something',
      id: 'foo-id',
      updatedAt: { _nanoseconds: 0, _seconds: 1_546_300_800 },
    });
  });
});

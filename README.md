# simple-cached-firestore

![npm](https://img.shields.io/npm/v/simple-cached-firestore)
![install size](https://badgen.net/packagephobia/install/simple-cached-firestore)
![Codecov](https://img.shields.io/codecov/c/gh/ehacke/simple-cached-firestore)
![CircleCI](https://img.shields.io/circleci/build/github/ehacke/simple-cached-firestore)
![GitHub](https://img.shields.io/github/license/ehacke/simple-cached-firestore)

NodeJS Firestore wrapper with simplified API, model validation, and optional caching built in. 

## Sponsor 

![asserted.io](https://raw.githubusercontent.com/ehacke/simple-cached-firestore/master/images/logo.png)

[asserted.io - Test in Prod](https://asserted.io)

## Features

- transparent, no-effort redis caching to improve speed and limit costs
- model validation (optional, suggest using [validated-base](https://github.com/ehacke/validated-base))
- simplified API to reduce boilerplate, but retain access to original API for special cases


## Install

```bash
npm i -S simple-cached-firestore
```

## Usage

Before instantiating the Firestore wrapper, we first need a model it'll use for CRUD operations.

Here is a blog post on [validated models in Node](https://asserted.io/posts/type-safe-models-in-node), and why they are useful.

### Create a Model

At minimum, the model has to fulfill the following interface: 

```typescript
interface DalModel {
  id: string;
  validate(): void | Promise<void>;
  createdAt: Date;
  updatedAt: Date;
}
```

That said, it's easiest to just extend [validated-base](https://www.npmjs.com/package/validated-base) and use that.

```typescript
import { ValidatedBase } from 'validated-base';
import { IsDate, IsString, MaxLength } from 'class-validator';
import { toDate } from 'simple-cached-firestore';

interface ValidatedClassInterface {
  id: string;

  something: string;

  createdAt: Date;
  updatedAt: Date;
}

class ValidatedClass extends ValidatedBase implements ValidatedClassInterface {
  constructor(params: ValidatedClassInterface, validate = true) {
    super();

    this.id = params.id;

    this.something = params.something;

    // This toDate() is necessary to convert either ISO strings or Firebase Timestamps to Date objects
    this.createdAt = toDate(params.createdAt);
    this.updatedAt = toDate(params.updatedAt);

    if (validate) {
      this.validate();
    }
  }

  @IsString()
  id: string;

  @MaxLength(10)
  @IsString()
  something: string;

  @IsDate()
  createdAt: Date;

  @IsDate()
  updatedAt: Date;
}
```

### Create simple-cached-firestore

A single instance is responsible for reading and writing to a specific Firestore collection. 

Reads are cached for the configured TTL, writes update the cache.

```typescript
import admin from 'firebase-admin';
import { Redis } from '@ehacke/redis';
import { Firestore } from 'simple-cached-firestore';

// Initialize Firebase client
const serviceAccount = require('./path/to/serviceAccountKey.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

// Create instance of wrapper
const cachedFirestore = new Firestore<ValidatedClass>({ db: admin.firestore(), redis: new Redis() });

const firebaseConfig = {
  collection: 'some-collection',

  // The object read from the db will have Firebase Timestamps in place of Dates, that the ValidatedClass must convert 
  convertFromDb: (params) => new ValidatedClass(params),

  // The object being written to the db will be automatically scanned for Dates, which are converted to Timestamps
  // NOTE: This scanning does have a performance hit, but it's assumed writes are infrequent compared to reads 
  convertForDb: (params) => params,
};

const cacheConfig = {
  cacheTtlSec: 5,
  // Objects read from the cache will obviously have their Dates as ISO strings, ValidatedClass must convert to Date
  parseFromCache: (instance) => new ValidatedClass(JSON.parse(instance)),
  stringifyForCache: (instance: ValidatedClass) => JSON.stringify(instance),
};

// Configure simple-cached-firestore before use
cachedFirestore.configure(firebaseConfig, cacheConfig);

// Firestore wrapper is ready to go.
```

## CRUD API

### create(instance: T): Promise\<T>

Write a new model to the db. If an entry exists with the same ID, the write fails.

```typescript
const validatedClass = new ValidatedClass({ id: 'foo-id', something: 'some-data', createdAt: new Date(), updatedAt: new Date() });
await cachedFirestore.create(validatedClass);
```

### get(id: string): Promise<T | null>

Read a model from the db by ID. Returns a constructed instance of the model, or null.

```typescript
const validatedClass = await cachedFirestore.get('foo-id');
```

### getOrThrow(id: string): Promise\<T>

Read a model from the db by ID. Returns a constructed instance of the model, or throws an Error if not found.
Useful for cases where you know the ID should exist, and dow't want to add null checks to make Typescript happy.

```typescript
const validatedClass = await cachedFirestore.getOrThrow('foo-id');
```

### patch(id: string, patch: DeepPartial<T>): Promise<T>

Pass in any subset of the properties of the model already in the db to update just those properties.

`createdAt` and `updatedAt` are ignored, and `updatedAt` is set by the wrapper.

```typescript
const validatedClass = await cachedFirestore.patch('foo-id', { something: 'patch-this' });
```

### update(id: string, update: T): Promise\<T>

Overwrite entire instance of model with a new instance.

`createdAt` and `updatedAt` are ignored, and `updatedAt` is set by the wrapper.

```typescript
const updatedClass = new ValidatedClass({ id: 'foo-id', something: 'updated', createdAt: new Date(), updatedAt: new Date() });
const validatedClass = await cachedFirestore.update('foo-id', updatedClass);
```

### exists(id: string): Promise\<boolean>

Return true if ID exists in collection

```typescript
const exists = await cachedFirestore.exists('foo-id');
```

### remove(id: string): Promise\<void>

Remove model for this ID if it exists, silent return if it doesn't

```typescript
await cachedFirestore.remove('foo-id');
```

## Query API

To simplify the interface and to abstract it so that it can function for any db (not just Firestore), we created a simpler query language.

```typescript
interface QueryInterface {
  filters?: ListFilterInterface[];
  sort?: ListSortInterface;
  offset?: number;
  limit?: number;
  before?: DalModelValue;
  after?: DalModelValue;
}

type DalModelValue = string | Date | number | null | boolean;

interface ListFilterInterface {
  property: string;
  operator: FILTER_OPERATORS;
  value: DalModelValue;
}

enum FILTER_OPERATORS {
  GT = '>',
  GTE = '>=',
  LT = '<',
  LTE = '<=',
  EQ = '==',
  CONTAINS = 'array-contains',
}

interface ListSortInterface {
  property: string;
  direction: SORT_DIRECTION;
}

enum SORT_DIRECTION {
  ASC = 'asc',
  DESC = 'desc',
}
```

In use, it looks like this:

```typescript
// Find all objects with property 'something' equal to 'some-value'
const simpleMatchQuery = {
  filters: [
    {
      property: 'something',
      operator: FILTER_OPERATORS.EQ,
      value: 'some-value',
    } 
  ],
}

// Can add multiple conditions
const compoundMatchQuery = {
  filters: [
    {
      property: 'something',
      operator: FILTER_OPERATORS.EQ,
      value: 'some-value',
    },
    {
      property: 'another',
      operator: FILTER_OPERATORS.EQ,
      value: 'something-else',
    } 
  ],
}

// Use sorting, offset and limits
const sortedQuery = {
  filters: [
    {
      property: 'something',
      operator: FILTER_OPERATORS.EQ,
      value: 'some-value',
    } 
  ],
  sort: {
    property: 'createdAt',
    direction: SORT_DIRECTION.DESC,
  },
  limit: 100, // Return 100 values max
  offset: 20, // Start at the 20th value in descending order
}

// Use pagination
const paginatedQuery = {
  filters: [
    {
      property: 'something',
      operator: FILTER_OPERATORS.EQ,
      value: 'some-value',
    } 
  ],
  sort: {
    property: 'createdAt',
    direction: SORT_DIRECTION.DESC,
  },
  limit: 100, // Return 100 values max
  before: 'some-id', // Show page of up to 100, with entries that occur before the ID 'some-id'
}
```

Then just pass the query to simple-cached-firestore

```typescript
const simpleMatchQuery = {
  filters: [
    {
      property: 'something',
      operator: FILTER_OPERATORS.EQ,
      value: 'some-value',
    } 
  ],
}

const results = await cachedFirestore.query(simpleMatchQuery);
```

NOTE: queries are cached, but not very well. Any writes to this collection that occur after a cached query will invalidate the entire query cache.

## Special Cases

For situations where you need to access the underlying Firestore instance, you can do that.

```
cachedFirestore.services.firestore === admin.firestore.Firestore
```


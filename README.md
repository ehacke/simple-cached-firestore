# simple-cached-firestore

![npm](https://img.shields.io/npm/v/simple-cached-firestore)
![install size](https://badgen.net/packagephobia/install/simple-cached-firestore)
![Codecov](https://img.shields.io/codecov/c/gh/ehacke/simple-cached-firestore)
![CircleCI](https://img.shields.io/circleci/build/github/ehacke/simple-cached-firestore)
![GitHub](https://img.shields.io/github/license/ehacke/simple-cached-firestore)

NodeJS Firestore wrapper with simplified API, model validation, and optional caching built in. 

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

### Create a Validated Class

At minimum, the class has to fulfill the following interface: 

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

## API



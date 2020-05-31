[simple-cached-firestore](../README.md) › [Globals](../globals.md) › ["firestore"](../modules/_firestore_.md) › [Firestore](_firestore_.firestore.md)

# Class: Firestore <**T**>

## Type parameters

▪ **T**: *[DalModel](../interfaces/_firestore_.dalmodel.md)*

## Hierarchy

* Cached‹T›

  ↳ **Firestore**

## Index

### Constructors

* [constructor](_firestore_.firestore.md#constructor)

### Properties

* [config](_firestore_.firestore.md#private-optional-config)
* [services](_firestore_.firestore.md#readonly-services)

### Accessors

* [cache](_firestore_.firestore.md#cache)

### Methods

* [configure](_firestore_.firestore.md#configure)
* [configureCache](_firestore_.firestore.md#configurecache)
* [create](_firestore_.firestore.md#create)
* [exists](_firestore_.firestore.md#exists)
* [get](_firestore_.firestore.md#get)
* [getOrThrow](_firestore_.firestore.md#getorthrow)
* [patch](_firestore_.firestore.md#patch)
* [query](_firestore_.firestore.md#query)
* [rawGet](_firestore_.firestore.md#rawget)
* [rawQuery](_firestore_.firestore.md#rawquery)
* [remove](_firestore_.firestore.md#remove)
* [removeByQuery](_firestore_.firestore.md#removebyquery)
* [update](_firestore_.firestore.md#update)
* [getCacheTimestamp](_firestore_.firestore.md#static-getcachetimestamp)
* [translateDatesToTimestamps](_firestore_.firestore.md#static-translatedatestotimestamps)
* [translateTimestampsToDates](_firestore_.firestore.md#static-translatetimestampstodates)

## Constructors

###  constructor

\+ **new Firestore**(`services`: [ServicesInterface](../interfaces/_firestore_.servicesinterface.md)): *[Firestore](_firestore_.firestore.md)*

*Overrides void*

*Defined in [src/firestore.ts:104](https://github.com/ehacke/simple-cached-firestore/blob/acfd256/src/firestore.ts#L104)*

**Parameters:**

Name | Type | Description |
------ | ------ | ------ |
`services` | [ServicesInterface](../interfaces/_firestore_.servicesinterface.md) |   |

**Returns:** *[Firestore](_firestore_.firestore.md)*

## Properties

### `Private` `Optional` config

• **config**? : *InternalFirestoreConfigInterface‹T›*

*Defined in [src/firestore.ts:178](https://github.com/ehacke/simple-cached-firestore/blob/acfd256/src/firestore.ts#L178)*

___

### `Readonly` services

• **services**: *[ServicesInterface](../interfaces/_firestore_.servicesinterface.md)*

*Defined in [src/firestore.ts:176](https://github.com/ehacke/simple-cached-firestore/blob/acfd256/src/firestore.ts#L176)*

## Accessors

###  cache

• **get cache**(): *CacheInterface‹T›*

*Inherited from [Firestore](_firestore_.firestore.md).[cache](_firestore_.firestore.md#cache)*

Defined in node_modules/@ehacke/redis/dist/cached.d.ts:33

Cache getter

**Returns:** *CacheInterface‹T›*

## Methods

###  configure

▸ **configure**(`config`: [FirestoreConfigInterface](../interfaces/_firestore_.firestoreconfiginterface.md)‹T›, `cacheConfig?`: [FirestoreCacheConfigInterface](../interfaces/_firestore_.firestorecacheconfiginterface.md)‹T›): *void*

*Defined in [src/firestore.ts:165](https://github.com/ehacke/simple-cached-firestore/blob/acfd256/src/firestore.ts#L165)*

Configure firestore

**Parameters:**

Name | Type |
------ | ------ |
`config` | [FirestoreConfigInterface](../interfaces/_firestore_.firestoreconfiginterface.md)‹T› |
`cacheConfig?` | [FirestoreCacheConfigInterface](../interfaces/_firestore_.firestorecacheconfiginterface.md)‹T› |

**Returns:** *void*

___

###  configureCache

▸ **configureCache**(`services`: [ServicesInterface](../interfaces/_firestore_.servicesinterface.md), `config`: ConfigInterface‹T›): *void*

*Inherited from [Firestore](_firestore_.firestore.md).[configureCache](_firestore_.firestore.md#configurecache)*

Defined in node_modules/@ehacke/redis/dist/cached.d.ts:27

Initialize cache configuration

**Parameters:**

Name | Type |
------ | ------ |
`services` | [ServicesInterface](../interfaces/_firestore_.servicesinterface.md) |
`config` | ConfigInterface‹T› |

**Returns:** *void*

___

###  create

▸ **create**(`instance`: T): *Promise‹T›*

*Defined in [src/firestore.ts:268](https://github.com/ehacke/simple-cached-firestore/blob/acfd256/src/firestore.ts#L268)*

Create instance of model in db

**Parameters:**

Name | Type |
------ | ------ |
`instance` | T |

**Returns:** *Promise‹T›*

___

###  exists

▸ **exists**(`id`: string): *Promise‹boolean›*

*Defined in [src/firestore.ts:442](https://github.com/ehacke/simple-cached-firestore/blob/acfd256/src/firestore.ts#L442)*

Model exists

**Parameters:**

Name | Type |
------ | ------ |
`id` | string |

**Returns:** *Promise‹boolean›*

___

###  get

▸ **get**(`id`: string): *Promise‹T | null›*

*Defined in [src/firestore.ts:299](https://github.com/ehacke/simple-cached-firestore/blob/acfd256/src/firestore.ts#L299)*

Get instance

**Parameters:**

Name | Type |
------ | ------ |
`id` | string |

**Returns:** *Promise‹T | null›*

___

###  getOrThrow

▸ **getOrThrow**(`id`: string, `throw404`: boolean): *Promise‹T›*

*Defined in [src/firestore.ts:387](https://github.com/ehacke/simple-cached-firestore/blob/acfd256/src/firestore.ts#L387)*

Get instance or throw

**Parameters:**

Name | Type | Default |
------ | ------ | ------ |
`id` | string | - |
`throw404` | boolean | false |

**Returns:** *Promise‹T›*

___

###  patch

▸ **patch**(`id`: string, `patchUpdate`: DeepPartial‹T›, `curDate`: Date): *Promise‹T›*

*Defined in [src/firestore.ts:418](https://github.com/ehacke/simple-cached-firestore/blob/acfd256/src/firestore.ts#L418)*

Update properties of model

**Parameters:**

Name | Type | Default |
------ | ------ | ------ |
`id` | string | - |
`patchUpdate` | DeepPartial‹T› | - |
`curDate` | Date | DateTime.utc().toJSDate() |

**Returns:** *Promise‹T›*

___

###  query

▸ **query**(`query`: [QueryInterface](../interfaces/_firestore_.queryinterface.md)): *Promise‹T[]›*

*Defined in [src/firestore.ts:506](https://github.com/ehacke/simple-cached-firestore/blob/acfd256/src/firestore.ts#L506)*

List models satisfying query

**Parameters:**

Name | Type |
------ | ------ |
`query` | [QueryInterface](../interfaces/_firestore_.queryinterface.md) |

**Returns:** *Promise‹T[]›*

___

###  rawGet

▸ **rawGet**(`id`: string): *Promise‹any | null›*

*Defined in [src/firestore.ts:354](https://github.com/ehacke/simple-cached-firestore/blob/acfd256/src/firestore.ts#L354)*

Get value directly from the db, by-passing cache and convertFromDb

**Parameters:**

Name | Type |
------ | ------ |
`id` | string |

**Returns:** *Promise‹any | null›*

___

###  rawQuery

▸ **rawQuery**(`query`: [QueryInterface](../interfaces/_firestore_.queryinterface.md)): *Promise‹any[]›*

*Defined in [src/firestore.ts:543](https://github.com/ehacke/simple-cached-firestore/blob/acfd256/src/firestore.ts#L543)*

Get value directly from the db, by-passing cache and convertFromDb

**Parameters:**

Name | Type |
------ | ------ |
`query` | [QueryInterface](../interfaces/_firestore_.queryinterface.md) |

**Returns:** *Promise‹any[]›*

___

###  remove

▸ **remove**(`id`: string): *Promise‹void›*

*Defined in [src/firestore.ts:452](https://github.com/ehacke/simple-cached-firestore/blob/acfd256/src/firestore.ts#L452)*

Remove model

**Parameters:**

Name | Type |
------ | ------ |
`id` | string |

**Returns:** *Promise‹void›*

___

###  removeByQuery

▸ **removeByQuery**(`query`: [QueryInterface](../interfaces/_firestore_.queryinterface.md)): *Promise‹string[]›*

*Defined in [src/firestore.ts:569](https://github.com/ehacke/simple-cached-firestore/blob/acfd256/src/firestore.ts#L569)*

Remove by query

**Parameters:**

Name | Type |
------ | ------ |
`query` | [QueryInterface](../interfaces/_firestore_.queryinterface.md) |

**Returns:** *Promise‹string[]›*

___

###  update

▸ **update**(`id`: string, `instance`: T, `curDate`: Date): *Promise‹T›*

*Defined in [src/firestore.ts:480](https://github.com/ehacke/simple-cached-firestore/blob/acfd256/src/firestore.ts#L480)*

Overwrite model

**Parameters:**

Name | Type | Default |
------ | ------ | ------ |
`id` | string | - |
`instance` | T | - |
`curDate` | Date | DateTime.utc().toJSDate() |

**Returns:** *Promise‹T›*

___

### `Static` getCacheTimestamp

▸ **getCacheTimestamp**(`timestamp`: Timestamp): *CacheTimestampInterface*

*Defined in [src/firestore.ts:150](https://github.com/ehacke/simple-cached-firestore/blob/acfd256/src/firestore.ts#L150)*

Get cache timestamp from firestore timestamp, or fall back to redisTimestamp

**Parameters:**

Name | Type |
------ | ------ |
`timestamp` | Timestamp |

**Returns:** *CacheTimestampInterface*

___

### `Static` translateDatesToTimestamps

▸ **translateDatesToTimestamps**(`obj`: any): *any*

*Defined in [src/firestore.ts:120](https://github.com/ehacke/simple-cached-firestore/blob/acfd256/src/firestore.ts#L120)*

Translate dates to timestamp

**Parameters:**

Name | Type |
------ | ------ |
`obj` | any |

**Returns:** *any*

___

### `Static` translateTimestampsToDates

▸ **translateTimestampsToDates**(`obj`: any): *any*

*Defined in [src/firestore.ts:135](https://github.com/ehacke/simple-cached-firestore/blob/acfd256/src/firestore.ts#L135)*

Translate timestamps to dates

**Parameters:**

Name | Type |
------ | ------ |
`obj` | any |

**Returns:** *any*

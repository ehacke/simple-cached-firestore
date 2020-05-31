[simple-cached-firestore](../README.md) › [Globals](../globals.md) › ["firestore"](../modules/_firestore_.md) › [FirestoreCacheConfigInterface](_firestore_.firestorecacheconfiginterface.md)

# Interface: FirestoreCacheConfigInterface <**T**>

## Type parameters

▪ **T**: *[DalModel](_firestore_.dalmodel.md)*

## Hierarchy

* **FirestoreCacheConfigInterface**

## Index

### Properties

* [cacheTtlSec](_firestore_.firestorecacheconfiginterface.md#cachettlsec)

### Methods

* [parseFromCache](_firestore_.firestorecacheconfiginterface.md#parsefromcache)
* [stringifyForCache](_firestore_.firestorecacheconfiginterface.md#stringifyforcache)

## Properties

###  cacheTtlSec

• **cacheTtlSec**: *number*

*Defined in [src/firestore.ts:80](https://github.com/ehacke/simple-cached-firestore/blob/acfd256/src/firestore.ts#L80)*

## Methods

###  parseFromCache

▸ **parseFromCache**(`instance`: string): *Promise‹T› | T*

*Defined in [src/firestore.ts:82](https://github.com/ehacke/simple-cached-firestore/blob/acfd256/src/firestore.ts#L82)*

**Parameters:**

Name | Type |
------ | ------ |
`instance` | string |

**Returns:** *Promise‹T› | T*

___

###  stringifyForCache

▸ **stringifyForCache**(`instance`: T): *Promise‹string› | string*

*Defined in [src/firestore.ts:81](https://github.com/ehacke/simple-cached-firestore/blob/acfd256/src/firestore.ts#L81)*

**Parameters:**

Name | Type |
------ | ------ |
`instance` | T |

**Returns:** *Promise‹string› | string*

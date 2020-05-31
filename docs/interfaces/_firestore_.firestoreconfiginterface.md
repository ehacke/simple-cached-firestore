[simple-cached-firestore](../README.md) › [Globals](../globals.md) › ["firestore"](../modules/_firestore_.md) › [FirestoreConfigInterface](_firestore_.firestoreconfiginterface.md)

# Interface: FirestoreConfigInterface <**T**>

## Type parameters

▪ **T**: *[DalModel](_firestore_.dalmodel.md)*

## Hierarchy

* **FirestoreConfigInterface**

## Index

### Properties

* [collection](_firestore_.firestoreconfiginterface.md#collection)
* [readTimestampsToDates](_firestore_.firestoreconfiginterface.md#optional-readtimestampstodates)

### Methods

* [convertForDb](_firestore_.firestoreconfiginterface.md#convertfordb)
* [convertFromDb](_firestore_.firestoreconfiginterface.md#convertfromdb)

## Properties

###  collection

• **collection**: *string*

*Defined in [src/firestore.ts:67](https://github.com/ehacke/simple-cached-firestore/blob/acfd256/src/firestore.ts#L67)*

___

### `Optional` readTimestampsToDates

• **readTimestampsToDates**? : *undefined | false | true*

*Defined in [src/firestore.ts:66](https://github.com/ehacke/simple-cached-firestore/blob/acfd256/src/firestore.ts#L66)*

## Methods

###  convertForDb

▸ **convertForDb**(`instance`: DeepPartial‹T›): *any*

*Defined in [src/firestore.ts:68](https://github.com/ehacke/simple-cached-firestore/blob/acfd256/src/firestore.ts#L68)*

**Parameters:**

Name | Type |
------ | ------ |
`instance` | DeepPartial‹T› |

**Returns:** *any*

___

###  convertFromDb

▸ **convertFromDb**(`params`: any): *T | Promise‹T›*

*Defined in [src/firestore.ts:69](https://github.com/ehacke/simple-cached-firestore/blob/acfd256/src/firestore.ts#L69)*

**Parameters:**

Name | Type |
------ | ------ |
`params` | any |

**Returns:** *T | Promise‹T›*

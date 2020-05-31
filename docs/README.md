[simple-cached-firestore](README.md) › [Globals](globals.md)

# simple-cached-firestore

# simple-cached-firestore

[![CircleCI](https://circleci.com/gh/ehacke/simple-cached-firestore.svg?style=svg)](https://circleci.com/gh/ehacke/simple-cached-firestore)

[![codecov](https://codecov.io/gh/ehacke/simple-cached-firestore/branch/master/graph/badge.svg)](https://codecov.io/gh/ehacke/simple-cached-firestore)

NodeJS Firestore wrapper with simplified API, model validation, and optional caching built in. 

# Features

- transparent, no-effort redis caching to improve speed and limit costs
- model validation using [class-validator](https://github.com/typestack/class-validator)
- simplified API to reduce boilerplate, but retain access to original API for special cases

# API

## Changelog

- v3 - Previously Timestamps would be auto-converted on read operations into date instances.
For performance reasons, it better to allow the models to selectively convert the Timestamps to 
Dates than to scan every object for Timestamps. 

    Dates are still auto-converted to Timestamps on write.
    
    The config now includes a parameter for `readTimestampsToDates` that can be set to `true` to reactivate auto-conversion.

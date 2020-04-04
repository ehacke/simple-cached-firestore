# simple-cached-firestore

[![CircleCI](https://circleci.com/gh/ehacke/simple-cached-firestore.svg?style=svg)](https://circleci.com/gh/ehacke/simple-cached-firestore)

[![codecov](https://codecov.io/gh/ehacke/simple-cached-firestore/branch/master/graph/badge.svg)](https://codecov.io/gh/ehacke/simple-cached-firestore)

Firestore wrapper with simplified API and optional caching built in

## Changelog

- v3 - Previously Timestamps would be auto-converted on read operations into date instances.
For performance reasons, it better to allow the models to selectively convert the Timestamps to 
Dates than to scan every object for Timestamps. 

    Dates are still auto-converted to Timestamps on write.
    
    The config now includes a parameter for `readTimestampsToDates` that can be set to `true` to reactivate auto-conversion.

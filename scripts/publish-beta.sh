#!/bin/bash

suffix="beta.$(git rev-parse --short HEAD)"
echo "Created package tag $suffix"

if [[ -z "${NODE_AUTH_TOKEN}" ]]; then
    echo 'NODE_AUTH_TOKEN not found'
    exit 1
fi

echo "Running test and preparing to publish"
npm version prerelease --preid $suffix --git-tag-version false --commit-hooks false && npm publish --tag beta
echo "Package published with tag $suffix"


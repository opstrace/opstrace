#!/bin/bash

echo "hello world" > /build/test/browser/test-results/test.txt
yarn playwright test
cat /build/test/browser/test-results/test.txt
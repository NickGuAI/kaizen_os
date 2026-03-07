# Kaizen OS Verification SOP

## Purpose
Run the frontend/server test suite and lint checks before declaring changes done.

## Scripts
- run-tests.sh: runs `npm run test:run` in `app`.
- run-checks.sh: runs tests, then `npm run lint`.

## Prerequisites
- Node.js
- Install deps:
  - `cd app && npm install`

## Usage
- `./kaizen_os-verification-sop/run-tests.sh`
- `./kaizen_os-verification-sop/run-checks.sh`

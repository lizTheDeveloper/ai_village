#!/bin/bash
# This script adds SexualityComponent to all tests that call initiateCourtship or performCourtshipTactic

cat packages/core/src/reproduction/__tests__/CourtshipStateMachine.test.ts | \
sed '
#!/bin/bash
# Wrapper script to start the server with proper PATH
export PATH=$PATH:$(pwd)/node_modules/.bin
exec npx tsx server/index.ts
#!/bin/sh
set -e

node /app/backend/server.js &
nginx -g 'daemon off;'

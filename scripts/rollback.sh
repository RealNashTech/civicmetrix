#!/bin/bash
set -e

echo "Rolling back CivicMetrix to previous build..."

pm2 stop civicmetrix || true

rm -rf .next

git checkout HEAD~1

npm install

NODE_ENV=production npm run build

pm2 start ecosystem.config.js

pm2 save

echo "Rollback complete."

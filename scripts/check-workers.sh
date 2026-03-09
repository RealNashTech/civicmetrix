#!/bin/bash

echo "Checking CivicMetrix workers..."

pm2 list
pm2 logs civicmetrix --lines 20

echo "Queue inspection..."

redis-cli INFO memory | head -20 || true

echo "Worker check complete."

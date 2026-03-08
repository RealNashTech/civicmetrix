#!/bin/bash

echo "Pulling latest CivicMetrix code..."

cd /root/civicmetrix || exit

git pull origin main

echo "Installing dependencies..."

npm install

echo "Building Next.js application..."

rm -rf .next
npm run build

echo "Restarting CivicMetrix..."

pm2 restart civicmetrix
pm2 save

sudo systemctl restart nginx

echo "Deployment complete."

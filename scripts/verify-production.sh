#!/bin/bash

echo "Checking CivicMetrix runtime..."

curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/health
curl -s -o /dev/null -w "%{http_code}\n" https://civicmetrix.com
curl -s -o /dev/null -w "%{http_code}\n" https://civicmetrix.com/public/city-of-woodburn

pm2 list

echo "Verification complete."

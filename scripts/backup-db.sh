#!/bin/bash

BACKUP_DIR=/root/civicmetrix/backups
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

pg_dump -U postgres civicmetrix > $BACKUP_DIR/civicmetrix_$DATE.sql

echo "Backup saved to $BACKUP_DIR"

#!/usr/bin/env bash
# Daily PostgreSQL dump of the exam database. Keeps the newest 14 dumps.
# Installed by deploy/setup-server.sh as a cron job: 0 3 * * * ~/exam/deploy/backup.sh
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p backups
f="backups/exam-$(date +%Y%m%d-%H%M%S).sql.gz"
sudo docker compose exec -T db pg_dump -U exam -d exam | gzip > "$f"
ls -1t backups/exam-*.sql.gz | tail -n +15 | xargs -r rm -f
echo "backup written: $f"

#!/usr/bin/env bash
# One-time server preparation (idempotent). Run on the server: bash ~/exam/deploy/setup-server.sh
#  - creates ~/exam/.env with a random DB password if it does not exist
#  - installs the daily backup cron job
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  umask 077
  printf 'DB_PASSWORD=%s\nWEB_PORT=3000\n' "$(openssl rand -hex 24)" > .env
  echo "created .env"
fi

chmod +x deploy/*.sh
job="0 3 * * * $HOME/exam/deploy/backup.sh >> $HOME/exam/backups/backup.log 2>&1"
mkdir -p backups
( crontab -l 2>/dev/null | grep -v 'exam/deploy/backup.sh' ; echo "$job" ) | crontab -
echo "backup cron installed"

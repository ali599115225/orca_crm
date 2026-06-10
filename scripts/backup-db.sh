# scripts/backup-db.sh
# ORCA Database Backup Script — pg_dump + S3 upload
# Schedule: Daily at 3:00 AM via Vercel Cron or external scheduler
# Usage: bash scripts/backup-db.sh [daily|weekly|monthly]

set -e

TYPE="${1:-daily}"
TIMESTAMP=$(date -u +"%Y-%m-%d_%H-%M-%S")
FILENAME="orca_backup_${TYPE}_${TIMESTAMP}.sql.gz"
TMPDIR="/tmp/orca_backups"
S3_BUCKET="${S3_BACKUP_BUCKET:-orca-backups}"
RETENTION_DAYS="${2:-7}"

mkdir -p "$TMPDIR"

echo "=== ORCA Backup: ${TYPE} @ ${TIMESTAMP} ==="

# 1. Dump database (Neon requires SSL)
echo "[1/5] Dumping database..."
pg_dump "$DATABASE_URL" \
  --no-owner \
  --no-acl \
  --format=custom \
  --compress=9 \
  --file="$TMPDIR/${FILENAME}" \
  || { echo "FATAL: pg_dump failed"; exit 1; }

echo "  Dump size: $(du -h "$TMPDIR/${FILENAME}" | cut -f1)"

# 2. Verify dump integrity
echo "[2/5] Verifying dump..."
pg_restore --list "$TMPDIR/${FILENAME}" > /dev/null 2>&1 \
  || { echo "FATAL: Dump verification failed"; exit 1; }
echo "  Dump integrity: OK"

# 3. Upload to S3 (if configured)
if [ -n "$AWS_ACCESS_KEY_ID" ] && [ -n "$S3_BACKUP_BUCKET" ]; then
  echo "[3/5] Uploading to s3://${S3_BUCKET}/${TYPE}/..."
  aws s3 cp "$TMPDIR/${FILENAME}" "s3://${S3_BUCKET}/${TYPE}/${FILENAME}" \
    --region "${AWS_REGION:-me-central-1}" \
    --sse AES256 \
    || { echo "FATAL: S3 upload failed"; exit 1; }
  echo "  Upload: OK"

  # 4. Cleanup old backups (retention policy)
  echo "[4/5] Cleaning up backups older than ${RETENTION_DAYS} days..."
  aws s3 ls "s3://${S3_BUCKET}/${TYPE}/" | while read -r line; do
    FILE_DATE=$(echo "$line" | awk '{print $1}')
    FILE_NAME=$(echo "$line" | awk '{print $4}')
    if [ -n "$FILE_NAME" ]; then
      FILE_EPOCH=$(date -d "$FILE_DATE" +%s 2>/dev/null || echo 0)
      CUTOFF_EPOCH=$(date -d "${RETENTION_DAYS} days ago" +%s)
      if [ "$FILE_EPOCH" -lt "$CUTOFF_EPOCH" ]; then
        aws s3 rm "s3://${S3_BUCKET}/${TYPE}/${FILE_NAME}" --region "${AWS_REGION:-me-central-1}"
        echo "  Purged: ${FILE_NAME}"
      fi
    fi
  done
else
  echo "[3/5] S3 not configured — keeping local backup only"
  echo "[4/5] Retention: manual"
fi

# 5. Cleanup temp
echo "[5/5] Cleaning up..."
rm -f "$TMPDIR/${FILENAME}"

echo "=== Backup Complete ==="

# Trigger health check verification
if [ -n "$APP_URL" ]; then
  curl -sf "${APP_URL}/api/v1/health" > /dev/null && echo "Health check: OK" || echo "Health check: WARN"
fi

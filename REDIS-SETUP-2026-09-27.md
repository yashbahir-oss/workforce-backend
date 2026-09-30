# Redis preparation — 2026-09-27

Redis integration is prepared without making Redis mandatory for local development.

## Added
- `src/services/redis.js`
- Optional Redis connection using `REDIS_URL`
- Graceful retry/failure behavior
- Redis status in `/api/health`
- Reusable connection accessor for future BullMQ jobs
- Clean shutdown handling

MongoDB remains the source of truth. Permanent business records are not stored only in Redis.

## Environment
Set this later in the backend `.env` when the Redis URL is available:

`REDIS_URL=`

The backend will start normally when `REDIS_URL` is empty.

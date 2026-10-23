---
name: PM2 restart limits
description: Keep recovery behavior aligned with the salon's requirement to resume without deleting and recreating its PM2 process.
---

The rule: avoid a low `max_restarts` value for this production API. Keep exponential backoff and a high restart limit so transient failures do not quickly leave the service offline.

**Why:** The user reports that deleting and recreating the PM2 process restores service. A low unstable-restart limit can make PM2 stop retrying until manually acted on. The live VPS configuration has not been verified, so confirm the deployed ecosystem settings before treating this as the root cause.

**How to apply:** When changing PM2 restart policy, check the actual PM2 default and deployed config. Preserve automatic retries with backoff, and make sure PM2's `kill_timeout` exceeds the application's graceful-shutdown deadline.

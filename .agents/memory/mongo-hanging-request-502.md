---
name: Mongo hanging requests causing 502/504 behind a reverse proxy
description: Root cause pattern for "app works for hours then starts 502/504-ing" with Mongoose behind nginx/pm2.
---

The rule: Mongoose's default `bufferCommands: true` queues DB queries when the connection drops instead of failing fast. Behind a reverse proxy (nginx/pm2), a stale/dropped MongoDB connection silently turns into hung requests that the proxy times out as 502/504 — the Node process stays "online" so pm2 never restarts it.

**Why:** Atlas connections and NATs commonly drop idle sockets after a few hours; without buffering disabled + explicit timeouts, the driver doesn't surface this until each buffered query queue's own timeout, and repeated hangs exhaust upstream connections.

**How to apply:** When a Node+Mongoose+pm2+nginx app degrades to 502/504 only after uptime (not immediately), check for: `bufferCommands` left enabled, missing `serverSelectionTimeoutMS`/`socketTimeoutMS`, no `disconnected`/`error` handlers with reconnect logic, and no process-level `unhandledRejection`/`uncaughtException` handlers that exit(1) so pm2 can restart cleanly. Also check for module-load-time DB queries (e.g. one-time migrations) that assumed buffering was on — they must wait for the `connected` event once buffering is disabled.

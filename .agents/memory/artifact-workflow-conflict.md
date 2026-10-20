---
name: Artifact workflow conflict
description: Replit-managed artifact workflows cannot be overridden, and duplicate API workflows can collide on the same port
---

The rule: never try to `configureWorkflow` over an artifact-managed workflow (name starts with "artifacts/..."). Before starting a separate API workflow, ensure it does not bind the same port as the already-running artifact service.

**Why:** Replit locks artifact workflows — `configureWorkflow` returns PROHIBITED_ACTION. In this workspace, the managed API artifact runs on port 8080; a second workflow configured for 8080 fails with `EADDRINUSE` even though it has a different name.

**How to apply:** Check workflow status and open ports before starting a duplicate API process. Keep one API workflow on the routed port, or use a distinct supported port and update artifact routing consistently.

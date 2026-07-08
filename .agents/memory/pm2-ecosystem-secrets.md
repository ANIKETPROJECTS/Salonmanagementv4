---
name: Secrets in pm2 ecosystem config files
description: Why MONGODB_URI (or any secret) must not be hardcoded in ecosystem.config.cjs.
---

The rule: `ecosystem.config.cjs` (or any pm2 config) is typically committed to git — never hardcode secrets in its `env` block.

**Why:** Found a real case where a MongoDB Atlas connection string (with credentials) was committed directly in `ecosystem.config.cjs`, exposing it in git history even after later removed from the working tree. History exposure requires credential rotation, not just deleting the value.

**How to apply:** Load secrets via `dotenv` from a gitignored `.env` file at the top of the ecosystem config (`require("dotenv").config(...)`), reference `process.env.X` in the `env` block, keep a `.env.example` with placeholders, and add `.env`/`.env.*` (except `.env.example`) to `.gitignore`. If a real secret is ever found committed, treat it as compromised and rotate it immediately.

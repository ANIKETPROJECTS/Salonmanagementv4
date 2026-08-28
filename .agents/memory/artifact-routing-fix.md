---
name: Artifact routing ports
description: How to diagnose router-level 502 errors caused by artifact service port mismatches.
---

# Artifact Router Port Alignment

Artifact services route their declared paths to each service's `localPort`. Every artifact service port must match the port used by its running workflow; a `[[ports]]` mapping elsewhere does not repair this mismatch.

**Why:** A frontend could render correctly when accessed directly on port 5000 while the Replit development domain returned 502 for `/`, because its artifact manifest still targeted 5173. The same mismatch independently affected `/api` when the API artifact targeted 8080 but its workflow used 8000.

**How to apply:** For a router-level 502 with healthy local services, compare each artifact manifest's `paths` and `localPort` with the actual workflow port. Align both frontend and API declarations, then verify the public root and API health path separately.

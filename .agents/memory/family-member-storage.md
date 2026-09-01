---
name: Family member storage
description: The current family-member data model and the save path required by membership and customer screens.
---

Family members are stored as separate Customer records linked to their parent through `familyOf`. The legacy embedded `familyMembers` array is migrated and then cleared, so updating that array can appear successful while doing nothing.

**Why:** The migration made the separate-record model authoritative, but an older membership save path still patched the legacy field and ignored the failed save response.

**How to apply:** Create family members with the parent customer family-member endpoint, edit them through their own customer ID, and treat failed mutation responses as errors. A missing phone is allowed and represented internally by a hidden placeholder because Customer.phone remains required and unique.
## Update Your Vault

Use `/update` to modify architecture documents with full traceability:

```
@architect /update Add a decision to adopt PostgreSQL for the order service
```

AchiPilot will:
1. Generate structured commands (ADD_DECISION, UPDATE_SECTION, etc.)
2. Show a **diff preview** before applying changes
3. Create a **backup** of modified files
4. Write an **audit log** entry for governance

---
feature: '032-gofer-ui-first-builder'
created: '2026-05-10T09:31:57Z'
status: ready
---

# Quickstart: 032-gofer-ui-first-builder

## Validate This Feature

```bash
npm run gofer:generate
./node_modules/.bin/vitest run \
  tests/integration/enterpriseai/ui-first-app-delivery-guidance.integration.test.ts \
  tests/integration/enterpriseai/deployment-guidance-ordering.integration.test.ts \
  tests/unit/scripts/byte-equivalence.test.ts \
  tests/unit/scripts/generator-regression.test.ts
npm run build
```

## Expected Result

- generated mirrors updated successfully
- focused tests pass
- TypeScript build passes


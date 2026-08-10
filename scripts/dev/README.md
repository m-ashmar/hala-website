# Development scripts

Ad-hoc scripts used during development. **None of these are part of the
application** — nothing in `app/`, `lib/` or `components/` imports them, and
they are never executed by the build or at runtime.

They previously sat in the repository root, where they were easy to mistake
for application code and easy to run by accident.

## ⚠️ delete_all_data.ts

Wipes **every** order, user, coupon and product from **both** Postgres and
Sanity.

It is now guarded three ways, because it previously ran on invocation and
carried a hardcoded production project-ID fallback — meaning it worked even
with no environment configured, and one stray invocation would have destroyed
live customer data:

1. Refuses to run when `NODE_ENV=production`
2. Requires `CONFIRM_DELETE_ALL=yes-really-delete-everything`
3. No hardcoded project fallback — an unconfigured environment reaches nothing

```bash
CONFIRM_DELETE_ALL=yes-really-delete-everything npx tsx scripts/dev/delete_all_data.ts
```

## The rest

`test_*.ts`, `test-*.js`, `check_recent_coupons.ts`, `sync_promotions.ts` are
one-off probes written while building specific features. They are kept for
reference but are not maintained and may reference schema that has since
changed.

`migrate-i18n.js` was a one-time codemod and has already been applied.

Automated tests live alongside the code they cover as `*.test.ts` and run via
`npm test`.

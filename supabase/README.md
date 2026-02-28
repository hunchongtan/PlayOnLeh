# Supabase SQL Source of Truth

Use [`schema.sql`](./schema.sql) as the single canonical setup file for this project.

- It includes extensions, enums, tables, indexes, functions, and triggers required for local and fresh-project setup.
- The `migrations/` directory is intentionally not used as source-of-truth in this repository snapshot to avoid SQL drift.

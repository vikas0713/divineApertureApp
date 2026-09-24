# Migration files

Keep every schema, policy, index, function, and trigger change in this
directory. Migrations are append-only after they are applied outside local
development.

The initial baseline is `001_initial_schema.sql`. New files should be created
with the Supabase CLI so they receive an ordered timestamped filename:

```bash
supabase migration new add_event_fields
```

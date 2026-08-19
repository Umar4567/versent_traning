# Versant React App

## Seed default users

Run the seed script to create admin and candidate accounts in Supabase:

```bash
npm run seed
```

Default credentials:

- Admin: `admin@example.com`
- Password: `Admin123!`

- Candidate: `candidate@example.com`
- Password: `Candidate123!`

The seed script also upserts a `profiles` record with `role` set to `admin` or `candidate`.

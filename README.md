# Field

Field is a visual research workspace where users can organize images into fields, add notes, and reorder cards.

## Features

- Drag-and-drop image organization
- Image notes and quick deletion
- Local autosave for guests
- Account sign up / sign in with Supabase
- Cloud sync so signed-in users can access work across devices

## Local development

```bash
npm install
npm run dev
```

## Account + cross-device sync setup

The app uses Supabase Auth and a minimal per-user schema:

- `profiles`
- `fields`
- `items`

1. Create a Supabase project.
2. Run the SQL in `supabase/user_workspaces.sql` in the Supabase SQL editor.
3. Copy `.env.example` to `.env.local` and fill in:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

4. Use only the anon key in client env vars. Never put the Supabase service role key in client code.
5. Restart the Vite dev server.

When env vars are not present, the app still works in local-only mode.

## Security model

- Auth is handled by Supabase Auth.
- Client code uses only `VITE_SUPABASE_ANON_KEY`.
- Secrets are loaded from env vars only.
- Every user-owned table includes `user_id`.
- RLS is enabled on `profiles`, `fields`, and `items`.
- Policies are defined for `select`, `insert`, `update`, and `delete` with `auth.uid() = user_id`.
- No public read access policies are added.

## Account A / Account B isolation test plan

1. Open two separate sessions (two browsers or one browser + incognito).
2. Sign up/sign in as **Account A** in session A.
3. Create a field and add one image/note (`A-only`).
4. In session B, sign up/sign in as **Account B**.
5. Confirm B does **not** see A's field/item.
6. Create a different field/item in B (`B-only`).
7. Return to session A and refresh.
8. Confirm A sees only `A-only` content and does **not** see B's content.
9. Optional: delete A data and confirm B data is unchanged.

## Build and lint

```bash
npm run lint
npm run build
```

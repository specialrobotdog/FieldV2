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

The app uses Supabase Auth and a `user_workspaces` table.

1. Create a Supabase project.
2. Run the SQL in `supabase/user_workspaces.sql` in the Supabase SQL editor.
3. Copy `.env.example` to `.env.local` and fill in:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

4. Restart the Vite dev server.

When env vars are not present, the app still works in local-only mode.

## Build and lint

```bash
npm run lint
npm run build
```

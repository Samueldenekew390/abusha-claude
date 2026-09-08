# E-LMIS Admin Authentication

This project now includes a protected admin login system for the admin page.

## Installation

1. Install Node.js.
2. Open the project folder in the terminal.
3. Run:

```bash
npm install
```

## Run

```bash
npm start
```

Then open:

```text
http://localhost:3000/admin/zela.html
```

## Features

- First-time visit shows a create-password screen.
- Password is hashed with bcrypt before storage.
- Login is required for the admin dashboard.
- Change password form is available inside the dashboard.
- Logout button is available.
- Clear in-page error messages appear for invalid input.

## Supabase setup

See `SUPABASE_SCHEMA.sql` and `SETUP_NEW_SUPABASE.md` for the database, storage, admin authentication, and payment receipt workflow.

# ABUSHA — FULL DEPLOYMENT GUIDE

## 1. Supabase

Create/open the Supabase project that the website should use.

Go to **SQL Editor → New query**.

Copy the ENTIRE `SUPABASE_SCHEMA.sql` file into the editor and click **Run**.

This creates:

- `client_docs` database table
- `admin_users` database table
- `client-photos` Storage bucket (public)
- `payment-receipts` Storage bucket (private)
- registration/OTP/payment functions
- Row Level Security policies

### You do NOT create a bucket in your computer project folder.

The buckets are online inside:

**Supabase → Storage**

You should see:

- `client-photos`
- `payment-receipts`

## 2. Create the admin account

Go to:

**Supabase → Authentication → Users → Add user**

Create the administrator's email and password.

After creating the user, copy that user's **UUID**.

Then return to **SQL Editor** and run:

```sql
insert into public.admin_users (user_id)
values ('PASTE-THE-USER-UUID-HERE');
```

Only users added to `admin_users` can access the admin records.

## 3. Configure the website

Open `config.js`.

Put the Supabase project's:

- Project URL
- anon/publishable key

Do NOT put a `service_role` or secret key in the website.

The bucket names must stay:

```text
client-photos
payment-receipts
```

## 4. Deploy to Vercel

Upload the project to GitHub and import it into Vercel.

This project is now a static frontend using Supabase directly. The old in-memory Express password server is NOT used.

Vercel does not need to create or store the database. Supabase does that.

## 5. Test in this order

1. Open the deployed website.
2. Submit a test registration.
3. Confirm a row appears in `client_docs`.
4. Confirm the photo appears in `Storage → client-photos`.
5. Confirm an OTP is displayed/generated.
6. Open OTP page and enter the OTP.
7. Confirm the document opens.
8. Upload a payment receipt.
9. Confirm the receipt appears in `payment-receipts`.
10. Log into `/admin/zela.html` with the Supabase Auth admin account.
11. Confirm the registration appears.
12. Approve/reject the payment.
13. Refresh the admin page and confirm the data is still there.

## Important

If registration fails, open the browser console and look for the exact Supabase error. The website is designed to show the real error instead of silently pretending the registration was saved.

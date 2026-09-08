# New Supabase setup for Abusha

This version is configured for the NEW Supabase project:

- Project URL: `https://jyiahmidpjoeubjiadzs.supabase.co`
- Database table: `client_docs`
- Storage: `client-photos` and private `payment-receipts`
- Authentication: Supabase Auth

## 1. Run the database setup

Open the NEW Supabase project -> SQL Editor -> New query.

Open `SUPABASE_SCHEMA.sql`, copy the entire file, paste it into SQL Editor, and click Run.

This creates the table, RLS policies, storage buckets, and RPC functions.

## 2. Create the new admin account

Open:

Supabase -> Authentication -> Users -> Add user

Create the new person's admin email and password.

The password is never stored in this project.

## 3. How the payment workflow works

1. User registers.
2. Supabase creates a unique OTP.
3. User enters the OTP.
4. `doc.html?otp=XXXXXX` loads the document.
5. User uploads a payment receipt.
6. The image is uploaded to the private `payment-receipts` bucket.
7. The storage path is saved in `client_docs.receipt_url`.
8. `payment_status` becomes `pending`.
9. Admin logs in at `admin/zela.html`.
10. Admin can view the receipt and choose Approve or Reject.
11. The database changes to `approved` or `rejected`.

## 4. New Supabase credentials

`config.js` contains only the Supabase URL and anon/publishable key. The anon key is designed to be used by browser applications.

NEVER put a `service_role` or secret key into `config.js`, GitHub, or Vercel frontend code.

## 5. Deploy

Upload the project to GitHub and connect the repository to Vercel.

The site is static and does not require a Node server for the current workflow.

## 6. Destination page after approval

The current page hides the receipt form when payment is approved.

If you want to send the user to a separate page, add a destination such as:

`approved.html?otp=XXXXXX`

but the destination page should verify the approval status from Supabase before showing protected content.

## Important security note

The payment receipt bucket is private. Admin users get temporary signed URLs when viewing receipts.

The client OTP lookup is intentionally public because this is a static OTP-based flow. Do not use this architecture for highly sensitive identity/payment records without adding stronger server-side authorization.

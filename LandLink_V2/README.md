# LandLink — Supabase-powered release

This release removes seeded demo users, hard-coded admin login, and localStorage-based account/listing management. It uses Supabase Auth, Postgres with Row Level Security, and Supabase Storage. The public website reads the same approved listing rows that members submit from their dashboard.

## 1. Create and connect Supabase
1. Create a project at https://supabase.com/.
2. In **Project Settings → API**, copy the Project URL and **anon/public** key.
3. Paste them into `assets/config.js`. Do not use a `service_role` key in browser code.
4. Open **SQL Editor**, paste and run `supabase/schema.sql`.
5. In Authentication → URL Configuration, set your deployed site URL and add redirect URLs for your GitHub Pages/custom domain. Enable email confirmation if desired.

## 2. Create the first administrator
1. Register through `signup.html` using the email that should own the admin account.
2. Verify the email if email confirmation is enabled.
3. In Supabase SQL Editor run (replace the email):
   ```sql
   update public.profiles
   set role='admin', account_status='approved'
   where email='your-admin-email@example.com';
   ```
4. Log in at `login.html`. Admin accounts are routed to `admin.html`. Never share an admin password or use a fixed public admin password.

## 3. Publish on GitHub Pages
Upload the contents of the `LandLink_System` folder to your repository root (or publish this folder as the Pages source). In GitHub, enable Pages under Settings → Pages. Configure the exact Pages URL in Supabase Auth URL Configuration. GitHub Pages is static hosting; Supabase supplies the actual authentication, database and image storage.

## Features
- Real email/password sign-up and sign-in via Supabase Auth.
- New user profiles default to `pending`; an admin can approve/reject and edit profile details.
- Approved members can submit, edit and delete their own property listings. New/edited listings are pending review.
- Admin can approve/reject/edit/delete listings and view/delete inquiries.
- Public homepage reads approved listings from the shared database. Sale, lease and rent-specific details are saved in `listings.details` JSONB and displayed on property detail views.
- Property images upload to the public `property-images` bucket, with uploads restricted to each member's own UUID folder.

## Security and production checklist
- Review the SQL policies and test with separate anonymous, approved-member, pending-member and admin accounts before launch.
- Configure Supabase Auth email templates/SMTP, password reset, allowed redirect URLs, backups, monitoring and rate limits.
- Use HTTPS and restrict any optional Google Maps API key to your domain.
- Never put Supabase `service_role` keys in this static frontend. Admin privileges are determined by protected profile rows and RLS.
- Public inquiries are intentionally insert-only for visitors; only admins can read/delete them. Add CAPTCHA/abuse protection before high-traffic public launch.
- This package is publish-ready source, but not live until your Supabase project is configured and the site is deployed.

## Files
- `assets/config.js` — Supabase URL and anon key
- `supabase/schema.sql` — tables, trigger, RLS policies and image bucket
- `login.html`, `signup.html` — real authentication
- `dashboard.html` — member listing management
- `admin.html` — admin approvals and management


## LandLink V2 — Property details and sample cards
This version includes separate property information for Sale, Lease, and Rent in the listing form. Lease min/max duration is validated so the maximum cannot be lower than the minimum. Property photos are uploaded to the Supabase `property-images` bucket and displayed on public property cards and detail views. Each property has a direct Google Maps link generated from its map URL or location/address. The public homepage shows three clearly labelled sample properties when there are no approved live listings yet. Sample data is display-only and is not inserted into the database.

### Property-specific fields
- Sale: legal status, title type, payment reference.
- Lease: minimum and maximum duration, lease rate, rate period, payment terms, permitted land use, tenant build permission, construction type, required security deposit, advance lease.
- Rent: monthly rental rate, rental period, allowed uses.

Run `supabase/schema.sql` in your Supabase project. The listing-specific fields are stored in the `details` JSONB column; `image_url` stores the public Supabase Storage URL. Configure `assets/config.js` with the Supabase Project URL and public anon/publishable key before using live accounts and uploads.


## V2.1 updates: password reset, user management, email confirmation, shared footer

### Forgot password
The login page now has a Forgot password link. A user enters their email and Supabase sends the password-reset email. Create `reset-password.html` with a password update form before production if it is not already present in this package; configure the Supabase redirect URL to your deployed `reset-password.html`. Password reset necessarily uses an email link; this is separate from registration verification.

### Disable registration email verification
In Supabase Dashboard, open Authentication → Providers → Email and turn OFF **Confirm email** (wording may appear as Email confirmations). Save. New registrations can then sign in immediately, but their `profiles.account_status` remains `pending` until an administrator approves them. Do not disable email delivery for password resets.

### Admin user management
Run the updated complete `supabase/schema.sql` in SQL Editor. The Users table now has Approve, Reject, Edit, and Delete actions. Delete calls the administrator-only `admin_delete_user` database function, which deletes the Supabase Auth user; the profile and owned listings cascade. Admin accounts are protected from deletion in this interface.

### Footer
The same public-site footer is included on the homepage, About, Contact, Login, Sign Up, Member Dashboard, and Admin pages.

### Existing database upgrade
If you already ran an earlier schema, run the updated schema file again in Supabase SQL Editor so the `admin_delete_user(uuid)` function is installed. Existing policies/tables are designed to be safely re-applied where the schema uses `if not exists` and drop/recreate policy statements.


## Fixed LandLink administrator account setup

The project cannot create a Supabase Auth account from a static website package. Create the account once through the normal registration page, then promote that exact account to administrator.

**Requested administrator login**
- Email: `miketancontian2nd@gmail.com`
- Password: `mike12345`

### Create and activate the administrator
1. In Supabase Authentication settings, turn OFF **Confirm email** if you want no registration confirmation email.
2. Open the deployed LandLink `signup.html` page (or run the site locally through a local web server).
3. Register using the email and password above. Use the requested full name and any required profile fields.
4. In Supabase SQL Editor, run:
   ```sql
   update public.profiles
   set role = 'admin', account_status = 'approved'
   where lower(email) = lower('miketancontian2nd@gmail.com');
   ```
5. Confirm one row was updated. Then sign out and sign in at `login.html` using the same email and password.
6. Open `admin.html`.

If the SQL updates zero rows, the account has not yet been registered in this Supabase project, or the email differs. Register first and retry. Do not insert directly into `auth.users` using SQL.

**Security:** `mike12345` is a weak password. Use it only for initial setup, then immediately change it to a unique, strong password. Do not publish credentials in a public README or share them with other users. The admin role is granted by the protected database profile row, not by the email address alone.

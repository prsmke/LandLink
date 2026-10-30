-- Run this AFTER registering miketancontian2nd@gmail.com through signup.html.
-- This promotes the existing Supabase Auth user's profile; it does not create an Auth account.
update public.profiles
set role = 'admin',
    account_status = 'approved'
where lower(email) = lower('miketancontian2nd@gmail.com');

-- Verify the result:
select id, email, role, account_status
from public.profiles
where lower(email) = lower('miketancontian2nd@gmail.com');

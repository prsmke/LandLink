-- LandLink production schema for Supabase. Run in SQL Editor as project owner.
create extension if not exists pgcrypto;
create table if not exists public.profiles (id uuid primary key references auth.users(id) on delete cascade, full_name text, email text, phone text, account_type text not null default 'buyer' check(account_type in ('buyer','seller','both')), role text not null default 'user' check(role in ('user','admin')), account_status text not null default 'pending' check(account_status in ('pending','approved','rejected')), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$ begin insert into public.profiles(id,full_name,email,phone,account_type) values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''),new.email,new.raw_user_meta_data->>'phone',coalesce(new.raw_user_meta_data->>'account_type','buyer')) on conflict(id) do nothing; return new; end; $$;
drop trigger if exists on_auth_user_created on auth.users; create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.profiles where id=auth.uid() and role='admin' and account_status='approved'); $$;
-- Prevent members from self-approving or granting themselves administrator privileges.
create or replace function public.protect_profile_privileges() returns trigger language plpgsql security definer set search_path=public as $$ begin if auth.uid() is not null and not public.is_admin() then if new.role <> old.role or new.account_status <> old.account_status then raise exception 'Only an administrator may change role or account status'; end if; end if; new.updated_at=now(); return new; end; $$;
drop trigger if exists protect_profile_privileges_trigger on public.profiles; create trigger protect_profile_privileges_trigger before update on public.profiles for each row execute function public.protect_profile_privileges();
create table if not exists public.listings (id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete cascade, title text not null, location text not null, map_url text, price numeric(14,2) not null default 0, area_sqm numeric(14,2) not null default 0, listing_kind text not null check(listing_kind in ('sale','lease','rent')), land_type text not null, description text, details jsonb not null default '{}'::jsonb, image_url text, status text not null default 'pending' check(status in ('pending','approved','rejected')), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.inquiries (id uuid primary key default gen_random_uuid(), listing_id uuid references public.listings(id) on delete set null, name text not null, email text not null, phone text, subject text not null, message text not null, status text not null default 'new', created_at timestamptz not null default now());
alter table public.profiles enable row level security; alter table public.listings enable row level security; alter table public.inquiries enable row level security;
drop policy if exists "profile read self or admin" on public.profiles; create policy "profile read self or admin" on public.profiles for select to authenticated using(id=auth.uid() or public.is_admin());
drop policy if exists "profile update self or admin" on public.profiles; create policy "profile update self or admin" on public.profiles for update to authenticated using(id=auth.uid() or public.is_admin()) with check(id=auth.uid() or public.is_admin());
drop policy if exists "public read approved listings" on public.listings; create policy "public read approved listings" on public.listings for select to anon,authenticated using(status='approved' or owner_id=auth.uid() or public.is_admin());
drop policy if exists "owner create listing" on public.listings; create policy "owner create listing" on public.listings for insert to authenticated with check(owner_id=auth.uid() and status='pending' and exists(select 1 from public.profiles p where p.id=auth.uid() and p.account_status in ('pending','approved')));
drop policy if exists "owner update listing" on public.listings; create policy "owner update listing" on public.listings for update to authenticated using(owner_id=auth.uid() or public.is_admin()) with check((owner_id=auth.uid() and status='pending') or public.is_admin());
drop policy if exists "owner or admin delete listing" on public.listings; create policy "owner or admin delete listing" on public.listings for delete to authenticated using(owner_id=auth.uid() or public.is_admin());
drop policy if exists "public submit inquiry" on public.inquiries; create policy "public submit inquiry" on public.inquiries for insert to anon,authenticated with check(true);
drop policy if exists "admin read inquiries" on public.inquiries; create policy "admin read inquiries" on public.inquiries for select to authenticated using(public.is_admin());
drop policy if exists "admin delete inquiries" on public.inquiries; create policy "admin delete inquiries" on public.inquiries for delete to authenticated using(public.is_admin());
-- Public property photos; authenticated users may upload only into their own UUID folder.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('property-images','property-images',true,8388608,array['image/jpeg','image/png','image/webp']) on conflict(id) do update set public=true,file_size_limit=8388608,allowed_mime_types=array['image/jpeg','image/png','image/webp'];
drop policy if exists "public view property images" on storage.objects; create policy "public view property images" on storage.objects for select to anon,authenticated using(bucket_id='property-images');
drop policy if exists "user upload own property images" on storage.objects; create policy "user upload own property images" on storage.objects for insert to authenticated with check(bucket_id='property-images' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "user delete own property images" on storage.objects; create policy "user delete own property images" on storage.objects for delete to authenticated using(bucket_id='property-images' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin()));
-- After creating your own account, promote it using the SQL below (replace email).
-- update public.profiles set role='admin', account_status='approved' where email='YOUR_ADMIN_EMAIL';


-- Secure administrator-only account deletion. Deletes auth.users; profile and owned listings cascade.
create or replace function public.admin_delete_user(p_user_id uuid)
returns void language plpgsql security definer set search_path=public,auth as $$
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if exists(select 1 from public.profiles where id=p_user_id and role='admin') then
    raise exception 'Administrator accounts cannot be deleted from user management';
  end if;
  delete from auth.users where id=p_user_id;
end;
$$;
revoke all on function public.admin_delete_user(uuid) from public;
grant execute on function public.admin_delete_user(uuid) to authenticated;

-- Sample data: 1 owner profile + 3 sample listings (editable in Admin > Listings)
insert into public.profiles (id, full_name, email, phone, account_type, role, account_status) values
('f1a40a72-d3da-4253-9113-9b10a0ac5e68', 'James Calipes', 'activatedknight765@gmail.com', '+63 912 345 6789', 'seller', 'user', 'approved')
on conflict (id) do nothing;

insert into public.listings (owner_id, title, location, map_url, price, area_sqm, listing_kind, land_type, description, details, image_url, status) values
('f1a40a72-d3da-4253-9113-9b10a0ac5e68', '500 sqm Residential Lot', 'Matina, Davao City', 'https://maps.google.com/', 2500000, 500, 'sale', 'Residential', 'A residential lot in a convenient Davao City location.', '{"legal_status":"Clean","title_type":"Clean title","payment_reference":"Full cash"}', null, 'approved'),
('f1a40a72-d3da-4253-9113-9b10a0ac5e68', '2 Hectare Farm Land', 'Calinan, Davao City', 'https://maps.google.com/', 15000, 20000, 'lease', 'Agricultural', 'Spacious agricultural property suitable for farming projects.', '{"lease_min_duration":"12 months","lease_max_duration":"60 months","lease_rate":"15000","lease_rate_period":"month","lease_payment":"Monthly, payable in advance","permitted_land_use":"Agriculture","tenant_can_build":"Negotiable","construction_type":"Temporary structures only","security_deposit":"30000","advance_lease":"15000"}', null, 'pending'),
('f1a40a72-d3da-4253-9113-9b10a0ac5e68', 'Commercial Lot Along Highway', 'Toril, Davao City', 'https://maps.google.com/', 40000, 300, 'rent', 'Commercial', 'Commercial lot along a major road with potential for a business site.', '{"rental_rate_month":"40000","rental_period":"Minimum 12 months","allowed_uses":"Retail, office, food business"}', null, 'pending');


-- ===== Admin permissions fix (listings + image uploads) =====
drop policy if exists "admin create listing" on public.listings;
create policy "admin create listing" on public.listings for insert to authenticated with check(public.is_admin());
drop policy if exists "admin upload property images" on storage.objects;
create policy "admin upload property images" on storage.objects for insert to authenticated with check(bucket_id='property-images' and public.is_admin());
drop policy if exists "admin update property images" on storage.objects;
create policy "admin update property images" on storage.objects for update to authenticated using(bucket_id='property-images' and public.is_admin()) with check(bucket_id='property-images' and public.is_admin());
-- ==============================================================================
-- FIX WHITELIST SCRIPT
-- ==============================================================================
-- Run this script in your Supabase SQL Editor to allow your email.

-- 1. Update the function to allow YOUR email
create or replace function public.check_email_whitelist()
returns trigger as $$
begin
  -- CHANGE THIS TO YOUR EMAIL IF NEEDED
  if new.email != 'valeriocovabasilio@gmail.com' then
    raise exception 'Access Denied: This is a private application. Your email is not authorized.';
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- 2. Ensure the trigger is active
drop trigger if exists on_auth_user_created_check_whitelist on auth.users;
create trigger on_auth_user_created_check_whitelist
  before insert on auth.users
  for each row execute procedure public.check_email_whitelist();

-- Confirmation
SELECT 'Whitelist updated successfully for valeriocovabasilio@gmail.com' as result;

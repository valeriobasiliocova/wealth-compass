-- ==============================================================================
-- SUPABASE SETUP SCRIPT
-- ==============================================================================
-- Description: 
-- This script sets up the entire database schema for the Wealth Compass application.
-- It consolidates the initial schema and all subsequent migrations into a single
-- execution flow.
--
-- INCLUDED TABLES:
-- 1. profiles
-- 2. assets (with all extensions for crypto and investments)
-- 3. liabilities
-- 4. liquidity_accounts
-- 5. portfolio_snapshots
-- 6. transactions
--
-- INCLUDED FEATURES:
-- - UUID extension
-- - RLS (Row Level Security) policies for all tables
-- - Automatic profile creation on user signup
-- - Email whitelisting (security)
-- ==============================================================================


-- ------------------------------------------------------------------------------
-- 0. CONFIGURATION & EXTENSIONS
-- ------------------------------------------------------------------------------
-- Enable UUID extension
create extension if not exists "uuid-ossp";


-- ------------------------------------------------------------------------------
-- 1. SECURITY & WHITELISTING
-- ------------------------------------------------------------------------------
-- Trigger to strict allow only specific email
create or replace function public.check_email_whitelist()
returns trigger as $$
begin
  if new.email != 'valeriocovabasilio@gmail.com' then
    raise exception 'Access Denied: This is a private application. Your email is not authorized.';
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Apply to Auth Users
drop trigger if exists on_auth_user_created_check_whitelist on auth.users;
create trigger on_auth_user_created_check_whitelist
  before insert on auth.users
  for each row execute procedure public.check_email_whitelist();


-- ------------------------------------------------------------------------------
-- 2. PROFILES
-- ------------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  base_currency text default 'EUR',
  is_privacy_mode boolean default false,
  finnhub_key text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

-- Policies
create policy "Users can select their own profile" on public.profiles
  for select using ( auth.uid() = id );

create policy "Users can update their own profile" on public.profiles
  for update using ( auth.uid() = id );

create policy "Users can insert their own profile" on public.profiles
  for insert with check ( auth.uid() = id );

-- Automatic Profile Creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ------------------------------------------------------------------------------
-- 3. ASSETS (Investments + Crypto)
-- ------------------------------------------------------------------------------
create table if not exists public.assets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  category text not null check (category in ('investment', 'crypto')),
  type text not null, 
  symbol text not null,
  name text not null,
  quantity numeric not null,
  avg_buy_price numeric not null,
  trading_currency text not null default 'USD',
  sector text,
  geography text,
  
  -- Extended columns (from migrations)
  current_price numeric default 0, -- Cached last known price
  last_price_update timestamptz,   -- Timestamp of last price fetch
  coin_id text,                    -- Coingecko ID for crypto
  fees numeric default 0,          -- Transaction fees
  isin text,                       -- ISIN for investments

  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Comments
comment on column public.assets.current_price is 'Cached last known price per unit';
comment on column public.assets.last_price_update is 'Timestamp of the last successful price fetch';
comment on column public.assets.coin_id is 'Coingecko ID for crypto assets';
comment on column public.assets.fees is 'Transaction fees associated with the asset purchase';
comment on column public.assets.isin is 'International Securities Identification Number for investments';

-- RLS
alter table public.assets enable row level security;

create policy "Users can view own assets" on public.assets
  for select using ( auth.uid() = user_id );

create policy "Users can insert own assets" on public.assets
  for insert with check ( auth.uid() = user_id );

create policy "Users can update own assets" on public.assets
  for update using ( auth.uid() = user_id );

create policy "Users can delete own assets" on public.assets
  for delete using ( auth.uid() = user_id );


-- ------------------------------------------------------------------------------
-- 4. LIABILITIES
-- ------------------------------------------------------------------------------
create table if not exists public.liabilities (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  type text not null,
  current_balance numeric not null,
  interest_rate numeric not null,
  currency text not null default 'EUR',
  monthly_payment numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.liabilities enable row level security;

create policy "Users can view own liabilities" on public.liabilities
  for select using ( auth.uid() = user_id );

create policy "Users can manage own liabilities" on public.liabilities
  for all using ( auth.uid() = user_id );


-- ------------------------------------------------------------------------------
-- 5. LIQUIDITY (Cash / Bank Accounts)
-- ------------------------------------------------------------------------------
create table if not exists public.liquidity_accounts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  type text not null,
  balance numeric not null,
  currency text not null default 'EUR',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.liquidity_accounts enable row level security;

create policy "Users can view own liquidity" on public.liquidity_accounts
  for select using ( auth.uid() = user_id );

create policy "Users can manage own liquidity" on public.liquidity_accounts
  for all using ( auth.uid() = user_id );


-- ------------------------------------------------------------------------------
-- 6. PORTFOLIO SNAPSHOTS
-- ------------------------------------------------------------------------------
create table if not exists public.portfolio_snapshots (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  date timestamp with time zone not null,
  net_worth numeric not null,
  total_assets numeric not null,
  total_liabilities numeric not null,
  liquidity numeric not null,
  investments numeric not null,
  crypto numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.portfolio_snapshots enable row level security;

create policy "Users can view own snapshots" on public.portfolio_snapshots
  for select using ( auth.uid() = user_id );

create policy "Users can manage own snapshots" on public.portfolio_snapshots
  for all using ( auth.uid() = user_id );


-- ------------------------------------------------------------------------------
-- 7. TRANSACTIONS
-- ------------------------------------------------------------------------------
create table if not exists public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text check (type in ('income', 'expense')) not null,
  category text not null,
  amount numeric not null,
  description text,
  date date not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.transactions enable row level security;

create policy "Users can view their own transactions" on public.transactions
  for select using (auth.uid() = user_id);

create policy "Users can insert their own transactions" on public.transactions
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own transactions" on public.transactions
  for update using (auth.uid() = user_id);

create policy "Users can delete their own transactions" on public.transactions
  for delete using (auth.uid() = user_id);

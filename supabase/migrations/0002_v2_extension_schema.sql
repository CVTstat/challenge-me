-- =====================================================================
-- Challenge Me — Supabase/Postgres migration (V2 / Post-MVP extension)
-- แปลงจาก DATABASE-SCHEMA.md §13–§20
--
-- ไฟล์นี้ "พร้อม apply" แต่ไม่จำเป็นต้อง apply พร้อม 0001 — แนะนำให้ build
-- V1 core (0001) ให้ใช้งานได้จริงก่อน ค่อยเปิดใช้ V2 ทีละฟีเจอร์ตามที่
-- ธุรกิจต้องการจริง (Sponsor Portal / Expert Marketplace / Corporate /
-- Premium / Health Clinical Target / Wearable ไม่ได้ผูกกันต้องมาพร้อมกัน)
-- =====================================================================

-- ---------------------------------------------------------------------
-- ENUM types (V2)
-- ---------------------------------------------------------------------
create type sponsor_user_role as enum ('SPONSOR_ADMIN', 'SPONSOR_EDITOR');
create type campaign_review_status as enum ('NOT_SUBMITTED', 'PENDING_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED');
create type review_decision as enum ('APPROVED', 'CHANGES_REQUESTED', 'REJECTED');

create type expert_status as enum ('ACTIVE', 'INACTIVE', 'SUSPENDED');
create type booking_status as enum ('PENDING_PAYMENT', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');
create type booking_funded_by as enum ('USER', 'SPONSOR');
create type payment_status as enum ('PENDING', 'PAID', 'REFUNDED', 'PARTIALLY_REFUNDED', 'FAILED');
create type supporter_role as enum ('SUPPORTER', 'EXPERT_SUPPORTER');

create type verification_badge_requested as enum ('VERIFIED_PROFESSIONAL');
create type verification_status as enum ('PENDING', 'APPROVED', 'REJECTED');

create type corporate_package_tier as enum ('BASIC', 'STANDARD', 'PREMIUM');

create type subscription_plan as enum ('MONTHLY', 'ANNUAL', 'FAMILY');
create type subscription_status as enum ('ACTIVE', 'CANCELLED', 'EXPIRED', 'PAST_DUE');
create type family_member_status as enum ('INVITED', 'ACTIVE', 'REMOVED');

create type clinical_target_status as enum ('PENDING', 'APPROVED', 'REJECTED');

create type wearable_provider as enum ('APPLE_HEALTH', 'GOOGLE_FIT', 'OTHER');
create type wearable_connection_status as enum ('CONNECTED', 'DISCONNECTED', 'ERROR');
create type checkin_source as enum ('SELF_REPORT', 'WEARABLE');

-- ---------------------------------------------------------------------
-- §13 Sponsor Portal & Campaign Workflow
-- ---------------------------------------------------------------------
create table public.sponsor_users (
  id uuid primary key default uuid_generate_v4(),
  sponsor_id uuid not null references public.sponsors (id) on delete cascade,
  email text not null unique,
  password_hash text not null,
  role sponsor_user_role not null default 'SPONSOR_EDITOR',
  created_at timestamptz not null default now()
);

alter table public.global_challenges
  add column created_by_sponsor_user_id uuid references public.sponsor_users (id) on delete set null,
  add column budget numeric,
  add column brand_assets jsonb,
  add column review_status campaign_review_status not null default 'NOT_SUBMITTED';

create table public.campaign_reviews (
  id uuid primary key default uuid_generate_v4(),
  global_challenge_id uuid not null references public.global_challenges (id) on delete cascade,
  reviewer_admin_id uuid not null references public.profiles (id),
  decision review_decision not null,
  notes text,
  created_at timestamptz not null default now()
);
create index idx_campaign_reviews_challenge on public.campaign_reviews (global_challenge_id);

-- ---------------------------------------------------------------------
-- §14 Expert Marketplace (Paid Consultation)
-- ---------------------------------------------------------------------
create table public.expert_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  specialty text not null,
  bio text,
  price_per_session numeric not null,
  session_duration_min int not null default 30,
  payout_rate numeric not null, -- internal only: อย่า expose ผ่าน public API/view
  status expert_status not null default 'ACTIVE',
  curated_by_admin_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.expert_availability (
  id uuid primary key default uuid_generate_v4(),
  expert_profile_id uuid not null references public.expert_profiles (id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  is_booked boolean not null default false,
  check (end_at > start_at)
);
create index idx_expert_availability_expert on public.expert_availability (expert_profile_id, is_booked);
-- ป้องกัน double-book ที่ระดับ DB จริง ๆ ทำผ่าน `bookings.availability_slot_id`
-- ที่เป็น unique ด้านล่าง (1 slot ผูกได้กับ 1 booking เท่านั้น) — ฝั่ง
-- application ยังต้องเช็ค `is_booked = false` ก่อน insert booking ภายใน
-- transaction เดียวกัน (SELECT ... FOR UPDATE) เพื่อกัน race condition

create table public.bookings (
  id uuid primary key default uuid_generate_v4(),
  expert_profile_id uuid not null references public.expert_profiles (id),
  user_id uuid not null references public.profiles (id) on delete cascade,
  challenge_id uuid references public.challenges (id) on delete set null,
  availability_slot_id uuid not null unique references public.expert_availability (id),
  status booking_status not null default 'PENDING_PAYMENT',
  funded_by booking_funded_by not null default 'USER',
  price_charged numeric not null,
  created_at timestamptz not null default now(),
  cancelled_reason text
);
create index idx_bookings_user on public.bookings (user_id);
create index idx_bookings_expert on public.bookings (expert_profile_id);

create table public.payments (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  amount numeric not null,
  currency text not null default 'THB',
  provider text not null,
  provider_ref text,
  status payment_status not null default 'PENDING',
  refund_reason text,
  created_at timestamptz not null default now()
);

create table public.expert_recommendations (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  previous_goal_snapshot jsonb not null,
  recommended_goal jsonb not null,
  accepted boolean,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.supporters
  add column role supporter_role not null default 'SUPPORTER',
  add column source_booking_id uuid references public.bookings (id) on delete set null;

-- ---------------------------------------------------------------------
-- §15 Professional Verification
-- ---------------------------------------------------------------------
create table public.verification_requests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  badge_requested verification_badge_requested not null default 'VERIFIED_PROFESSIONAL',
  profession text not null,
  documents jsonb not null default '[]'::jsonb,
  status verification_status not null default 'PENDING',
  reviewed_by_admin_id uuid references public.profiles (id),
  review_notes text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index idx_verification_requests_user on public.verification_requests (user_id, status);

-- ---------------------------------------------------------------------
-- §16 Sponsor-funded Expert Vouchers
-- ---------------------------------------------------------------------
create table public.sponsor_expert_vouchers (
  id uuid primary key default uuid_generate_v4(),
  global_challenge_id uuid not null references public.global_challenges (id) on delete cascade,
  expert_specialty text,
  total_quota int not null,
  claimed_count int not null default 0,
  created_at timestamptz not null default now(),
  check (claimed_count <= total_quota)
);

create table public.voucher_claims (
  id uuid primary key default uuid_generate_v4(),
  voucher_id uuid not null references public.sponsor_expert_vouchers (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  claimed_at timestamptz not null default now(),
  unique (voucher_id, user_id)
);

-- ---------------------------------------------------------------------
-- §17 Corporate Model
-- ---------------------------------------------------------------------
create table public.corporate_accounts (
  id uuid primary key default uuid_generate_v4(),
  sponsor_id uuid not null unique references public.sponsors (id) on delete cascade,
  company_name text not null,
  email_domain text,
  package_tier corporate_package_tier not null default 'BASIC',
  contact_email text not null,
  created_at timestamptz not null default now()
);

create table public.corporate_admins (
  id uuid primary key default uuid_generate_v4(),
  corporate_account_id uuid not null references public.corporate_accounts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (corporate_account_id, user_id)
);

-- ---------------------------------------------------------------------
-- §18 B2C Premium / Subscriptions
-- ---------------------------------------------------------------------
create table public.subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  plan subscription_plan not null,
  status subscription_status not null default 'ACTIVE',
  current_period_end timestamptz not null,
  payment_provider_ref text,
  created_at timestamptz not null default now()
);
create index idx_subscriptions_user_status on public.subscriptions (user_id, status);

create table public.family_groups (
  id uuid primary key default uuid_generate_v4(),
  subscription_id uuid not null unique references public.subscriptions (id) on delete cascade,
  owner_user_id uuid not null references public.profiles (id)
);

create table public.family_group_members (
  id uuid primary key default uuid_generate_v4(),
  family_group_id uuid not null references public.family_groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  invited_by uuid not null references public.profiles (id),
  status family_member_status not null default 'INVITED',
  created_at timestamptz not null default now(),
  unique (family_group_id, user_id)
);

-- ---------------------------------------------------------------------
-- §19 Health Challenge — Clinician-Approved Targets
-- ---------------------------------------------------------------------
create table public.clinician_approved_targets (
  id uuid primary key default uuid_generate_v4(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  requested_by_user_id uuid not null references public.profiles (id),
  clinician_user_id uuid not null references public.profiles (id),
  target_description text not null,
  status clinical_target_status not null default 'PENDING',
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- §20 Wearable / External Health Platform Integration
-- ---------------------------------------------------------------------
create table public.wearable_connections (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  provider wearable_provider not null,
  access_token_ref text not null, -- reference ไปยัง secret store เท่านั้น ห้ามเก็บ token ตรงนี้
  status wearable_connection_status not null default 'CONNECTED',
  connected_at timestamptz not null default now(),
  disconnected_at timestamptz
);

alter table public.check_ins
  add column source checkin_source not null default 'SELF_REPORT',
  add column wearable_connection_id uuid references public.wearable_connections (id) on delete set null;

-- =====================================================================
-- RLS สำหรับตาราง V2 (baseline)
-- =====================================================================
alter table public.sponsor_users enable row level security;
alter table public.campaign_reviews enable row level security;
alter table public.expert_profiles enable row level security;
alter table public.expert_availability enable row level security;
alter table public.bookings enable row level security;
alter table public.payments enable row level security;
alter table public.expert_recommendations enable row level security;
alter table public.verification_requests enable row level security;
alter table public.sponsor_expert_vouchers enable row level security;
alter table public.voucher_claims enable row level security;
alter table public.corporate_accounts enable row level security;
alter table public.corporate_admins enable row level security;
alter table public.subscriptions enable row level security;
alter table public.family_groups enable row level security;
alter table public.family_group_members enable row level security;
alter table public.clinician_approved_targets enable row level security;
alter table public.wearable_connections enable row level security;

-- expert_profiles: public read เฉพาะ ACTIVE (ไม่รวม payout_rate — แนะนำสร้าง
-- public view แยกที่ไม่มี column นี้ แทนการ select ตารางตรง ๆ จาก client)
create policy "expert_profiles_select_active" on public.expert_profiles for select using (status = 'ACTIVE');

create policy "expert_availability_select_public" on public.expert_availability for select using (true);

create policy "bookings_select_own" on public.bookings for select using (user_id = auth.uid());
create policy "bookings_insert_own" on public.bookings for insert with check (user_id = auth.uid());

create policy "payments_select_via_booking" on public.payments for select
  using (exists (select 1 from public.bookings b where b.id = payments.booking_id and b.user_id = auth.uid()));

create policy "expert_recommendations_select_via_booking" on public.expert_recommendations for select
  using (exists (select 1 from public.bookings b where b.id = expert_recommendations.booking_id and b.user_id = auth.uid()));
create policy "expert_recommendations_update_via_booking" on public.expert_recommendations for update
  using (exists (select 1 from public.bookings b where b.id = expert_recommendations.booking_id and b.user_id = auth.uid()));

create policy "verification_requests_select_own" on public.verification_requests for select using (user_id = auth.uid());
create policy "verification_requests_insert_own" on public.verification_requests for insert with check (user_id = auth.uid());

create policy "voucher_claims_select_own" on public.voucher_claims for select using (user_id = auth.uid());
create policy "voucher_claims_insert_own" on public.voucher_claims for insert with check (user_id = auth.uid());

create policy "subscriptions_select_own" on public.subscriptions for select using (user_id = auth.uid());
create policy "family_members_select_own" on public.family_group_members for select
  using (user_id = auth.uid() or exists (
    select 1 from public.family_groups fg where fg.id = family_group_members.family_group_id and fg.owner_user_id = auth.uid()
  ));

create policy "clinician_targets_select_related" on public.clinician_approved_targets for select
  using (requested_by_user_id = auth.uid() or clinician_user_id = auth.uid());
create policy "clinician_targets_insert_own" on public.clinician_approved_targets for insert with check (requested_by_user_id = auth.uid());
create policy "clinician_targets_review_clinician" on public.clinician_approved_targets for update using (clinician_user_id = auth.uid());

create policy "wearable_connections_manage_own" on public.wearable_connections for all using (user_id = auth.uid());

-- corporate_accounts / corporate_admins / sponsor_users / campaign_reviews / expert
-- payout /admin-only tables: ไม่มี policy ให้ authenticated role ทั่วไปโดยตั้งใจ —
-- เข้าถึงผ่าน service_role (backend/admin panel) เท่านั้น
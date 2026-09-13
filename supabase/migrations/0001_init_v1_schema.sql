-- =====================================================================
-- Challenge Me — Supabase/Postgres migration (V1 / MVP core)
-- แปลงจาก DATABASE-SCHEMA.md §1–§11
--
-- หมายเหตุการปรับให้เข้ากับ Supabase:
--   - Supabase มีระบบ Auth ของตัวเอง (auth.users) จัดการ email/phone/social
--     login, password hash ให้แล้ว จึงไม่สร้างตาราง `users` แยกที่เก็บ
--     password_hash/auth_provider เอง — ใช้ `public.profiles` (1:1 กับ
--     auth.users ผ่าน id เดียวกัน) แทน ซึ่งรวมบทบาทของ `users` +
--     `profiles` ใน DATABASE-SCHEMA.md เข้าด้วยกัน
--   - ทุกตารางเปิด Row Level Security (RLS) ไว้ พร้อม policy พื้นฐาน
--     ที่ตรงกับกฎ privacy ใน Master Concept — ควร review/ปรับละเอียด
--     เพิ่มก่อนขึ้น production จริง (โดยเฉพาะ privacy_fields granular)
-- =====================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- ENUM types
-- ---------------------------------------------------------------------
create type user_status as enum ('ACTIVE', 'SUSPENDED', 'DELETED');
create type app_language as enum ('TH', 'EN');
create type push_permission as enum ('NOBODY', 'SUPPORTERS', 'COMMUNITY');
create type community_badge_type as enum ('EXPERIENCED_HELPER', 'COMMUNITY_GUIDE', 'VERIFIED_PROFESSIONAL', 'EXPERT');
create type badge_granted_by as enum ('SYSTEM', 'ADMIN');

create type challenge_type as enum ('PERSONAL', 'LIFE');
create type measurement_type as enum ('YES_NO', 'COUNT', 'DISTANCE', 'TIME', 'NUMBER', 'SCORE', 'CHECKLIST', 'CUSTOM');
create type checkin_frequency as enum ('DAILY', 'WEEKLY', 'CUSTOM');
create type privacy_level as enum ('PUBLIC', 'SUPPORTERS', 'PRIVATE');
create type challenge_status as enum ('DRAFT', 'ACTIVE', 'NEEDS_PUSH', 'RESCUE', 'NOT_YET', 'COMPLETED');

create type daruma_rarity_tier as enum ('SMALL_7D', 'CLASSIC_30D', 'SPECIAL_100D', 'LEGENDARY_365D', 'CUSTOM');
create type milestone_status as enum ('LOCKED', 'IN_PROGRESS', 'DONE');

create type comment_status as enum ('VISIBLE', 'HIDDEN_BY_OWNER', 'HIDDEN_BY_MOD', 'DELETED');
create type supporter_status as enum ('INVITED', 'ACTIVE', 'MUTED', 'REMOVED');

create type achievement_type as enum (
  'IM_BACK', 'SECOND_TRY', 'NEVER_GIVE_UP', 'FINALLY',
  'CHEER_LEADER', 'MOTIVATOR', 'NEVER_WALK_ALONE', 'RESCUER',
  'HELPING_HAND', 'COMMUNITY_GUIDE_100', 'DARUMA_MAKER'
);
create type share_card_type as enum ('START', 'PROGRESS', 'IM_BACK', 'COMPLETE', 'MILESTONE');

create type help_visibility as enum ('SUPPORTERS', 'COMMUNITY');
create type help_status as enum ('OPEN', 'ANSWERED', 'CLOSED');

create type global_reward_type as enum ('GUARANTEED', 'NONE');
create type global_challenge_status as enum ('DRAFT', 'PUBLISHED', 'CLOSED');
create type participant_status as enum (
  'JOINED', 'ACTIVE', 'COMPLETED', 'REWARD_ISSUED',
  'REWARD_REDEEMED', 'ENDED_NOT_MET', 'CONVERTED_TO_PERSONAL'
);

create type notification_type as enum (
  'CHEER', 'COMMENT', 'MILESTONE', 'PUSH_AGGREGATE', 'RESCUE_TRIGGERED',
  'SUPPORTER_INVITE', 'SUPPORTER_ACCEPTED', 'HELP_REPLY',
  'GLOBAL_REWARD_UNLOCKED', 'DARUMA_EYE_REMINDER'
);
create type report_target_type as enum ('CHALLENGE', 'COMMENT', 'HELP_REPLY', 'USER');
create type report_reason as enum ('SPAM', 'SELLING', 'SHAMING', 'SAFETY', 'HARASSMENT', 'OTHER');
create type report_status as enum ('OPEN', 'REVIEWING', 'ACTIONED', 'DISMISSED');

-- ---------------------------------------------------------------------
-- §2 Core Identity — profiles (แทน users+profiles, ผูกกับ auth.users)
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_url text,
  bio text,
  language app_language not null default 'TH',
  default_push_permission push_permission not null default 'SUPPORTERS',
  notifications_enabled boolean not null default true,
  status user_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.expertise_tags (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  category text not null,
  label text not null,
  created_at timestamptz not null default now()
);
create index idx_expertise_tags_user on public.expertise_tags (user_id);

create table public.community_badges (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  badge community_badge_type not null,
  granted_at timestamptz not null default now(),
  granted_by badge_granted_by not null default 'SYSTEM',
  unique (user_id, badge)
);
create index idx_community_badges_user on public.community_badges (user_id);

-- ---------------------------------------------------------------------
-- §3 Challenge & Daruma
-- ---------------------------------------------------------------------
create table public.challenges (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  type challenge_type not null default 'PERSONAL',
  title text not null,
  description text,
  category text not null,
  goal_description text not null,
  measurement_type measurement_type not null,
  measurement_unit text,
  target_value numeric,
  original_goal_snapshot jsonb,
  checkin_frequency checkin_frequency not null default 'DAILY',
  start_date date not null default current_date,
  planned_end_date date,
  reward_text text,
  privacy_level privacy_level not null default 'PRIVATE',
  privacy_fields jsonb not null default '{
    "show_progress": true, "show_checkins": true, "show_photos": true,
    "show_comments": true, "show_health_data": false
  }'::jsonb,
  push_permission push_permission not null default 'SUPPORTERS',
  status challenge_status not null default 'DRAFT',
  is_global boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_challenges_owner_status on public.challenges (owner_id, status);

create table public.challenge_attempts (
  id uuid primary key default uuid_generate_v4(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  attempt_number int not null default 1,
  status challenge_status not null default 'ACTIVE',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  best_streak int not null default 0,
  created_at timestamptz not null default now(),
  unique (challenge_id, attempt_number)
);
create index idx_attempts_challenge_status on public.challenge_attempts (challenge_id, status);

create table public.daruma (
  id uuid primary key default uuid_generate_v4(),
  challenge_id uuid not null unique references public.challenges (id) on delete cascade,
  left_eye_filled_at timestamptz,
  right_eye_filled_at timestamptz,
  rarity_tier daruma_rarity_tier,
  is_limited_sponsor_edition boolean not null default false,
  sponsor_edition_ref text,
  kintsugi_variant boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.milestones (
  id uuid primary key default uuid_generate_v4(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  daruma_id uuid references public.daruma (id) on delete set null,
  title text not null,
  target_description text,
  order_index int not null default 0,
  status milestone_status not null default 'LOCKED',
  completed_at timestamptz
);
create index idx_milestones_challenge on public.milestones (challenge_id, order_index);

create table public.extensions (
  id uuid primary key default uuid_generate_v4(),
  challenge_attempt_id uuid not null references public.challenge_attempts (id) on delete cascade,
  days_added int not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- §4 Check-ins & Progress
-- ---------------------------------------------------------------------
create table public.check_ins (
  id uuid primary key default uuid_generate_v4(),
  challenge_attempt_id uuid not null references public.challenge_attempts (id) on delete cascade,
  checkin_date date not null,
  value_bool boolean,
  value_number numeric,
  value_checklist jsonb,
  note text,
  media_url text,
  created_at timestamptz not null default now(),
  unique (challenge_attempt_id, checkin_date)
);
create index idx_checkins_attempt_date on public.check_ins (challenge_attempt_id, checkin_date);

-- ---------------------------------------------------------------------
-- §5 Social layer
-- ---------------------------------------------------------------------
create table public.cheers (
  id uuid primary key default uuid_generate_v4(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (challenge_id, user_id)
);
create index idx_cheers_challenge on public.cheers (challenge_id);

create table public.comments (
  id uuid primary key default uuid_generate_v4(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  status comment_status not null default 'VISIBLE',
  created_at timestamptz not null default now()
);
create index idx_comments_challenge_created on public.comments (challenge_id, created_at);

create table public.supporters (
  id uuid primary key default uuid_generate_v4(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  invited_by uuid not null references public.profiles (id),
  status supporter_status not null default 'INVITED',
  visibility_scope jsonb,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (challenge_id, user_id)
);
create index idx_supporters_user_status on public.supporters (user_id, status);
create index idx_supporters_challenge_status on public.supporters (challenge_id, status);

create table public.push_events (
  id uuid primary key default uuid_generate_v4(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  challenge_attempt_id uuid not null references public.challenge_attempts (id) on delete cascade,
  pusher_user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index idx_push_events_attempt_created on public.push_events (challenge_attempt_id, created_at);
-- Rate-limit (1 push ต่อคนต่อ attempt ต่อ 24 ชม.) enforce ที่ application layer
-- (ตรวจ push_events ล่าสุดของ pusher ก่อน insert) ตาม FR12.5

create table public.rescue_states (
  id uuid primary key default uuid_generate_v4(),
  challenge_attempt_id uuid not null references public.challenge_attempts (id) on delete cascade,
  triggered_at timestamptz not null default now(),
  resolved_at timestamptz,
  push_count_at_trigger int not null default 0
);
create unique index uq_rescue_active_attempt on public.rescue_states (challenge_attempt_id) where resolved_at is null;

-- ---------------------------------------------------------------------
-- §6 Achievements & Sharing
-- ---------------------------------------------------------------------
create table public.achievements (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type achievement_type not null,
  related_challenge_id uuid references public.challenges (id) on delete set null,
  earned_at timestamptz not null default now()
);
create index idx_achievements_user on public.achievements (user_id);

create table public.share_cards (
  id uuid primary key default uuid_generate_v4(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  type share_card_type not null,
  image_url text,
  deep_link text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- §7 Community Help (free)
-- ---------------------------------------------------------------------
create table public.help_requests (
  id uuid primary key default uuid_generate_v4(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  requester_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  visibility help_visibility not null default 'COMMUNITY',
  status help_status not null default 'OPEN',
  created_at timestamptz not null default now()
);
create index idx_help_requests_status_visibility on public.help_requests (status, visibility, created_at);

create table public.help_replies (
  id uuid primary key default uuid_generate_v4(),
  help_request_id uuid not null references public.help_requests (id) on delete cascade,
  helper_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  marked_helpful boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- §8 Global Challenge (participant-facing, V1)
-- ---------------------------------------------------------------------
create table public.sponsors (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  logo_url text,
  contact_email text
);

create table public.global_challenges (
  id uuid primary key default uuid_generate_v4(),
  sponsor_id uuid references public.sponsors (id) on delete set null,
  title text not null,
  description text not null,
  category text not null,
  goal_description text not null,
  measurement_type measurement_type not null,
  target_value numeric,
  start_date date not null,
  end_date date not null,
  capacity int,
  eligibility_rules jsonb,
  reward_text text not null,
  reward_type global_reward_type not null default 'GUARANTEED',
  has_limited_daruma boolean not null default false,
  limited_daruma_total int,
  limited_daruma_claimed int not null default 0,
  terms_url text,
  status global_challenge_status not null default 'DRAFT',
  created_at timestamptz not null default now(),
  constraint chk_reward_not_raffle check (reward_type in ('GUARANTEED', 'NONE'))
);

create table public.global_challenge_participants (
  id uuid primary key default uuid_generate_v4(),
  global_challenge_id uuid not null references public.global_challenges (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  challenge_attempt_id uuid not null unique references public.challenge_attempts (id) on delete cascade,
  consent_accepted_at timestamptz not null default now(),
  status participant_status not null default 'JOINED',
  reward_code text,
  converted_challenge_id uuid references public.challenges (id) on delete set null,
  joined_at timestamptz not null default now(),
  unique (global_challenge_id, user_id)
);
create index idx_gcp_global_status on public.global_challenge_participants (global_challenge_id, status);

-- ---------------------------------------------------------------------
-- §9 Notifications, Reports & Moderation
-- ---------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type notification_type not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_notifications_user_read on public.notifications (user_id, read_at);

create table public.reports (
  id uuid primary key default uuid_generate_v4(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type report_target_type not null,
  target_id uuid not null,
  reason report_reason not null,
  detail text,
  status report_status not null default 'OPEN',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table public.blocks (
  id uuid primary key default uuid_generate_v4(),
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id)
);

-- ---------------------------------------------------------------------
-- updated_at auto-touch trigger (ใช้ร่วมกันหลายตาราง)
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger trg_challenges_touch before update on public.challenges
  for each row execute function public.touch_updated_at();

-- =====================================================================
-- Row Level Security — policy พื้นฐาน (ควร review เพิ่มก่อน production)
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.expertise_tags enable row level security;
alter table public.community_badges enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_attempts enable row level security;
alter table public.daruma enable row level security;
alter table public.milestones enable row level security;
alter table public.extensions enable row level security;
alter table public.check_ins enable row level security;
alter table public.cheers enable row level security;
alter table public.comments enable row level security;
alter table public.supporters enable row level security;
alter table public.push_events enable row level security;
alter table public.rescue_states enable row level security;
alter table public.achievements enable row level security;
alter table public.share_cards enable row level security;
alter table public.help_requests enable row level security;
alter table public.help_replies enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;
alter table public.blocks enable row level security;

-- profiles: ทุกคน read โปรไฟล์สาธารณะพื้นฐานได้ (ชื่อ/avatar), แก้ไขได้เฉพาะของตัวเอง
create policy "profiles_select_all" on public.profiles for select using (true);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

-- challenges: เจ้าของเห็น/แก้ของตัวเองเสมอ; คนอื่นเห็นได้เฉพาะที่ privacy_level = PUBLIC
-- และไม่ใช่ DRAFT (ตาม FR7.2 — Challenge ที่ยังไม่เติมตาแรกต้องไม่โชว์สาธารณะ)
create policy "challenges_select_own" on public.challenges for select
  using (owner_id = auth.uid());
create policy "challenges_select_public" on public.challenges for select
  using (privacy_level = 'PUBLIC' and status <> 'DRAFT');
create policy "challenges_select_supporter" on public.challenges for select
  using (
    privacy_level in ('PUBLIC', 'SUPPORTERS') and status <> 'DRAFT'
    and exists (
      select 1 from public.supporters s
      where s.challenge_id = challenges.id and s.user_id = auth.uid() and s.status = 'ACTIVE'
    )
  );
create policy "challenges_insert_own" on public.challenges for insert with check (owner_id = auth.uid());
create policy "challenges_update_own" on public.challenges for update using (owner_id = auth.uid());

-- daruma/milestones/check_ins/extensions: มองผ่านสิทธิ์ของ challenge ที่ผูกอยู่
create policy "daruma_select_via_challenge" on public.daruma for select
  using (exists (
    select 1 from public.challenges c
    where c.id = daruma.challenge_id
      and (c.owner_id = auth.uid() or (c.privacy_level = 'PUBLIC' and c.status <> 'DRAFT'))
  ));
create policy "daruma_update_owner_only" on public.daruma for update
  using (exists (select 1 from public.challenges c where c.id = daruma.challenge_id and c.owner_id = auth.uid()));

create policy "checkins_select_via_challenge" on public.check_ins for select
  using (exists (
    select 1 from public.challenge_attempts ca join public.challenges c on c.id = ca.challenge_id
    where ca.id = check_ins.challenge_attempt_id
      and (c.owner_id = auth.uid() or (c.privacy_level = 'PUBLIC' and coalesce((c.privacy_fields->>'show_checkins')::boolean, true)))
  ));
create policy "checkins_write_owner_only" on public.check_ins for all
  using (exists (
    select 1 from public.challenge_attempts ca join public.challenges c on c.id = ca.challenge_id
    where ca.id = check_ins.challenge_attempt_id and c.owner_id = auth.uid()
  ));

-- cheers: ใครก็ cheer ได้ (toggle เขียน/ลบแถวของตัวเอง), read ตามสิทธิ์เห็น challenge
create policy "cheers_select_via_challenge" on public.cheers for select
  using (exists (
    select 1 from public.challenges c
    where c.id = cheers.challenge_id and (c.owner_id = auth.uid() or c.privacy_level = 'PUBLIC')
  ));
create policy "cheers_insert_own" on public.cheers for insert with check (user_id = auth.uid());
create policy "cheers_delete_own" on public.cheers for delete using (user_id = auth.uid());

-- comments: เขียนได้ถ้า login, ลบ/แก้ได้เฉพาะของตัวเอง, เจ้าของ challenge hide ได้ (ผ่าน update status)
create policy "comments_select_via_challenge" on public.comments for select
  using (exists (
    select 1 from public.challenges c
    where c.id = comments.challenge_id
      and (c.owner_id = auth.uid() or (c.privacy_level = 'PUBLIC' and coalesce((c.privacy_fields->>'show_comments')::boolean, true)))
  ));
create policy "comments_insert_own" on public.comments for insert with check (user_id = auth.uid());
create policy "comments_update_own_or_owner" on public.comments for update
  using (user_id = auth.uid() or exists (select 1 from public.challenges c where c.id = comments.challenge_id and c.owner_id = auth.uid()));

-- supporters: เจ้าของ challenge และตัว supporter เองเห็น/แก้ record ได้
--
-- หมายเหตุสำคัญ: ห้าม subquery ตรงไปที่ public.challenges ในนี้ เพราะ
-- policy "challenges_select_supporter" ด้านบน query กลับมาที่ public.supporters
-- อยู่แล้ว — ถ้า supporters policy query กลับไป challenges ตรงๆ จะเกิด
-- infinite recursion (Postgres ขึ้น error "infinite recursion detected in
-- policy for relation challenges"). ใช้ฟังก์ชัน SECURITY DEFINER ด้านล่างนี้
-- แทน เพื่อให้การเช็ค owner ไม่ต้องผ่าน RLS ของ challenges อีกรอบ
create or replace function public.is_challenge_owner(p_challenge_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.challenges c
    where c.id = p_challenge_id and c.owner_id = auth.uid()
  );
$$;

grant execute on function public.is_challenge_owner(uuid) to authenticated;

create policy "supporters_select" on public.supporters for select
  using (user_id = auth.uid() or invited_by = auth.uid() or public.is_challenge_owner(challenge_id));
create policy "supporters_insert_owner" on public.supporters for insert
  with check (public.is_challenge_owner(challenge_id));
create policy "supporters_update_self_or_owner" on public.supporters for update
  using (user_id = auth.uid() or public.is_challenge_owner(challenge_id));

-- notifications: เจ้าของ notification เท่านั้น
create policy "notifications_select_own" on public.notifications for select using (user_id = auth.uid());
create policy "notifications_update_own" on public.notifications for update using (user_id = auth.uid());

-- help_requests / help_replies: อ่านตาม visibility, เขียนได้ถ้า login
create policy "help_requests_select" on public.help_requests for select
  using (
    requester_id = auth.uid()
    or visibility = 'COMMUNITY'
    or (visibility = 'SUPPORTERS' and exists (
      select 1 from public.supporters s where s.challenge_id = help_requests.challenge_id and s.user_id = auth.uid() and s.status = 'ACTIVE'
    ))
  );
create policy "help_requests_insert_own" on public.help_requests for insert with check (requester_id = auth.uid());
create policy "help_replies_select_via_request" on public.help_replies for select using (true);
create policy "help_replies_insert_own" on public.help_replies for insert with check (helper_id = auth.uid());

-- global_challenges: อ่านได้ทุกคนถ้า PUBLISHED, เขียนเฉพาะ service role (แอดมิน) — ไม่มี policy insert/update ให้ user ทั่วไปโดยตั้งใจ
create policy "global_challenges_select_published" on public.global_challenges for select using (status = 'PUBLISHED');

create policy "gcp_select_own" on public.global_challenge_participants for select using (user_id = auth.uid());
create policy "gcp_insert_own" on public.global_challenge_participants for insert with check (user_id = auth.uid());

-- reports/blocks: ผู้ใช้จัดการของตัวเองเท่านั้น
create policy "reports_insert_own" on public.reports for insert with check (reporter_id = auth.uid());
create policy "reports_select_own" on public.reports for select using (reporter_id = auth.uid());
create policy "blocks_manage_own" on public.blocks for all using (blocker_id = auth.uid());

-- achievements/share_cards/expertise_tags/community_badges: read เปิดกว้าง (ใช้แสดง public profile/collection), เขียนควบคุมที่ backend/service role
create policy "achievements_select_all" on public.achievements for select using (true);
create policy "share_cards_select_via_challenge" on public.share_cards for select
  using (exists (select 1 from public.challenges c where c.id = share_cards.challenge_id and (c.owner_id = auth.uid() or c.privacy_level = 'PUBLIC')));
create policy "expertise_tags_select_all" on public.expertise_tags for select using (true);
create policy "expertise_tags_manage_own" on public.expertise_tags for all using (user_id = auth.uid());
create policy "community_badges_select_all" on public.community_badges for select using (true);

-- push_events / rescue_states / milestones / extensions / challenge_attempts:
-- อ่านผ่านสิทธิ์ของ challenge เดียวกับ daruma
create policy "attempts_select_via_challenge" on public.challenge_attempts for select
  using (exists (select 1 from public.challenges c where c.id = challenge_attempts.challenge_id and (c.owner_id = auth.uid() or c.privacy_level = 'PUBLIC')));
create policy "attempts_write_owner" on public.challenge_attempts for all
  using (exists (select 1 from public.challenges c where c.id = challenge_attempts.challenge_id and c.owner_id = auth.uid()));

create policy "milestones_select_via_challenge" on public.milestones for select
  using (exists (select 1 from public.challenges c where c.id = milestones.challenge_id and (c.owner_id = auth.uid() or c.privacy_level = 'PUBLIC')));
create policy "milestones_write_owner" on public.milestones for all
  using (exists (select 1 from public.challenges c where c.id = milestones.challenge_id and c.owner_id = auth.uid()));

create policy "push_events_select_via_challenge" on public.push_events for select
  using (exists (select 1 from public.challenges c where c.id = push_events.challenge_id and (c.owner_id = auth.uid() or c.push_permission <> 'NOBODY')));
create policy "push_events_insert_permitted" on public.push_events for insert
  with check (
    pusher_user_id = auth.uid()
    and exists (
      select 1 from public.challenges c
      where c.id = push_events.challenge_id
        and c.push_permission <> 'NOBODY'
        and c.owner_id <> auth.uid()
    )
  );

create policy "rescue_states_select_via_challenge" on public.rescue_states for select
  using (exists (
    select 1 from public.challenge_attempts ca join public.challenges c on c.id = ca.challenge_id
    where ca.id = rescue_states.challenge_attempt_id and (c.owner_id = auth.uid() or c.push_permission <> 'NOBODY')
  ));

create policy "extensions_select_via_challenge" on public.extensions for select
  using (exists (
    select 1 from public.challenge_attempts ca join public.challenges c on c.id = ca.challenge_id
    where ca.id = extensions.challenge_attempt_id and c.owner_id = auth.uid()
  ));

-- NOTE: policy ด้านบนเป็น baseline ให้ query หลักใน MVP ทำงานได้ปลอดภัยขั้นต่ำ
-- ก่อน production ควรเพิ่ม: การเช็ค privacy_fields แบบละเอียดทุก field (ไม่ใช่แค่
-- show_checkins/show_comments), นโยบายสำหรับ moderator/admin role, และ rate-limit
-- ระดับ DB (เช่น ใช้ Postgres function + trigger แทน check ฝั่ง client อย่างเดียว)
-- สำหรับ push_events ตาม FR12.5
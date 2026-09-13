-- 0004_challenge_invites.sql
-- ฟีเจอร์ใหม่: "ท้าเพื่อน" (Challenge a Friend) — ตาม feedback ของผู้ใช้
--   1) เชิญเพื่อนที่มีบัญชีในระบบแล้วโดยตรง (channel = IN_APP) — เข้าคิวใน
--      Community inbox ของเพื่อน ต้องกด "ตอบรับ" ก่อนถึงจะเริ่ม Challenge ของ
--      ตัวเอง (clone จาก Challenge ต้นทาง)
--   2) สร้างลิงก์สาธารณะที่แชร์ได้ทุกที่ (เช่นโพสต์ลง Facebook แล้วผู้ใช้พิมพ์
--      แท็กเพื่อนเอง) — ใครก็กดลิงก์รับคำท้าได้แม้ยังไม่เคยใช้แอปมาก่อน
--      (channel = LINK, ไม่ผูกกับผู้รับเจาะจงคนเดียว ใช้ซ้ำได้เรื่อย ๆ)
--
-- หมายเหตุสำคัญเรื่อง RLS: ห้ามให้ policy ของตาราง challenge_invites หรือ
-- ตารางที่เกี่ยวข้อง query กลับไปที่ public.challenges ตรง ๆ แบบ subquery ปกติ
-- เพราะจะไปชนกับ policy "challenges_select_supporter" (ดู 0001) ซ้ำรอย
-- infinite recursion เดิม — ใช้ฟังก์ชัน public.is_challenge_owner(uuid) ที่
-- สร้างไว้แล้ว (SECURITY DEFINER, bypass RLS) แทนเสมอ

-- ---------------------------------------------------------------------
-- 1) เพิ่ม notification_type ใหม่สำหรับฟีเจอร์นี้
-- ---------------------------------------------------------------------
alter type notification_type add value if not exists 'CHALLENGE_INVITE';
alter type notification_type add value if not exists 'CHALLENGE_INVITE_ACCEPTED';

-- ---------------------------------------------------------------------
-- 2) ทุก challenge มี token สาธารณะติดตัวเสมอ (สุ่มตอนสร้างแถว) — ใช้ทำ
--    ลิงก์ "ท้าเพื่อน" แบบ LINK โดยไม่ต้องกดปุ่มสร้างเพิ่มทีหลัง
-- ---------------------------------------------------------------------
alter table public.challenges
  add column if not exists public_invite_token uuid not null default gen_random_uuid();

create unique index if not exists idx_challenges_public_invite_token
  on public.challenges (public_invite_token);

-- ---------------------------------------------------------------------
-- 3) ตาราง challenge_invites — ใช้เป็นทั้งกล่องคำเชิญ IN_APP และ log
--    ประวัติการรับคำท้าทุกช่องทาง (สำหรับแจ้งเตือนเจ้าของ + วิเคราะห์ภายหลัง)
-- ---------------------------------------------------------------------
create table if not exists public.challenge_invites (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  inviter_id uuid not null references public.profiles (id) on delete cascade,
  invitee_user_id uuid references public.profiles (id) on delete cascade, -- null สำหรับ LINK
  channel text not null default 'IN_APP' check (channel in ('IN_APP', 'LINK')),
  message text,
  status text not null default 'PENDING' check (status in ('PENDING', 'ACCEPTED', 'DECLINED')),
  resulting_challenge_id uuid references public.challenges (id) on delete set null,
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

create index if not exists idx_challenge_invites_invitee on public.challenge_invites (invitee_user_id, status);
create index if not exists idx_challenge_invites_challenge on public.challenge_invites (challenge_id);

alter table public.challenge_invites enable row level security;

drop policy if exists "challenge_invites_select" on public.challenge_invites;
create policy "challenge_invites_select" on public.challenge_invites for select
  using (inviter_id = auth.uid() or invitee_user_id = auth.uid() or public.is_challenge_owner(challenge_id));

drop policy if exists "challenge_invites_insert_owner" on public.challenge_invites;
create policy "challenge_invites_insert_owner" on public.challenge_invites for insert
  with check (inviter_id = auth.uid() and public.is_challenge_owner(challenge_id));

-- อัปเดตแถวได้เฉพาะฝั่งที่เกี่ยวข้องโดยตรง (การ accept/decline จริงทำผ่าน
-- ฟังก์ชัน SECURITY DEFINER ด้านล่าง ไม่ได้พึ่ง policy นี้โดยตรง แต่เผื่อไว้
-- สำหรับกรณี inviter ต้องการยกเลิกคำเชิญที่ยังไม่ตอบ)
drop policy if exists "challenge_invites_update_related" on public.challenge_invites;
create policy "challenge_invites_update_related" on public.challenge_invites for update
  using (invitee_user_id = auth.uid() or inviter_id = auth.uid());

-- ---------------------------------------------------------------------
-- 4) ฟังก์ชันสาธารณะ: ดูตัวอย่างคำท้าจาก token (ใช้กับหน้า Landing +
--    preview ตอนแชร์ลิงก์) — bypass RLS เพราะต้องเปิดให้คนที่ยังไม่ login
--    หรือยังไม่เคยใช้แอปเลยก็เห็นตัวอย่างได้
-- ---------------------------------------------------------------------
create or replace function public.get_invite_preview(p_token uuid)
returns table (
  challenge_id uuid,
  title text,
  goal_description text,
  reward_text text,
  category text,
  type challenge_type,
  inviter_display_name text
)
language sql
security definer
set search_path = public
stable
as $$
  select c.id, c.title, c.goal_description, c.reward_text, c.category, c.type, p.display_name
  from public.challenges c
  join public.profiles p on p.id = c.owner_id
  where c.public_invite_token = p_token;
$$;

grant execute on function public.get_invite_preview(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 5) รับคำท้าจากลิงก์สาธารณะ (LINK) — clone challenge ต้นทางให้ผู้กดลิงก์
--    เป็นเจ้าของ challenge ใหม่ของตัวเอง (คนละแถวกับต้นทาง แยก Daruma/
--    progress กันคนละคน) แล้ว log ไว้ + แจ้งเตือนเจ้าของเดิม
-- ---------------------------------------------------------------------
create or replace function public.accept_challenge_invite(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  src public.challenges%rowtype;
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'ต้อง login ก่อนรับคำท้า';
  end if;

  select * into src from public.challenges where public_invite_token = p_token;
  if not found then
    raise exception 'ลิงก์คำท้านี้ไม่ถูกต้องหรือหมดอายุแล้ว';
  end if;

  insert into public.challenges (
    owner_id, type, title, category, goal_description, measurement_type,
    measurement_unit, target_value, checkin_frequency, reward_text,
    privacy_level, privacy_fields, push_permission, status
  ) values (
    auth.uid(), src.type, src.title, src.category, src.goal_description, src.measurement_type,
    src.measurement_unit, src.target_value, src.checkin_frequency, src.reward_text,
    'PRIVATE', src.privacy_fields, src.push_permission, 'DRAFT'
  ) returning id into new_id;

  insert into public.daruma (challenge_id) values (new_id);
  insert into public.challenge_attempts (challenge_id, attempt_number, status) values (new_id, 1, 'ACTIVE');

  insert into public.challenge_invites (
    challenge_id, inviter_id, invitee_user_id, channel, status, resulting_challenge_id, responded_at
  ) values (
    src.id, src.owner_id, auth.uid(), 'LINK', 'ACCEPTED', new_id, now()
  );

  if src.owner_id <> auth.uid() then
    insert into public.notifications (user_id, type, payload)
    values (
      src.owner_id, 'CHALLENGE_INVITE_ACCEPTED',
      jsonb_build_object('challenge_id', src.id, 'challenge_title', src.title, 'accepted_by', auth.uid())
    );
  end if;

  return new_id;
end;
$$;

grant execute on function public.accept_challenge_invite(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 6) ชวนเพื่อนที่มีบัญชีในระบบแล้วโดยตรง (IN_APP) — เฉพาะเจ้าของ Challenge
--    เท่านั้นที่เรียกได้ (เช็คซ้ำในฟังก์ชันแม้จะ SECURITY DEFINER)
-- ---------------------------------------------------------------------
create or replace function public.invite_friend_to_challenge(
  p_challenge_id uuid,
  p_invitee_user_id uuid,
  p_message text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_invite_id uuid;
  challenge_title text;
begin
  if not exists (
    select 1 from public.challenges c where c.id = p_challenge_id and c.owner_id = auth.uid()
  ) then
    raise exception 'คุณไม่ใช่เจ้าของ Challenge นี้';
  end if;

  if p_invitee_user_id = auth.uid() then
    raise exception 'ท้าตัวเองไม่ได้ ลองชวนเพื่อนคนอื่นดูนะ';
  end if;

  select title into challenge_title from public.challenges where id = p_challenge_id;

  insert into public.challenge_invites (challenge_id, inviter_id, invitee_user_id, channel, message, status)
  values (p_challenge_id, auth.uid(), p_invitee_user_id, 'IN_APP', p_message, 'PENDING')
  returning id into new_invite_id;

  insert into public.notifications (user_id, type, payload)
  values (
    p_invitee_user_id, 'CHALLENGE_INVITE',
    jsonb_build_object(
      'invite_id', new_invite_id, 'challenge_id', p_challenge_id,
      'challenge_title', challenge_title, 'from_user_id', auth.uid()
    )
  );

  return new_invite_id;
end;
$$;

grant execute on function public.invite_friend_to_challenge(uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- 7) ตอบรับ/ปฏิเสธคำเชิญแบบ IN_APP (จากกล่องคำเชิญใน Community)
-- ---------------------------------------------------------------------
create or replace function public.respond_to_challenge_invite(p_invite_id uuid, p_accept boolean)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.challenge_invites%rowtype;
  src public.challenges%rowtype;
  new_id uuid;
begin
  select * into inv from public.challenge_invites where id = p_invite_id;
  if not found then
    raise exception 'ไม่พบคำเชิญนี้';
  end if;
  if inv.invitee_user_id is distinct from auth.uid() then
    raise exception 'คำเชิญนี้ไม่ใช่ของคุณ';
  end if;
  if inv.status <> 'PENDING' then
    raise exception 'คำเชิญนี้ถูกตอบไปแล้ว';
  end if;

  if not p_accept then
    update public.challenge_invites set status = 'DECLINED', responded_at = now() where id = p_invite_id;
    return null;
  end if;

  select * into src from public.challenges where id = inv.challenge_id;

  insert into public.challenges (
    owner_id, type, title, category, goal_description, measurement_type,
    measurement_unit, target_value, checkin_frequency, reward_text,
    privacy_level, privacy_fields, push_permission, status
  ) values (
    auth.uid(), src.type, src.title, src.category, src.goal_description, src.measurement_type,
    src.measurement_unit, src.target_value, src.checkin_frequency, src.reward_text,
    'PRIVATE', src.privacy_fields, src.push_permission, 'DRAFT'
  ) returning id into new_id;

  insert into public.daruma (challenge_id) values (new_id);
  insert into public.challenge_attempts (challenge_id, attempt_number, status) values (new_id, 1, 'ACTIVE');

  update public.challenge_invites
    set status = 'ACCEPTED', responded_at = now(), resulting_challenge_id = new_id
    where id = p_invite_id;

  insert into public.notifications (user_id, type, payload)
  values (
    inv.inviter_id, 'CHALLENGE_INVITE_ACCEPTED',
    jsonb_build_object('challenge_id', inv.challenge_id, 'challenge_title', src.title, 'accepted_by', auth.uid())
  );

  return new_id;
end;
$$;

grant execute on function public.respond_to_challenge_invite(uuid, boolean) to authenticated;

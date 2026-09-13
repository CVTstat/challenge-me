-- 0011_notifications.sql
--
-- ทำให้ระบบแจ้งเตือน "เรื่องที่เกี่ยวข้องกับเรา" ใช้งานได้จริง
--
-- สิ่งที่มีอยู่แล้ว (ไม่ได้สร้างใหม่ — ต่อยอดของเดิม):
--   • ตาราง public.notifications (จาก 0001) เก็บ user_id / type / payload jsonb
--   • enum notification_type พร้อมค่าที่ครอบคลุมอยู่แล้ว
--   • 0004 สร้างการแจ้งเตือนตอน "มีคนท้าเรา" และ "เพื่อนรับคำท้า" ไว้แล้ว
--
-- สิ่งที่ยังขาดและเพิ่มในไฟล์นี้:
--   1. คอลัมน์ delivered_at — ไว้จำว่าส่งออกทาง LINE ไปแล้วหรือยัง (กันส่งซ้ำ)
--   2. trigger สำหรับเหตุการณ์ที่ยังไม่เคยแจ้งเตือน: ได้กำลังใจ / มีคนตอบคำถาม /
--      ได้แรงผลักดัน / มีคนตอบรับเป็นผู้สนับสนุน
--   3. ฟังก์ชันสำหรับตัวส่ง LINE ไปดึงรายการที่ยังไม่ได้ส่ง
--
-- หมายเหตุเรื่อง "ด่วน/ไม่ด่วน": จงใจไม่เก็บเป็นคอลัมน์ แต่ตัดสินจาก type
-- ตอนจะส่ง (ดู notifications_pending_delivery ด้านล่าง) เพราะการแจ้งเตือนที่
-- 0004 สร้างไว้ก่อนหน้าจะได้ถูกจัดประเภทถูกต้องไปด้วยโดยไม่ต้องแก้ของเก่า

-- ── 1. คอลัมน์สำหรับชั้นส่งออก ────────────────────────────────────────────
alter table public.notifications add column if not exists delivered_at timestamptz;

create index if not exists idx_notifications_pending_delivery
  on public.notifications (delivered_at, created_at)
  where delivered_at is null;

-- ลบของตัวเองได้ (ของเดิมมีแค่ select/update)
drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_delete_own" on public.notifications for delete
  using (user_id = auth.uid());

-- ── 2. ตัวช่วยสร้างการแจ้งเตือน ───────────────────────────────────────────
-- security definer = ทำงานด้วยสิทธิ์เจ้าของฟังก์ชัน จึงข้าม RLS ได้
-- จำเป็นจริง ๆ เพราะ "คนกดให้กำลังใจ" ต้องสร้างแถวในกล่องของ "เจ้าของ
-- Challenge" ซึ่งไม่ใช่ตัวเอง ถ้าไม่ใช้วิธีนี้ต้องเปิด insert policy กว้าง ๆ
-- ให้ใครก็ยัดข้อความเข้ากล่องคนอื่นได้ ซึ่งเป็นช่องโหว่
create or replace function public.push_notification(
  p_user_id uuid,
  p_type notification_type,
  p_actor_id uuid,
  p_payload jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- ไม่เตือนตัวเองเวลาทำอะไรกับของตัวเอง
  if p_user_id is null or p_user_id = p_actor_id then
    return;
  end if;

  -- เคารพสวิตช์ปิดแจ้งเตือนของผู้ใช้ (profiles.notifications_enabled)
  if not exists (
    select 1 from public.profiles where id = p_user_id and notifications_enabled
  ) then
    return;
  end if;

  insert into public.notifications (user_id, type, payload)
  values (
    p_user_id,
    p_type,
    p_payload || jsonb_build_object(
      'from_user_id', p_actor_id,
      'from_name', coalesce(
        (select display_name from public.profiles where id = p_actor_id),
        'เพื่อนคนหนึ่ง'
      )
    )
  );
end $$;

-- ── 3. trigger สำหรับเหตุการณ์ที่ยังไม่เคยแจ้งเตือน ──────────────────────

-- 3.1 มีคนส่งกำลังใจให้ Challenge ของเรา
create or replace function public.notify_on_cheer() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_owner uuid;
  v_title text;
begin
  select owner_id, title into v_owner, v_title from public.challenges where id = new.challenge_id;
  perform public.push_notification(
    v_owner, 'CHEER', new.user_id,
    jsonb_build_object('challenge_id', new.challenge_id, 'challenge_title', v_title)
  );
  return new;
end $$;

drop trigger if exists trg_notify_on_cheer on public.cheers;
create trigger trg_notify_on_cheer after insert on public.cheers
  for each row execute function public.notify_on_cheer();

-- 3.2 มีคนมาตอบคำถามที่เราถามชุมชนไว้
create or replace function public.notify_on_help_reply() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_requester uuid;
  v_challenge uuid;
begin
  select requester_id, challenge_id into v_requester, v_challenge
  from public.help_requests where id = new.help_request_id;
  perform public.push_notification(
    v_requester, 'HELP_REPLY', new.helper_id,
    jsonb_build_object(
      'help_request_id', new.help_request_id,
      'challenge_id', v_challenge,
      'text', left(new.body, 120)
    )
  );
  return new;
end $$;

drop trigger if exists trg_notify_on_help_reply on public.help_replies;
create trigger trg_notify_on_help_reply after insert on public.help_replies
  for each row execute function public.notify_on_help_reply();

-- 3.3 มีคนส่งแรงผลักดันมาให้ (ตอน Challenge กำลังจะหลุด)
create or replace function public.notify_on_push_event() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_owner uuid;
  v_title text;
begin
  select owner_id, title into v_owner, v_title from public.challenges where id = new.challenge_id;
  perform public.push_notification(
    v_owner, 'PUSH_AGGREGATE', new.pusher_user_id,
    jsonb_build_object('challenge_id', new.challenge_id, 'challenge_title', v_title)
  );
  return new;
end $$;

drop trigger if exists trg_notify_on_push_event on public.push_events;
create trigger trg_notify_on_push_event after insert on public.push_events
  for each row execute function public.notify_on_push_event();

-- 3.4 มีคนตอบรับคำเชิญเป็นผู้สนับสนุนของเรา
--
-- ระวัง: สถานะ "ตอบรับแล้ว" ของตาราง supporters คือ 'ACTIVE' ไม่ใช่ 'ACCEPTED'
-- (enum supporter_status = INVITED / ACTIVE / MUTED / REMOVED ตั้งแต่ 0001)
-- ถ้าเทียบกับ 'ACCEPTED' จะพังทันทีเพราะไม่ใช่ค่าที่มีอยู่ใน enum
create or replace function public.notify_on_supporter_accepted() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_owner uuid;
  v_title text;
begin
  if new.status <> 'ACTIVE' or old.status = 'ACTIVE' then
    return new;
  end if;
  select owner_id, title into v_owner, v_title from public.challenges where id = new.challenge_id;
  perform public.push_notification(
    v_owner, 'SUPPORTER_ACCEPTED', new.user_id,
    jsonb_build_object('challenge_id', new.challenge_id, 'challenge_title', v_title)
  );
  return new;
end $$;

drop trigger if exists trg_notify_on_supporter_accepted on public.supporters;
create trigger trg_notify_on_supporter_accepted after update on public.supporters
  for each row execute function public.notify_on_supporter_accepted();

-- หมายเหตุ: ฟังก์ชันสำหรับ "ดึงรายการที่รอส่งออกทาง LINE" อยู่ใน 0012
-- เพราะต้องใช้คอลัมน์ line_user_id ที่เพิ่มในไฟล์นั้น — ไฟล์นี้ทำงานได้ด้วย
-- ตัวเองโดยไม่ต้องพึ่ง LINE เลย (กระดิ่งแจ้งเตือนในแอปใช้ได้ทันที)

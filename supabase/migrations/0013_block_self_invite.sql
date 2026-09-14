-- 0013 — ห้ามรับคำท้าของตัวเอง
--
-- ที่มา: ลิงก์ "ท้าเพื่อน" เปิดให้ใครกดก็ได้ รวมถึงเจ้าของคำท้าเอง ถ้าเจ้าของกด
-- ระบบจะโคลนคำท้าของตัวเองขึ้นมาอีกใบเงียบ ๆ ได้ดารุมะเพิ่มอีกตัว กลายเป็นว่า
-- ใครก็ปั๊มใบไม้ให้ตัวเองได้ไม่จำกัดโดยไม่ต้องทำอะไรสำเร็จเลยสักอย่าง
-- ซึ่งขัดกับหลักของแอปที่ว่า "ใบไม้ขึ้นเพราะสิ่งที่ทำสำเร็จจริงเท่านั้น"
--
-- ช่องทาง IN_APP กันไว้อยู่แล้วตั้งแต่ 0004 (invite_friend_to_challenge)
-- ไฟล์นี้ปิดช่องที่เหลือคือช่องทาง LINK

-- ---------------------------------------------------------------------
-- 1) กันที่ฐานข้อมูล — ด่านจริง
--    ต้องกันตรงนี้ ไม่ใช่แค่ซ่อนปุ่มในแอป เพราะใครก็ยิง API ตรงเข้ามาได้
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

  if src.owner_id = auth.uid() then
    raise exception 'นี่คือคำท้าของคุณเอง — ส่งลิงก์นี้ให้เพื่อนแทนได้เลย';
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

  -- ถึงตรงนี้ผู้รับไม่ใช่เจ้าของแน่นอนแล้ว (กันไว้ด้านบน) จึงแจ้งเตือนได้เลย
  insert into public.notifications (user_id, type, payload)
  values (
    src.owner_id, 'CHALLENGE_INVITE_ACCEPTED',
    jsonb_build_object('challenge_id', src.id, 'challenge_title', src.title, 'accepted_by', auth.uid())
  );

  return new_id;
end;
$$;

grant execute on function public.accept_challenge_invite(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 2) บอกแอปล่วงหน้าว่าคนที่เปิดลิงก์อยู่คือเจ้าของหรือเปล่า
--    เพื่อให้แสดงข้อความที่เข้าใจง่ายแทนการปล่อยให้กดปุ่มแล้วเด้ง error
--    (ต้อง drop ก่อน เพราะ Postgres เปลี่ยนคอลัมน์ที่ฟังก์ชันคืนกลับมา
--     ด้วย create or replace ไม่ได้)
-- ---------------------------------------------------------------------
drop function if exists public.get_invite_preview(uuid);

create function public.get_invite_preview(p_token uuid)
returns table (
  challenge_id uuid,
  title text,
  goal_description text,
  reward_text text,
  category text,
  type challenge_type,
  inviter_display_name text,
  is_own_challenge boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select
    c.id, c.title, c.goal_description, c.reward_text, c.category, c.type, p.display_name,
    -- ยังไม่ได้ login (auth.uid() เป็น null) ถือว่าไม่ใช่เจ้าของ
    coalesce(c.owner_id = auth.uid(), false)
  from public.challenges c
  join public.profiles p on p.id = c.owner_id
  where c.public_invite_token = p_token;
$$;

grant execute on function public.get_invite_preview(uuid) to anon, authenticated;

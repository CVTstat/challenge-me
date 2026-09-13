-- 0006_fix_daruma_insert_policy.sql
--
-- บั๊กเดิมตั้งแต่ 0001: ตาราง public.daruma เปิด RLS ไว้ (enable row level
-- security) แต่ไม่เคยมี policy สำหรับ INSERT เลย — มีแค่ select กับ update
-- ผลคือทุกครั้งที่สร้าง Challenge ใหม่ (ทั้ง Personal และ Life) ตอนระบบพยายาม
-- insert แถว daruma แถวแรกให้ Challenge นั้น จะโดน RLS บล็อกเสมอ (ค่า default
-- ของ Postgres คือ "ไม่มี policy = ห้ามหมด") เกิด error:
--   "new row violates row-level security policy for table daruma"
--
-- แก้โดยรวม select ไว้เหมือนเดิม แต่เปลี่ยน insert/update ให้เป็น policy
-- เดียวแบบ "for all" (ครอบคลุม insert/update/delete) แบบเดียวกับที่ตาราง
-- challenge_attempts (attempts_write_owner) และ check_ins
-- (checkins_write_owner_only) ใช้อยู่แล้วในระบบนี้ — เจ้าของ Challenge เท่านั้น
-- ที่เขียนแถว daruma ของ Challenge ตัวเองได้

drop policy if exists "daruma_update_owner_only" on public.daruma;
drop policy if exists "daruma_write_owner" on public.daruma;

create policy "daruma_write_owner" on public.daruma for all
  using (exists (
    select 1 from public.challenges c
    where c.id = daruma.challenge_id and c.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.challenges c
    where c.id = daruma.challenge_id and c.owner_id = auth.uid()
  ));

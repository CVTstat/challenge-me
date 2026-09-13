-- 0008_fix_share_cards_insert_policy.sql
--
-- บั๊กเดิมตั้งแต่ 0001: ตาราง public.share_cards เปิด RLS ไว้ (enable row level
-- security) แต่สร้าง policy ไว้แค่ "share_cards_select_via_challenge" สำหรับ
-- อ่านอย่างเดียว ไม่เคยมี policy สำหรับ insert เลย
--
-- Postgres ถือว่า operation ไหนที่ไม่มี policy รองรับ = ปฏิเสธทั้งหมด ดังนั้น
-- ทุกครั้งที่แอปพยายามบันทึกแถว share_cards จะโดน RLS บล็อกเสมอ
--
-- ผลที่ผู้ใช้เห็น: กดปุ่ม "แชร์ความคืบหน้า" แล้วไม่มีอะไรเกิดขึ้นเลย เพราะโค้ด
-- เดิม insert ก่อนแล้ว return ออกทันทีเมื่อ insert ไม่สำเร็จ จึงไม่เคยไปถึง
-- ขั้นตอนเปิดกล่องแชร์ (เป็นบั๊กชนิดเดียวกับตาราง daruma ที่แก้ไปแล้วใน 0006)
--
-- แก้ที่โค้ดฝั่งแอปไปแล้วชั้นหนึ่ง (เปิดกล่องแชร์ก่อน แล้วค่อยบันทึก log แบบ
-- best-effort) ไฟล์นี้แก้อีกชั้นที่ต้นเหตุ เพื่อให้ log ถูกบันทึกได้จริงตาม FR14.1
--
-- สิทธิ์ที่ให้: บันทึกได้เฉพาะ share card ของ challenge ที่ตัวเองเป็นเจ้าของ
-- (รูปแบบเดียวกับ daruma_write_owner ใน 0006 ที่ยืนยันแล้วว่าใช้งานได้จริง
-- ไม่ไปชนกับ policy challenges_select_supporter จนเกิด infinite recursion)

drop policy if exists "share_cards_insert_owner" on public.share_cards;

create policy "share_cards_insert_owner" on public.share_cards for insert
  with check (
    exists (
      select 1 from public.challenges c
      where c.id = share_cards.challenge_id and c.owner_id = auth.uid()
    )
  );

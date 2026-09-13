-- 0010_fix_community_badges_insert_policy.sql
--
-- แก้บั๊ก: หน้า "ฉันช่วยอะไรได้บ้าง" กดเพิ่ม tag แล้วขึ้น error
--   new row violates row-level security policy for table "community_badges"
--
-- สาเหตุ: ตาราง public.community_badges เปิด RLS ไว้ตั้งแต่ 0001 แต่มี policy
-- แค่ select อย่างเดียว (ตอนนั้นตั้งใจให้การให้เหรียญทำจากฝั่ง backend เท่านั้น)
-- แต่โค้ดจริงของแอปให้เหรียญ EXPERIENCED_HELPER อัตโนมัติทันทีที่ผู้ใช้เพิ่ม
-- expertise tag อันแรก (ตาม FR3.3) ซึ่งเป็นการเขียนจากฝั่งผู้ใช้ จึงโดนบล็อก
--
-- นี่คือบั๊กชนิดเดียวกับที่เคยเจอมาแล้วกับตาราง daruma (0006), share_cards
-- (0008) และ challenges (0009) — ตารางที่เปิด RLS ต้องมี policy ครบทุก
-- operation ที่แอปเรียกใช้จริง ไม่ใช่แค่ select
--
-- ขอบเขตที่อนุญาต: ตั้งใจให้ผู้ใช้เพิ่มได้ "เฉพาะเหรียญ EXPERIENCED_HELPER
-- ของตัวเอง" เท่านั้น ไม่เปิดกว้างทั้งตาราง เพราะเหรียญอื่น (โดยเฉพาะ
-- VERIFIED_PROFESSIONAL และ EXPERT) เป็นเหรียญที่ต้องผ่านการตรวจสอบจริง
-- ถ้าเปิดให้ insert อะไรก็ได้ ผู้ใช้จะยิง API ตั้งเหรียญ "ผู้เชี่ยวชาญที่ได้รับ
-- การยืนยัน" ให้ตัวเองได้ ซึ่งทำลายความน่าเชื่อถือของทั้งระบบ Community Guide
--
-- ส่วนการลบ/แก้เหรียญยังไม่เปิดให้ฝั่งผู้ใช้ทำ (ยังไม่มีฟีเจอร์ไหนต้องใช้)

drop policy if exists "community_badges_insert_self_earned" on public.community_badges;

create policy "community_badges_insert_self_earned" on public.community_badges for insert
  with check (
    user_id = auth.uid()
    and badge = 'EXPERIENCED_HELPER'
    and granted_by = 'SYSTEM'
  );

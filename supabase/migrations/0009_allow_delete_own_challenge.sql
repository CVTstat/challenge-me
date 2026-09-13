-- 0009_allow_delete_own_challenge.sql
--
-- ฟีเจอร์ใหม่ตามที่ผู้ใช้ขอ: ลบ Challenge ที่ตัวเองสร้างได้
--
-- ปัญหาเดิม: ตาราง public.challenges เปิด RLS ไว้ตั้งแต่ 0001 และมี policy
-- สำหรับ select / insert / update ครบ แต่ "ไม่มี policy สำหรับ delete" เลย
--
-- จุดที่อันตรายกว่าตารางอื่นที่เคยเจอ (daruma / share_cards): การ insert ที่โดน
-- RLS บล็อกจะขึ้น error ให้เห็นชัด ๆ ว่า "new row violates row-level security
-- policy" แต่การ delete ที่โดนบล็อกจะ "เงียบสนิท" — Postgres มองว่าไม่มีแถว
-- ไหนเข้าเงื่อนไขให้ลบ จึงตอบกลับมาว่า DELETE 0 โดยไม่มี error ใด ๆ
-- ผลคือแอปจะคิดว่าลบสำเร็จ ทั้งที่ข้อมูลยังอยู่ครบ (ทดสอบยืนยันแล้วกับ
-- Postgres จริง) ฝั่งแอปจึงต้องเช็คจำนวนแถวที่ถูกลบจริงด้วย ไม่ใช่เช็คแค่ error
--
-- เรื่องข้อมูลที่เกี่ยวข้อง: ทุกตารางที่อ้างถึง challenges ถูกประกาศเป็น
-- on delete cascade หรือ on delete set null ไว้แล้วตั้งแต่ 0001/0002/0004
-- (daruma, challenge_attempts, check_ins, cheers, milestones, share_cards,
-- challenge_invites, supporters, help_requests ฯลฯ) การลบ challenge จึงลบ
-- ข้อมูลที่ผูกอยู่ตามไปด้วยเองทั้งหมด ไม่ติด foreign key error
--
-- คำเตือนที่ฝั่ง UI ต้องบอกผู้ใช้: ถ้า Challenge นั้นทำสำเร็จไปแล้ว การลบจะทำ
-- ให้ "ใบไม้" บนต้นไม้หายไปด้วยอย่างถาวร เพราะใบไม้นับจากแถว daruma ที่ผูกกับ
-- challenge นั้น

drop policy if exists "challenges_delete_own" on public.challenges;

create policy "challenges_delete_own" on public.challenges for delete
  using (owner_id = auth.uid());

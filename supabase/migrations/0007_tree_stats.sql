-- 0007_tree_stats.sql
-- ธีมใหม่ตาม feedback ของผู้ใช้: เปลี่ยนสัญลักษณ์ความสำเร็จจาก "เติมตา Daruma"
-- เป็น "ต้นไม้ที่มีแต่กิ่ง แล้วค่อย ๆ ติดใบ" — ความสำเร็จ 1 อย่าง = ใบไม้ 1 ใบ
-- ที่ไปติดบนต้นจนเขียวชอุ่ม
--
-- ฝั่ง UI ต้องแสดง 2 ต้น:
--   1) ต้นไม้ของทั้งแพลตฟอร์ม — รวมความสำเร็จของทุกคนเข้าด้วยกัน
--   2) ต้นไม้ส่วนตัวของเรา — เฉพาะของเราเอง
-- ทั้งสองต้นแสดงคู่กันว่า "สำเร็จแล้วกี่ใบ" เทียบกับ "กำลังพยายามอยู่กี่อัน"
--
-- หมายเหตุ: ไม่ได้เปลี่ยนโครงสร้างตารางเดิมเลย (ตาราง daruma และคอลัมน์
-- left_eye_filled_at / right_eye_filled_at ยังอยู่เหมือนเดิม ข้อมูลเก่าไม่หาย)
-- เปลี่ยนแค่ "ความหมาย" ที่เอาไปแสดงผลเท่านั้น:
--   • left_eye_filled_at  = เริ่มลงมือปลูกแล้ว (กำลังพยายาม)
--   • right_eye_filled_at = ทำสำเร็จแล้ว → ได้ใบไม้ 1 ใบ
-- การเปลี่ยนชื่อคอลัมน์จริงมีความเสี่ยงกับข้อมูลที่ใช้งานอยู่ จึงเลือกไม่ทำ
--
-- ทำไมต้องเป็น SECURITY DEFINER: ตาราง daruma เปิด RLS ไว้ (เห็นได้เฉพาะ
-- challenge ที่เรามีสิทธิ์เห็น) ถ้าให้ client นับเองจะนับได้แค่ของตัวเอง
-- ไม่มีทางได้ยอดรวมของทั้งแพลตฟอร์ม — ฟังก์ชันนี้จึง bypass RLS แต่คืนค่า
-- ออกมาเป็น "ตัวเลขรวม" ล้วน ๆ เท่านั้น ไม่มีข้อมูลส่วนตัวของใครหลุดออกไป
-- (ไม่มีชื่อ ไม่มีหัวข้อ challenge ไม่มี id ใคร)

create or replace function public.get_tree_stats()
returns table (
  platform_leaves bigint,   -- ใบไม้รวมทั้งแพลตฟอร์ม = ความสำเร็จของทุกคนรวมกัน
  platform_growing bigint,  -- ความพยายามที่ยังทำอยู่ของทุกคนรวมกัน
  platform_growers bigint,  -- จำนวนคนที่มีต้นไม้แล้ว (เริ่ม challenge อย่างน้อย 1)
  my_leaves bigint,         -- ใบไม้ของเราเอง
  my_growing bigint         -- ความพยายามที่เรากำลังทำอยู่
)
language sql
security definer
set search_path = public
stable
as $$
  select
    (select count(*) from public.daruma d
       where d.right_eye_filled_at is not null),
    (select count(*) from public.daruma d
       where d.left_eye_filled_at is not null and d.right_eye_filled_at is null),
    (select count(distinct c.owner_id) from public.challenges c),
    (select count(*) from public.daruma d
       join public.challenges c on c.id = d.challenge_id
       where c.owner_id = auth.uid() and d.right_eye_filled_at is not null),
    (select count(*) from public.daruma d
       join public.challenges c on c.id = d.challenge_id
       where c.owner_id = auth.uid()
         and d.left_eye_filled_at is not null
         and d.right_eye_filled_at is null);
$$;

-- เปิดให้ anon เรียกได้ด้วย เผื่ออนาคตอยากโชว์ต้นไม้ของชุมชนในหน้า landing
-- ให้คนที่ยังไม่ได้สมัครเห็น (ตอนนี้ในแอปเรียกเฉพาะตอน login แล้ว)
grant execute on function public.get_tree_stats() to anon, authenticated;

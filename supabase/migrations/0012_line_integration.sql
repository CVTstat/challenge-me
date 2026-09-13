-- 0012_line_integration.sql
--
-- เชื่อมบัญชีในแอปเข้ากับ LINE — สำหรับช่วงทดลองที่เอาแอปไปวางใน Rich Menu
-- ของ LINE OA แล้วส่งการแจ้งเตือนเป็นข้อความ LINE
--
-- ทำไมต้องเก็บ line_user_id: การจะส่งข้อความ LINE หาใครสักคนได้ ต้องรู้
-- LINE user id ของเขาก่อน ซึ่งได้มาตอนเขาเปิดแอปผ่าน LIFF แล้วเรายืนยันตัวตน
-- กับเซิร์ฟเวอร์ของ LINE (ดู app/api/line/login.js)
--
-- ความปลอดภัย: คอลัมน์นี้ห้ามให้ผู้ใช้เขียนเองเด็ดขาด ไม่งั้นใครก็ยัด
-- line_user_id ของคนอื่นใส่โปรไฟล์ตัวเองแล้วดักรับการแจ้งเตือนของเขาได้
-- จึงเขียนได้เฉพาะจากฝั่งเซิร์ฟเวอร์ (service role) หลังตรวจ ID token แล้ว
-- เท่านั้น — ดู trigger ป้องกันด้านล่าง

alter table public.profiles add column if not exists line_user_id text unique;
alter table public.profiles add column if not exists line_picture_url text;
-- ผู้ใช้ปิดการแจ้งเตือนทาง LINE ได้ โดยที่กระดิ่งในแอปยังทำงานปกติ
alter table public.profiles add column if not exists line_notify_enabled boolean not null default true;

create index if not exists idx_profiles_line_user on public.profiles (line_user_id)
  where line_user_id is not null;

-- ── กันผู้ใช้แก้ line_user_id ของตัวเองผ่าน API ปกติ ──────────────────────
-- policy ของ profiles เดิมให้เจ้าของแก้แถวตัวเองได้ (ซึ่งถูกแล้วสำหรับชื่อ/bio)
-- แต่ line_user_id ต้องล็อกไว้ ไม่งั้นสวมรอยรับแจ้งเตือนของคนอื่นได้
-- trigger นี้ไม่บล็อก service role (auth.uid() เป็น null ตอนเรียกจากเซิร์ฟเวอร์)
create or replace function public.protect_line_identity() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and new.line_user_id is distinct from old.line_user_id then
    raise exception 'ไม่สามารถแก้ line_user_id ได้โดยตรง — ต้องเชื่อมบัญชีผ่านการเข้าสู่ระบบด้วย LINE เท่านั้น';
  end if;
  return new;
end $$;

drop trigger if exists trg_protect_line_identity on public.profiles;
create trigger trg_protect_line_identity before update on public.profiles
  for each row execute function public.protect_line_identity();

-- ── รายการที่รอส่งออกทาง LINE ─────────────────────────────────────────────
--
-- ตัวส่ง (serverless function) เรียกฟังก์ชันนี้ด้วย service role เพื่อดูว่ามี
-- อะไรต้องส่งบ้าง พร้อม LINE user id ของผู้รับ
--
-- p_urgent_only = true  → เฉพาะเรื่องด่วน (ส่งทันที กินโควตาข้อความ)
-- p_urgent_only = false → ทุกอย่างที่ค้างอยู่ (ใช้ตอนรวมเป็นสรุปรายวัน)
--
-- เหตุผลที่แยกด่วน/ไม่ด่วน: LINE OA แพ็กเกจฟรีส่งได้ ~300 ข้อความต่อเดือน
-- และนับต่อผู้รับ ถ้าเตือนทุกครั้งที่มีคนกดให้กำลังใจ โควตาหมดภายในสัปดาห์เดียว
create or replace function public.notifications_pending_delivery(p_urgent_only boolean default true)
returns table (
  id uuid,
  user_id uuid,
  line_user_id text,
  type notification_type,
  payload jsonb,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select n.id, n.user_id, p.line_user_id, n.type, n.payload, n.created_at
  from public.notifications n
  join public.profiles p on p.id = n.user_id
  where n.delivered_at is null
    and p.line_user_id is not null
    and p.notifications_enabled
    and p.line_notify_enabled
    -- เรื่องด่วน = ต้องให้คนลงมือทำอะไรบางอย่าง ถ้าบอกช้าก็หมดความหมาย
    and (
      not p_urgent_only
      or n.type in ('CHALLENGE_INVITE', 'HELP_REPLY', 'PUSH_AGGREGATE', 'RESCUE_TRIGGERED')
    )
  order by n.created_at
  limit 200
$$;

-- ทำเครื่องหมายว่าส่งแล้ว (เรียกหลังส่ง LINE สำเร็จ) — กันส่งซ้ำรอบถัดไป
create or replace function public.mark_notifications_delivered(p_ids uuid[])
returns void language sql security definer set search_path = public as $$
  update public.notifications set delivered_at = now() where id = any(p_ids) and delivered_at is null;
$$;

-- ── สรุปสั้น ๆ ของผู้ใช้คนหนึ่ง (ใช้ตอบปุ่ม "ดูอัปเดตของฉัน" ใน Rich Menu) ──
-- ข้อความตอบกลับ (reply) ของ LINE ไม่นับโควตา จึงให้ผู้ใช้ "มาถามเอง" ได้ฟรี
-- ไม่จำกัด ต่างจากการที่เราไล่ส่งหาเขา
create or replace function public.line_user_digest(p_line_user_id text)
returns table (
  display_name text,
  unread_count bigint,
  leaves bigint,
  growing bigint,
  recent jsonb
)
language sql
security definer
set search_path = public
as $$
  with me as (
    select id, display_name from public.profiles where line_user_id = p_line_user_id
  )
  select
    (select display_name from me),
    (select count(*) from public.notifications n where n.user_id = (select id from me) and n.read_at is null),
    (select count(*) from public.daruma d
       join public.challenges c on c.id = d.challenge_id
      where c.owner_id = (select id from me) and d.right_eye_filled_at is not null),
    (select count(*) from public.daruma d
       join public.challenges c on c.id = d.challenge_id
      where c.owner_id = (select id from me)
        and d.left_eye_filled_at is not null and d.right_eye_filled_at is null),
    (select coalesce(jsonb_agg(x order by x->>'created_at' desc), '[]'::jsonb)
       from (
         select jsonb_build_object('type', n.type, 'payload', n.payload, 'created_at', n.created_at) as x
         from public.notifications n
         where n.user_id = (select id from me) and n.read_at is null
         order by n.created_at desc
         limit 5
       ) s)
$$;

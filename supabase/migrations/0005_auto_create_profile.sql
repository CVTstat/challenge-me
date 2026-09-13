-- 0005_auto_create_profile.sql
--
-- ปัญหาที่พบ: ก่อนหน้านี้แถวใน public.profiles ถูกสร้างจากฝั่ง client
-- (AuthProvider.signUpWithEmail) ทันทีหลัง supabase.auth.signUp() — แต่ถ้า
-- ตอนนั้น "Confirm email" ของโปรเจกต์ยังเปิดอยู่ (หรือ client อยู่ในจังหวะที่
-- ยังไม่มี session พร้อมใช้งานจริง) การ insert นี้จะโดน RLS
-- (`profiles_insert_own`: auth.uid() = id) บล็อก เพราะ auth.uid() ยังเป็น
-- null อยู่ — ผลคือมี user ใน auth.users แต่ "ไม่มี" แถวคู่กันใน
-- public.profiles เลย (orphaned user)
--
-- แล้วพอ user คนนั้น login ได้ปกติ (auth ไม่ได้พึ่ง profiles) แล้วไปสร้าง
-- Challenge ใหม่ — public.challenges.owner_id มี foreign key อ้างไป
-- public.profiles(id) — insert challenge จะ fail ด้วย foreign key violation
-- ทันที (คนละสาเหตุกับ RLS recursion เดิมใน 0001) ซึ่งจะดูเหมือน "กดสร้างแล้ว
-- เงียบ ๆ ไม่เกิดอะไรขึ้น" บนเว็บ เพราะ Alert.alert ไม่โชว์ popup บน
-- react-native-web (ดู src/lib/alert.ts ที่แก้คู่กับ migration นี้)
--
-- ทางแก้ที่ถูกต้อง/มาตรฐานของ Supabase: ให้ DB สร้างแถว profiles ให้เองด้วย
-- trigger บน auth.users (ฟังก์ชัน SECURITY DEFINER จึง bypass RLS ได้ ไม่ต้อง
-- พึ่ง session ของฝั่ง client เลย) แล้ว backfill user เก่าที่ตกหล่นไปแล้วด้วย

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      split_part(new.email, '@', 1),
      'สมาชิกใหม่'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: เติม profiles ให้ user เก่าที่สมัครไปแล้วแต่ไม่มีแถว profiles
-- (เช่นบัญชีที่โดนปัญหานี้มาก่อนหน้า migration นี้จะถูกรัน)
insert into public.profiles (id, display_name)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1), 'สมาชิกใหม่')
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

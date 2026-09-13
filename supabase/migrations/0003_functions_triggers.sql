-- =====================================================================
-- Challenge Me — Supabase/Postgres migration (V1 automation)
-- ทำให้ state machine ใน DATABASE-SCHEMA.md §10 และ FR9/FR12/FR13/FR17
-- ใน FEATURE-REQUIREMENTS.md ทำงานอัตโนมัติที่ระดับ DB แทนที่จะพึ่ง client
--
-- ประกอบด้วย 2 ส่วน:
--   1) Trigger บน check_ins — คำนวณ streak + ปลุก Challenge จาก
--      NEEDS_PUSH/RESCUE กลับเป็น ACTIVE ทันทีที่มี check-in ใหม่ (ทำงานทุกครั้ง
--      ไม่ต้องรอ schedule)
--   2) Scheduled function evaluate_challenge_lifecycle() — ตรวจ Challenge ที่
--      เงียบไปนาน (NEEDS_PUSH/RESCUE) และ Challenge ที่ครบเวลาไม่ถึงเป้าหมาย
--      (NOT_YET) ต้องรันเป็นรอบ (แนะนำ hourly) — ไฟล์นี้พยายาม schedule ให้
--      อัตโนมัติผ่าน pg_cron ถ้ามี extension นี้ (Supabase เปิดให้ใช้ได้);
--      ถ้าไม่มี (เช่น รันทดสอบบน Postgres ธรรมดา) จะข้ามส่วน schedule ไปเฉย ๆ
--      โดยไม่ error — ดู README.md หัวข้อ "ตั้งเวลา evaluate_challenge_lifecycle"
--      สำหรับวิธี schedule ตอน deploy จริงบน Supabase
-- =====================================================================

-- ---------------------------------------------------------------------
-- ค่า threshold (วัน) ต่อ checkin_frequency — ตรงกับ FR12.1/FR13.1 ที่บอกว่า
-- default 2–3 วัน (push) / 4+ วัน (rescue) สำหรับ DAILY, ปรับสัดส่วนให้
-- WEEKLY/CUSTOM ตามความถี่ที่ห่างกว่า — เก็บเป็น SQL function เล็ก ๆ แทน
-- ตารางแยก เพื่อแก้ค่าได้ง่ายจุดเดียว
-- ---------------------------------------------------------------------
create or replace function public.push_threshold_days(p_frequency checkin_frequency)
returns int language sql immutable as $$
  select case p_frequency
    when 'DAILY' then 2
    when 'WEEKLY' then 9
    else 3 -- CUSTOM: ค่าเริ่มต้นกลาง ๆ จนกว่าจะรู้ periodicity จริงของ Challenge นั้น
  end;
$$;

create or replace function public.rescue_threshold_days(p_frequency checkin_frequency)
returns int language sql immutable as $$
  select case p_frequency
    when 'DAILY' then 4
    when 'WEEKLY' then 16
    else 6
  end;
$$;

-- ---------------------------------------------------------------------
-- คำนวณ streak ปัจจุบันของ attempt หนึ่ง ๆ (FR9.1) — นับช่วงเวลาที่มี
-- check-in ติดต่อกันย้อนจากวันล่าสุดที่มี check-in จริง
-- รองรับ DAILY (นับวันติดกัน) และ WEEKLY (นับสัปดาห์ติดกัน) เป็นหลัก;
-- CUSTOM ใช้ logic แบบ DAILY เป็น fallback (ระบุไว้ใน README ว่าควรปรับ
-- ตาม periodicity จริงของแต่ละ Challenge ในอนาคต)
-- ---------------------------------------------------------------------
create or replace function public.compute_current_streak(p_attempt_id uuid)
returns int language plpgsql stable as $$
declare
  v_frequency checkin_frequency;
  v_streak int := 0;
  v_dates date[];
  v_cursor date;
  v_step interval;
  i int;
begin
  select c.checkin_frequency into v_frequency
  from public.challenge_attempts ca
  join public.challenges c on c.id = ca.challenge_id
  where ca.id = p_attempt_id;

  if v_frequency is null then
    return 0;
  end if;

  v_step := case when v_frequency = 'WEEKLY' then interval '7 day' else interval '1 day' end;

  select array_agg(checkin_date order by checkin_date desc)
  into v_dates
  from public.check_ins
  where challenge_attempt_id = p_attempt_id;

  if v_dates is null or array_length(v_dates, 1) = 0 then
    return 0;
  end if;

  v_cursor := v_dates[1];
  v_streak := 1;

  for i in 2 .. array_length(v_dates, 1) loop
    if v_dates[i] = (v_cursor - v_step)::date then
      v_streak := v_streak + 1;
      v_cursor := v_dates[i];
    else
      exit;
    end if;
  end loop;

  return v_streak;
end;
$$;

-- ---------------------------------------------------------------------
-- Trigger: ทุกครั้งที่มี check-in ใหม่/แก้ไข -> อัปเดต best_streak (FR9.2),
-- ปลุก Challenge กลับ ACTIVE ถ้าอยู่ใน NEEDS_PUSH/RESCUE (state machine ใน
-- DATABASE-SCHEMA.md §10), และ resolve rescue_states ถ้ากำลัง RESCUE (FR13.4)
-- ---------------------------------------------------------------------
create or replace function public.handle_checkin_written()
returns trigger language plpgsql as $$
declare
  v_challenge_id uuid;
  v_current_status challenge_status;
  v_current_streak int;
begin
  select ca.challenge_id, ca.status
  into v_challenge_id, v_current_status
  from public.challenge_attempts ca
  where ca.id = new.challenge_attempt_id;

  v_current_streak := public.compute_current_streak(new.challenge_attempt_id);

  update public.challenge_attempts
  set best_streak = greatest(best_streak, v_current_streak)
  where id = new.challenge_attempt_id;

  if v_current_status in ('NEEDS_PUSH', 'RESCUE') then
    update public.challenge_attempts set status = 'ACTIVE' where id = new.challenge_attempt_id;
    update public.challenges set status = 'ACTIVE' where id = v_challenge_id;

    if v_current_status = 'RESCUE' then
      update public.rescue_states
      set resolved_at = now()
      where challenge_attempt_id = new.challenge_attempt_id and resolved_at is null;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_checkin_written on public.check_ins;
create trigger trg_checkin_written
  after insert or update on public.check_ins
  for each row execute function public.handle_checkin_written();

-- ---------------------------------------------------------------------
-- Scheduled function: ตรวจ Challenge ที่เงียบไป -> NEEDS_PUSH -> RESCUE
-- (FR12.1, FR13.1) และ Challenge ที่ครบเวลาไม่ถึงเป้าหมาย -> NOT_YET (FR17.1)
-- คืนค่าจำนวนแถวที่เปลี่ยนสถานะ เพื่อ log/debug ง่าย ๆ ตอนเรียกด้วยมือ
-- ---------------------------------------------------------------------
create or replace function public.evaluate_challenge_lifecycle()
returns table (moved_to_needs_push int, moved_to_rescue int, moved_to_not_yet int)
language plpgsql as $$
declare
  v_push int := 0;
  v_rescue int := 0;
  v_not_yet int := 0;
begin
  -- ACTIVE|NEEDS_PUSH -> RESCUE เมื่อเงียบเกิน rescue_threshold
  with candidates as (
    select ca.id as attempt_id, c.id as challenge_id,
           greatest(ca.started_at::date, coalesce(max(ci.checkin_date), ca.started_at::date)) as last_activity,
           c.checkin_frequency
    from public.challenge_attempts ca
    join public.challenges c on c.id = ca.challenge_id
    left join public.check_ins ci on ci.challenge_attempt_id = ca.id
    where ca.status in ('ACTIVE', 'NEEDS_PUSH')
    group by ca.id, c.id, ca.started_at, c.checkin_frequency
  ),
  due as (
    select * from candidates
    where current_date - last_activity >= public.rescue_threshold_days(checkin_frequency)
  ),
  updated_attempts as (
    update public.challenge_attempts
    set status = 'RESCUE'
    where id in (select attempt_id from due)
    returning id, challenge_id
  ),
  updated_challenges as (
    update public.challenges
    set status = 'RESCUE'
    where id in (select challenge_id from due)
    returning id
  ),
  inserted_rescue as (
    insert into public.rescue_states (challenge_attempt_id, push_count_at_trigger)
    select
      ua.id,
      (select count(*) from public.push_events pe
        where pe.challenge_attempt_id = ua.id
          and pe.created_at >= (select last_activity from due d where d.attempt_id = ua.id))
    from updated_attempts ua
    on conflict do nothing
    returning id
  )
  select count(*) into v_rescue from updated_attempts;

  -- ACTIVE -> NEEDS_PUSH เมื่อเงียบเกิน push_threshold (แต่ยังไม่ถึง rescue_threshold)
  with candidates as (
    select ca.id as attempt_id, c.id as challenge_id,
           greatest(ca.started_at::date, coalesce(max(ci.checkin_date), ca.started_at::date)) as last_activity,
           c.checkin_frequency
    from public.challenge_attempts ca
    join public.challenges c on c.id = ca.challenge_id
    left join public.check_ins ci on ci.challenge_attempt_id = ca.id
    where ca.status = 'ACTIVE'
    group by ca.id, c.id, ca.started_at, c.checkin_frequency
  ),
  due as (
    select * from candidates
    where current_date - last_activity >= public.push_threshold_days(checkin_frequency)
  ),
  updated_attempts as (
    update public.challenge_attempts set status = 'NEEDS_PUSH' where id in (select attempt_id from due) returning id
  ),
  updated_challenges as (
    update public.challenges set status = 'NEEDS_PUSH' where id in (select challenge_id from due) returning id
  )
  select count(*) into v_push from updated_attempts;

  -- ACTIVE|NEEDS_PUSH|RESCUE -> NOT_YET เมื่อครบ planned_end_date แล้วยังไม่ COMPLETED (FR17.1)
  with candidates as (
    select ca.id as attempt_id, c.id as challenge_id
    from public.challenge_attempts ca
    join public.challenges c on c.id = ca.challenge_id
    where ca.status in ('ACTIVE', 'NEEDS_PUSH', 'RESCUE')
      and c.planned_end_date is not null
      and c.planned_end_date < current_date
  ),
  updated_attempts as (
    update public.challenge_attempts
    set status = 'NOT_YET', ended_at = now()
    where id in (select attempt_id from candidates)
    returning id
  ),
  updated_challenges as (
    update public.challenges set status = 'NOT_YET' where id in (select challenge_id from candidates) returning id
  )
  select count(*) into v_not_yet from updated_attempts;

  return query select v_push, v_rescue, v_not_yet;
end;
$$;

-- ---------------------------------------------------------------------
-- ตั้ง schedule อัตโนมัติผ่าน pg_cron ถ้ามี extension นี้ในเครื่อง (Supabase
-- เปิดให้ใช้ได้ผ่าน Database > Extensions) — ถ้าไม่มี (เช่นรันทดสอบบน
-- Postgres ปกติ) จะข้ามไปเงียบ ๆ ไม่ทำให้ migration ทั้งไฟล์ fail
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule(
      'challenge-me-evaluate-lifecycle',
      '0 * * * *', -- ทุกชั่วโมง ตามที่ FR12/FR13 แนะนำ
      $cron$ select public.evaluate_challenge_lifecycle(); $cron$
    );
  else
    raise notice 'pg_cron ไม่มีในเครื่องนี้ — ข้ามการตั้ง schedule อัตโนมัติ (ดู README.md วิธี schedule บน Supabase)';
  end if;
end;
$$;

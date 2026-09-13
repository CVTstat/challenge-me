# Challenge Me — Code Scaffold (Supabase + Expo React Native)

Scaffold นี้ build ต่อจาก 3 เอกสาร spec (อยู่ใน `docs/`):
- `USER-FLOWS.md`
- `DATABASE-SCHEMA.md`
- `FEATURE-REQUIREMENTS.md`

**สถานะ: MVP V1 ครบทั้ง 20 ฟีเจอร์แล้ว** (schema + automation ฝั่ง DB + API layer +
หน้าจอ wiring จริงกับ Supabase ทั้งหมด ไม่ใช่ mock data) ส่วน V2 (Sponsor
Portal, Expert Marketplace ฯลฯ) มี schema พร้อมแล้ว รอ API/หน้าจอ

## โครงสร้างโปรเจกต์

```
challenge-me/
├── supabase/
│   └── migrations/
│       ├── 0001_init_v1_schema.sql        (สคีมา MVP V1 — ตาราง + RLS)
│       ├── 0002_v2_extension_schema.sql   (สคีมาส่วนขยาย Post-MVP — apply เมื่อพร้อมเปิดฟีเจอร์นั้นจริง)
│       └── 0003_functions_triggers.sql    (streak / Push→Rescue→Not Yet automation)
├── docs/                                   (สำเนา 3 เอกสาร spec)
└── app/                                    (Expo React Native app, TypeScript)
    ├── App.tsx
    ├── babel.config.js                     (module-resolver ให้ import alias "@/..." ทำงานจริงตอน bundle)
    ├── src/
    │   ├── lib/supabase.ts                 (Supabase client)
    │   ├── types/database.ts               (TypeScript types ของทุกตาราง V1)
    │   ├── providers/AuthProvider.tsx      (session + login/register/signout)
    │   ├── api/                            (query/mutation layer ผูกกับ FR แต่ละข้อ)
    │   │   ├── challenges.ts               (สร้าง Personal Challenge, First/Second-Eye, Check-in, Cheer)
    │   │   ├── lifeChallenge.ts            (Life Challenge + Milestones)
    │   │   ├── progress.ts                 (Streak/Progress % ฝั่ง client)
    │   │   ├── expertise.ts                (Expertise tags + badge)
    │   │   ├── supporters.ts               (Invite/Accept/Remove/Mute Supporter)
    │   │   ├── push.ts                     (Push Me + I'm Back)
    │   │   ├── share.ts                    (Share Card + deep link)
    │   │   ├── notYet.ts                   (Try Again / Extend / Change Goal)
    │   │   ├── community.ts                (Ask for Help + Guide matching)
    │   │   └── globalChallenge.ts          (Global Challenge join + consent)
    │   ├── navigation/RootNavigator.tsx    (5 แท็บหลัก + stack ไปหน้าย่อยทั้งหมด)
    │   └── screens/                        (13 หน้าจอ — ดูรายชื่อด้านล่าง)
    └── package.json
```

## ฟีเจอร์ MVP V1 ทั้ง 20 ข้อ — สถานะ wiring จริง

| # | ฟีเจอร์ | Flow | สถานะ |
|---|---------|------|--------|
| 1 | Auth (email) | Flow 1 | ✅ `AuthProvider.tsx`, `LoginScreen`, `RegisterScreen` |
| 2 | สร้าง Personal Challenge | Flow 2 | ✅ `CreateChallengeScreen` + `api/challenges.ts` |
| 3 | Expertise / Skills Profile | Flow 1/15 | ✅ `EditExpertiseScreen` + `api/expertise.ts` |
| 4 | Daruma object | Flow 2/4 | ✅ สร้างพร้อม Challenge, สถานะตาม eye state |
| 5 | Life Challenge + Milestones | Flow 3/6 | ✅ toggle ใน `CreateChallengeScreen`, journey UI ใน `ChallengeDetailScreen` |
| 6 | Check-in | Flow 5 | ✅ upsert กันซ้ำต่อวัน |
| 7 | First-Eye Ritual | Flow 4 | ✅ ต้องกดเองเท่านั้น (FR7.1) |
| 8 | (รวมกับ 4/7) | — | — |
| 9 | Progress / Streak | Flow 9 | ✅ `api/progress.ts`, แสดงใน `ChallengeDetailScreen` |
| 10 | Cheer | Flow 7 | ✅ toggle เชียร์ |
| 11 | Supporters | Flow 8 | ✅ `ManageSupportersScreen` + accept/decline ใน `CommunityScreen` |
| 12 | Push Me | Flow 10 | ✅ ปุ่ม Push (rate-limit 24 ชม./คน) + "Needs a Push" section ใน `HomeScreen` |
| 13 | Rescue Mode | Flow 10 | ✅ banner + ปุ่ม "I'M BACK" → พาไป check-in จริง |
| 14 | Share Card | Flow 11 | ✅ native Share sheet + บันทึก `share_cards` ทุกครั้ง (รูปภาพจริงเป็น seam ไว้ต่อ) |
| 15 | Completion Ritual (Second-Eye) | Flow 11 | ✅ ต้องกดเองเท่านั้น (FR15.2) |
| 16 | My Daruma Collection | Flow 12 | ✅ `MeScreen` |
| 17 | Not Yet / Try Again / Extend / Change Goal | Flow 13 | ✅ 3 ปุ่มใน `ChallengeDetailScreen` เมื่อสถานะ NOT_YET |
| 18 | Ask for Help | Flow 14 | ✅ `AskForHelpScreen` + `HelpRequestDetailScreen` (reply) |
| 19 | Community Guide Matching | Flow 15 | ✅ rule-based matching ตาม category ใน `HelpRequestDetailScreen` |
| 20 | Global Challenge + Join | Flow 16 | ✅ `GlobalChallengeDetailScreen` พร้อม consent switch + limited-daruma quota check |

การตรวจจับสถานะ **ACTIVE → NEEDS_PUSH → RESCUE → NOT_YET** ทั้งหมดทำที่ฝั่ง DB
(`0003_functions_triggers.sql`) ไม่พึ่ง client polling — ดูหัวข้อ "Scheduled
job" ด้านล่างสำหรับวิธีรันบน production

## Setup

### 1) Supabase project

1. สร้างโปรเจกต์ใหม่ที่ [supabase.com](https://supabase.com)
2. ติดตั้ง Supabase CLI (`npm install -g supabase` หรือดูวิธีอื่นใน docs ของ Supabase)
3. Link โปรเจกต์แล้ว push migration **ตามลำดับเลขไฟล์** (0001 → 0002 → 0003):
   ```bash
   cd challenge-me
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```
   (หรือ copy เนื้อหาของ 3 ไฟล์ .sql ไปรันใน Supabase Studio > SQL Editor ทีละไฟล์
   ตามลำดับเลขก็ได้ ถ้ายังไม่อยากติดตั้ง CLI — **ต้องรันตามลำดับ** เพราะ 0002/0003
   อ้างอิงตารางที่สร้างใน 0001)
4. เปิด **Authentication > Providers** แล้วเปิด Email (และ Google/Apple ถ้าต้องการ
   ตาม FR1.1)
5. **Scheduled job (สำคัญสำหรับ Push/Rescue/Not Yet ให้ทำงานอัตโนมัติจริง):**
   `0003_functions_triggers.sql` จะพยายามตั้ง `pg_cron` ให้เรียก
   `public.evaluate_challenge_lifecycle()` ทุกชั่วโมงให้อัตโนมัติ ถ้าโปรเจกต์
   Supabase ของคุณเปิด extension `pg_cron` ไว้แล้ว (เปิดได้ที่ **Database >
   Extensions**) migration จะตั้ง schedule ให้เองตอน push โดยไม่ต้องทำอะไรเพิ่ม
   ถ้ายังไม่เปิด extension ไว้ตอน push migration ให้เปิดทีหลังแล้วรันคำสั่งนี้เองครั้งเดียว:
   ```sql
   select cron.schedule(
     'evaluate-challenge-lifecycle-hourly',
     '0 * * * *',
     $$select public.evaluate_challenge_lifecycle();$$
   );
   ```
   ทางเลือกอื่นถ้าไม่อยากใช้ `pg_cron`: เรียกฟังก์ชันนี้จาก Supabase Edge
   Function ที่ตั้ง cron ของตัวเอง หรือจาก external scheduler (GitHub Actions,
   Vercel Cron ฯลฯ) ที่ยิง `select public.evaluate_challenge_lifecycle();` ผ่าน
   Supabase REST/SQL ทุกชั่วโมงก็ได้ผลเหมือนกัน

### 2) Expo app

```bash
cd challenge-me/app
npm install
cp .env.example .env
# แก้ .env ใส่ EXPO_PUBLIC_SUPABASE_URL และ EXPO_PUBLIC_SUPABASE_ANON_KEY
# จาก Supabase Project Settings > API
npm run typecheck   # ตรวจ TypeScript ให้ชัวร์ก่อนรันจริง
npm start           # เปิด Expo Dev Tools แล้วรันบน simulator/เครื่องจริงผ่าน Expo Go
```

จากนั้นแนะนำให้ generate type จริงจาก schema แทนไฟล์ `src/types/database.ts`
ที่เขียนมือไว้:
```bash
npx supabase gen types typescript --project-id <your-project-ref> > src/types/database.ts
```
(ทำหลังจากต่อ V2 schema เพิ่ม `community_badges`/`expert_profiles`/ฯลฯ ด้วย
ถ้าต้องการ type ครบ — ไฟล์ปัจจุบันมี type ของ V1 ครบและ type หลักๆของ V2
บางส่วนที่ API เรียกใช้แล้ว)

### 3) บัญชีทดสอบ

สมัคร 2 บัญชีขึ้นไปเพื่อทดสอบฟีเจอร์ที่ต้องมีสองฝั่ง (Supporter, Push, Ask for
Help แบบ Community) — เช่น บัญชี A สร้าง Challenge แล้วเชิญบัญชี B เป็น
Supporter (ใน `ManageSupportersScreen` ใส่ user id ของ B ตรงๆ ได้เลยสำหรับเดโม
— ดูหมายเหตุเรื่อง Edge Function ค้นหาอีเมลด้านล่าง)

## ฟีเจอร์ "ท้าเพื่อน" (Challenge a Friend)

เพิ่มใน `0004_challenge_invites.sql` — สอง channel:
- **IN_APP**: เชิญเพื่อนที่มีบัญชีในระบบแล้วตรง ๆ (ค้นหาจากหน้า "ท้าเพื่อน" ใน
  Challenge Detail) เพื่อนเห็นคำเชิญในแท็บ Community ต้องกด "รับคำท้า" ก่อน
  ถึงจะได้ Challenge ของตัวเอง (clone จากต้นฉบับ แยก Daruma/progress คนละชุด)
- **LINK**: ทุก Challenge มีลิงก์สาธารณะติดตัวอยู่แล้ว (`public_invite_token`)
  แชร์ไปที่ไหนก็ได้ (ปุ่ม "โพสต์ลง Facebook" เปิด Facebook Share Dialog ให้
  พร้อมลิงก์ที่มีรูปตัวอย่างสวย ๆ — ผู้ใช้พิมพ์ @แท็กเพื่อนเองตอนโพสต์ เพราะ
  Facebook ไม่อนุญาตเว็บภายนอก auto-tag คนอื่นแทนผู้ใช้) ใครก็กดรับคำท้าได้
  แม้ยังไม่เคยใช้แอปมาก่อน (ต้องสมัครสมาชิกก่อนถึงจะรับได้จริง)

ถ้าโปรเจกต์ Supabase ของคุณรัน migration 0001-0003 ไปแล้วก่อนหน้านี้ ต้องรัน
`0004_challenge_invites.sql` เพิ่มเป็นไฟล์ที่ 4 (SQL Editor > New query > วาง
เนื้อหาทั้งไฟล์ > Run)

## Deploy ขึ้นเว็บจริงด้วย Vercel (ไม่ต้องใช้ Terminal)

โปรเจกต์นี้ export เป็นเว็บได้ด้วย Expo's web target (`react-native-web`) —
ได้ URL จริงที่เปิดได้ทั้งบนมือถือและ desktop โดยไม่ต้องเปิด Expo Go เลย

1. **อัปโค้ดขึ้น GitHub** (เว็บล้วน ไม่ต้องมี git ในเครื่อง):
   - สร้าง repo ใหม่ (เปล่า ๆ ไม่ต้องติ๊ก README) ที่ github.com
   - ในหน้า repo กด "uploading an existing file" แล้วลากทั้งโฟลเดอร์
     `challenge-me` (ที่แตกไฟล์ zip แล้ว) วางลงไป — เบราว์เซอร์สมัยใหม่ (Chrome/Edge)
     รองรับการลากทั้งโฟลเดอร์ รักษาโครงสร้างไฟล์ย่อยให้ครบ
   - กด commit (ปุ่มเขียวด้านล่างหน้าอัปโหลด)
2. **สร้างบัญชี Vercel** ที่ vercel.com (กด "Continue with GitHub" เชื่อมบัญชี
   GitHub ได้เลย ไม่ต้องพิมพ์รหัสผ่านใหม่)
3. กด **Add New... > Project** เลือก repo ที่เพิ่ง upload
4. ตรง **Root Directory** ให้กด Edit แล้วเลือกโฟลเดอร์ `app` (สำคัญ — โปรเจกต์
   Expo อยู่ในโฟลเดอร์ย่อยนี้ ไม่ใช่ root ของ repo)
5. ตรง **Environment Variables** ใส่ 3 ตัวแปรนี้ (ค่าเดียวกับใน `.env` ของคุณ):
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - `EXPO_PUBLIC_WEB_BASE_URL` — ใส่ค่าเป็น URL ที่ Vercel จะให้หลัง deploy
     (เดารูปแบบไว้ก่อนได้ เช่น `https://challenge-me.vercel.app` แล้วค่อยกลับมา
     แก้ให้ตรงเป๊ะทีหลังได้เสมอใน Project Settings > Environment Variables)
6. กด **Deploy** — รอ 2-3 นาที ได้ URL จริงกลับมา (เช่น
   `https://challenge-me-xxxx.vercel.app`) เปิดได้ทั้งมือถือ/desktop ทันที
7. ถ้าค่า `EXPO_PUBLIC_WEB_BASE_URL` ตอน deploy ครั้งแรกไม่ตรงกับ URL จริงที่ได้
   มา ให้ไปแก้ค่าใน Project Settings > Environment Variables แล้วกด
   **Redeploy** อีกครั้ง (ทุกอย่างเป็นการคลิกในเบราว์เซอร์ล้วน ๆ)

ทุกครั้งที่แก้โค้ดแล้วอัปโหลดไฟล์ใหม่ทับใน GitHub (หน้า repo > Add file >
Upload files) Vercel จะ build และ deploy เวอร์ชันใหม่ให้อัตโนมัติ

## ข้อจำกัดที่รู้อยู่แล้ว / จุดต่อยอดที่ตั้งใจเว้นไว้

- **ค้นหา user จากอีเมลตอนเชิญ Supporter:** ตาราง `auth.users` ไม่เปิดให้ query
  ตรงจาก client — ต้องเพิ่ม Supabase Edge Function ที่ใช้ service role มาทำ
  lookup แทน (คอมเมนต์ไว้ใน `ManageSupportersScreen.tsx` แล้ว) เดโมนี้เชิญด้วย
  user id ตรงๆ ไปก่อน
- **Share Card เป็น text + deep link เท่านั้น ยังไม่มีรูปภาพจริง:** การ render
  รูป Daruma/branding ต้องมี image-generation service แยก (Edge Function ที่ใช้
  satori/resvg หรือ headless browser) — schema (`share_cards.image_url`) และ
  API (`api/share.ts`) ออกแบบให้เพิ่มรูปทีหลังได้โดยไม่ต้องแก้ shape
- **Push notification จริง (แจ้งเตือนตอนเข้าสถานะ NEEDS_PUSH):** ต้องต่อ Expo
  Notifications + เรียกจาก Edge Function ตอน `evaluate_challenge_lifecycle()`
  เจอ transition — ตอนนี้ผู้ใช้เห็นได้จาก "Needs a Push" section ใน Home tab
  เมื่อเปิดแอปเท่านั้น
- **V2 ทั้งหมด** (Sponsor Portal, Expert Marketplace + Payment, Professional
  Verification, Corporate, B2C Premium, Wearable) — schema พร้อมใน
  `0002_v2_extension_schema.sql` แต่ยังไม่มี API/หน้าจอ

## การ verify ที่ทำไปแล้ว (ในเครื่องนี้)

- **SQL:** รัน 3 migration ตามลำดับบน Postgres 16 จริง (schema `auth` จำลองด้วย
  ตาราง `auth.users` + ฟังก์ชัน `auth.uid()`) จากฐานข้อมูลเปล่า → ผ่านทั้งหมด
  ไม่มี error, ได้ 41 ตาราง + ฟังก์ชัน/trigger ครบตามที่ออกแบบ
- **Automation:** ทดสอบ insert check-in ติดกัน 5 วัน → `best_streak` อัปเดตถูก;
  จำลอง challenge ที่ไม่ check-in 6 วัน (DAILY) → `evaluate_challenge_lifecycle()`
  เปลี่ยนสถานะเป็น RESCUE ถูกต้อง + สร้าง `rescue_states` row; check-in ใหม่ →
  reset กลับ ACTIVE + resolve rescue ถูกต้อง; ตั้ง `planned_end_date` เป็นอดีต →
  เปลี่ยนเป็น NOT_YET ถูกต้อง
- **TypeScript:** ทุกไฟล์ใน `app/src` (27 ไฟล์ .ts/.tsx) ผ่านการตรวจ syntax ด้วย
  TypeScript compiler (`ts.transpileModule`, jsx: react-jsx) ไม่มี syntax error
- **Terminology:** grep ตรวจแล้วว่าไม่มีคำว่า "ล้มเหลว"/"Failed" หลุดไปอยู่ใน
  ข้อความที่ผู้ใช้เห็น (ตาม product philosophy "No FAILED, only NOT_YET/COMPLETED")

**สิ่งที่ยังไม่ได้ verify ในเครื่องนี้** (ติด org network policy บล็อก
`registry.npmjs.org` — ดูรายละเอียดในข้อความตอบกลับ): `npm install` จริง,
Metro bundler resolve import alias `@/...` จริง (ตรวจ config ด้วยตาแล้วว่าถูก
แต่ไม่ได้รัน bundler จริง), และการรันแอปจริงบน Supabase project จริง — ขั้น
`npm install` ในขั้นตอน Setup ด้านบนคือสิ่งที่ควรรันเป็นก้าวแรกในเครื่องของคุณ

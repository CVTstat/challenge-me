# Challenge Me — User Flows (Full Master Concept)

ขอบเขต: เอกสารนี้ครอบคลุมทั้งหมด — **ส่วนที่ 1 (Flow 0–19)** คือ 20 ฟีเจอร์ MVP V1 ตาม Master Product Concept §54, **ส่วนที่ 2 (Flow 20–32)** คือฟีเจอร์ที่เดิมระบุว่า "ยังไม่ต้องทำใน V1" — Sponsor Portal เต็มรูปแบบ, Expert Marketplace/Payment, Corporate Model, B2C Premium, Wearable Integration และ Complex/AI Matching — จัดกลุ่ม Flow ตาม 5 แท็บหลักของแอป (Home, Global, Challenge/Create, Community, Me) และมี Flow ที่ตัดข้ามหลายแท็บ (Daruma ritual, Push/Rescue, Share, Notification)

คำอธิบายสัญลักษณ์: `[Screen]` = หน้าจอ/สกรีนหนึ่งหน้า · `→` = การนำทางหรือการเปลี่ยน state · `◆` = จุดตัดสินใจ (decision point) · `(system)` = ขั้นตอนที่ระบบทำงานอัตโนมัติ/เบื้องหลัง

ชื่อ field/enum/table (เช่น `status`, `ACTIVE`, `checkin_type`) คงไว้เป็นภาษาอังกฤษตามมาตรฐานที่จะใช้ในโค้ดจริง เพื่อให้ตรงกับ `DATABASE-SCHEMA.md` และ `FEATURE-REQUIREMENTS.md`

---

## 0. โครงแอปโดยรวม (App Shell)

```
[Splash] → [Auth Gate] ─◆ login แล้วหรือยัง? ─ ใช่ → [Home]
                                          └ ยัง → [Onboarding: Register/Login]
```

แถบนำทางด้านล่าง แสดงตลอดหลัง login แล้ว:

`🏠 Home` · `🌎 Global` · `➕ Challenge` · `❤️ Community` · `👤 Me`

---

## 1. Onboarding — สมัคร/เข้าสู่ระบบ/ตั้งค่าโปรไฟล์

**ครอบคลุมข้อ MVP:** 1 (Register/Login), 2 (User Profile), 3 (Expertise/Skills profile)

```
[Splash]
  → [Register / Login]
      - อีเมล / เบอร์โทร / social login
      - ◆ ผู้ใช้ใหม่หรือไม่?
          ใช่ → [Basic Profile Setup]
          ไม่ → [Home]

[Basic Profile Setup]
  - ชื่อที่แสดง, รูปโปรไฟล์, bio (ไม่บังคับ)
  - ภาษา
  → [Notification Permission Prompt]
  → [Push Permission Defaults] (ค่าเริ่มต้นว่าใครสามารถ Push Me ได้บ้าง — Nobody / Supporters / Community)
  → [Expertise & Skills Setup] (ไม่บังคับ ข้ามได้)
      - "คุณช่วยคนอื่นเรื่องอะไรได้บ้าง?" — พิมพ์ tag อิสระ + เลือก category
      - ใน V1 เป็นการ self-declare เท่านั้น (ยังไม่มีระบบตรวจสอบ)
      - ถ้าเพิ่ม tag อย่างน้อย 1 อัน ระบบให้ badge เริ่มต้น = ❤️ Experienced Helper (ถ้ายังไม่เพิ่ม ก็ไม่มี badge)
  → [Home] (empty state ครั้งแรก: "เริ่ม Challenge แรกของคุณ")
```

**Edge case**
- ข้าม Expertise setup ได้ และมาตั้งค่าทีหลังได้ที่ `[Me → Profile → Edit Expertise]`
- ผู้ใช้ที่ยังไม่มี Challenge จะเห็น Home แบบ empty-state พร้อมปุ่มเดียว: `+ Create Your First Challenge`

---

## 2. สร้าง Personal Challenge

**ข้อ MVP:** 4 (Personal Challenge)

จุดเริ่มต้น: แท็บ `➕ Challenge`, empty state ของ Home, หรือ `[Global Challenge] → Convert to Personal`

```
[Challenge Type Picker]
  ◆ Personal  → [Personal Challenge Form]
  ◆ Life/Dream → (ดู Flow 3)

[Personal Challenge Form]  (ทำเป็น multi-step หรือ scroll form เดียวก็ได้)
  1. ชื่อ Challenge
  2. Category (list ที่ตั้งไว้ + "อื่น ๆ")
  3. รายละเอียด (ไม่บังคับ)
  4. เป้าหมายและวิธีวัดผล (Yes/No, จำนวนครั้ง, ระยะทาง, เวลา, ตัวเลข, คะแนน, checklist, custom)
  5. ระยะเวลา (วันเริ่ม → วันสิ้นสุด หรือกำหนดจำนวนวันตายตัว เช่น 30 วัน)
  6. ความถี่ Check-in (ทุกวัน / ทุกสัปดาห์ / กำหนดเอง)
  7. Milestones (ไม่บังคับ แนะนำอัตโนมัติที่ 25/50/75/100% หรือกำหนดเอง)
  8. Reward (พิมพ์ข้อความอิสระ แนะนำให้ไม่ใช่รูปแบบเงินเดิมพัน)
  9. Privacy (Public / Friends-Supporters / Private) + toggle แยกรายละเอียด
       (ชื่อ Challenge, Progress, Check-in, รูปภาพ, Comment, ข้อมูลสุขภาพ)
  10. Push Permission ("ถ้าฉันเงียบไป ใครสามารถ Push ฉันได้?" Nobody / Supporters / Community)
  11. Supporters (เชิญตอนนี้เลย หรือข้ามไปเชิญทีหลัง)
  → [Review & Confirm]
  → (system) สร้าง Challenge + Daruma ตัวใหม่ผูกกับ Challenge นี้ สถานะ = DRAFT
  → [Daruma First-Eye Ritual]  (Flow 4)
```

**Edge case**
- ชื่อ/เป้าหมาย/ระยะเวลา เป็นฟิลด์บังคับ ส่วนที่เหลือมีค่า default ให้
- ถ้าไม่ระบุวันสิ้นสุด ยังคง apply ความถี่ Check-in ตามปกติ แต่จะไม่มีการเปลี่ยนเป็น NOT_YET อัตโนมัติจนกว่าผู้ใช้จะตั้งวันสิ้นสุดหรือจบ Challenge เอง

---

## 3. สร้าง Life / Dream Challenge

**ข้อ MVP:** 5 (Life Challenge basic)

```
[Life/Dream Challenge Form]
  1. ชื่อความฝันใหญ่ ("ฉันจะเป็นหมอผ่าตัดหัวใจ")
  2. รายละเอียด / เหตุผล
  3. กรอบเวลาโดยประมาณ (เดือน/ปี — ไม่ใช่ deadline ตายตัว)
  4. Milestones — list เรียงลำดับ แต่ละอันมี:
       - ชื่อ, คำอธิบายเป้าหมายย่อย, ความถี่ check-in ของตัวเอง (ไม่บังคับ)
       - สถานะเริ่มต้น: อันแรก = IN_PROGRESS, ที่เหลือ = LOCKED
  5. Privacy, Push Permission, Supporters (เหมือน Personal Challenge)
  → [Review & Confirm]
  → (system) สร้าง Challenge (type=LIFE) + Master Daruma
  → (system) สร้าง Milestone Daruma สำหรับ milestone แรกที่ปลดล็อกแล้ว
  → [Daruma First-Eye Ritual] (Flow 4, ใช้กับ Master Daruma)
  → [Life Challenge Home]
       ✅ milestone ที่ทำสำเร็จแล้ว
       🔥 milestone ปัจจุบัน (กำลังทำ)
       🔒 milestone ที่ยังล็อกอยู่
       Journey Progress % (จำนวน milestone ที่สำเร็จ / ทั้งหมด)
```

**Sub-flow เมื่อ Milestone สำเร็จ**
```
[Milestone Detail] → [Mark Milestone Complete]
  → (system) เติมตาที่สองให้ Milestone Daruma (Flow 12 แบบย่อระดับ milestone)
  → (system) ปลดล็อก milestone ถัดไป สร้าง Milestone Daruma ให้
  → [Milestone Celebration] → [Share Card: Milestone] (ไม่บังคับ)
```

**Edge case**
- ตาที่สองของ Master Daruma จะถูกเติมก็ต่อเมื่อผู้ใช้ mark ว่าความฝันทั้งหมดสำเร็จเท่านั้น — อาจใช้เวลาหลายปีหลังสร้าง Challenge ระบบต้องรองรับ Challenge ที่ active ยาวนานมากโดยไม่บังคับเปลี่ยนสถานะ
- Life Challenge จะไม่เปลี่ยนเป็น NOT_YET อัตโนมัติเด็ดขาด สะท้อนแค่ Journey Progress % เท่านั้น ผู้ใช้ archive เองได้ถ้าต้องการ

---

## 4. Daruma — First-Eye Ritual (ตอนเริ่ม Challenge)

**ข้อ MVP:** 6 (Create Daruma), 7 (First-eye ritual)

```
[New Daruma Reveal]
  🔴 "Make a Wish. Make a Challenge."
  <ชื่อ Challenge + สรุป reward>
  "เมื่อพร้อมจะเริ่ม เติมตาข้างแรกให้ Daruma"
  👁️ ◯
  [ เติมตาข้างแรก ]
      - ต้องให้ผู้ใช้กดเองเท่านั้น — ระบบห้ามเติมให้อัตโนมัติเด็ดขาด
  ◆ ผู้ใช้กด →
      (system) Daruma.left_eye_filled_at = now
      (system) Challenge.status = ACTIVE
      → [Share Card: START] (ไม่บังคับ)
      → [Challenge Home] (Flow 5)
  ◆ ผู้ใช้ออกจากหน้าโดยไม่กด →
      Challenge.status = DRAFT, Daruma ยังเป็น 👁️◯ ไม่ถูกเติม จะอยู่ในหมวด "ยังไม่เริ่ม" จนกว่าจะเติมตาหรือลบ Challenge
```

---

## 5. Daily Check-in

**ข้อ MVP:** 8 (Check-in)

```
[Challenge Home]
  🔴 👁️◯  <ชื่อ Challenge>
  🔥 DAY n / total   [progress bar %]
  ❤️ <จำนวน cheer>
  🎁 My Reward: <ข้อความ>
  [ ✓ CHECK IN TODAY ]

  → [Check-in Composer]  (รูปแบบขึ้นกับ Challenge.checkin_type)
       - Toggle Yes/No
       - พิมพ์ข้อความ
       - อัปโหลดรูป
       - Checklist (ติ๊กได้หลายข้อ)
       - กรอกตัวเลข (จำนวนครั้ง / ระยะทาง / เวลา / คะแนน / หน่วย custom)
     เสริมได้เสมอ: แนบ note/รูป ไม่ว่าจะใช้ type หลักแบบไหน
  → [Confirm Check-in]
  → (system) สร้าง record CheckIn คำนวณ streak และ progress % ใหม่
  → ◆ ถึง milestone หรือยัง (25/50/75/100% หรือกำหนดเอง)?
       ใช่ → [Milestone Celebration] → [Share Card: Progress] (ไม่บังคับ)
       ไม่ → กลับ [Challenge Home] พร้อม progress ที่อัปเดตแล้ว
```

**Edge case**
- นับ check-in ได้แค่ 1 ครั้งต่อช่วงเวลา (วัน/สัปดาห์) ตามความถี่ที่ตั้งไว้ — ถ้าเปิด composer ซ้ำในวันเดียวกัน ระบบแสดง "Check-in ของวันนี้" ในโหมดแก้ไข ไม่สร้างซ้ำ
- การไม่ check-in ในวันใดวันหนึ่ง **ไม่ใช่** สถานะล้มเหลว — ดู Flow 9 (Push Me) สำหรับ logic "Challenge เงียบ" ข้อความใน UI เมื่อพลาดวันต้องเป็นกลาง (เช่น "วันนี้ยังไม่ได้ check-in") ห้ามใช้น้ำเสียงตำหนิ

---

## 6. Progress & Streak

**ข้อ MVP:** 9 (Progress / Streak)

```
[Challenge Home] → [Progress Detail]
  🔥 Streak ปัจจุบัน
  🎯 % ความสำเร็จ
  🏆 Personal best streak (นับรวมทุก attempt ของ Challenge นี้)
  Timeline ของ Milestone (Day 1 → 7 → 14 → 21 → 30 → Complete หรือกำหนดเอง)
  ประวัติ Check-in (แสดงเป็นปฏิทิน/list)
```

ไม่มีการแสดงบทลงโทษเมื่อขาดช่วง ปฏิทินจะแค่ mark วันที่มี/ไม่มี check-in เฉย ๆ

---

## 7. Cheer & Comment

**ข้อ MVP:** 10 (Cheer / Comment)

```
[Challenge Home] หรือ [Community Feed] หรือ [Global Feed]
  ❤️ <จำนวน> Cheers   [ ❤️ Cheer ]   💬 <จำนวน> Comments
  ◆ กด Cheer → (system) บันทึก Cheer{user, challenge, created_at}; idempotent (คนละคนได้ 1 ครั้งต่อ challenge, กดซ้ำ = toggle ยกเลิก)
  ◆ กด Comments → [Comment Thread]
       - โพสต์ข้อความ
       - แสดงตาม privacy setting เรื่อง comment ที่เจ้าของ Challenge ตั้งไว้
       - report / ซ่อน comment ของตัวเองได้
```

Cheer ไม่มีผลต่อสิทธิ์ Sponsor Reward เด็ดขาด (แยกออกจาก logic การจบ Global Challenge) และไม่สามารถซื้อได้

---

## 8. Supporters

**ข้อ MVP:** 11 (Supporters)

```
[Challenge Home] → [Manage Supporters]
  [ + เชิญ Supporter ] → เลือกจากรายชื่อ/friend หรือแชร์ลิงก์เชิญ
  List ของ Supporter: ชื่อ, ระดับสิทธิ์ที่เห็น, ลบ/ปิดเสียงได้

[มุมมองของ Supporter] (คนที่ถูกเชิญ)
  → ได้รับ notification เชิญ → ◆ ตอบรับ/ปฏิเสธ
  → ถ้าตอบรับ: Challenge จะขึ้นใน [Me → People I'm Supporting]
  → ได้รับ notification progress ตามที่เจ้าของตั้งค่าไว้ (เช่น "Pat ทำได้ 20/30 วันแล้ว")
  → สามารถ Cheer / Comment / Push จาก feed ของตัวเองได้
```

**Edge case**
- เจ้าของ Challenge ยกเลิกสิทธิ์ Supporter ได้ตลอดเวลา ประวัติ Cheer/Comment เดิมยังอยู่ แต่จะไม่ได้รับ notification ใหม่อีก
- การเห็นข้อมูลของ Supporter ยึดตาม privacy flag แบบละเอียดที่ตั้งไว้ใน Flow 2 ข้อ 9

---

## 9. Push Me (ตรวจจับ Challenge ที่เงียบไป)

**ข้อ MVP:** 12 (Push Me)

```
(system, ทำงานตามรอบ) ประเมิน Challenge ที่เป็น ACTIVE ทุกตัว:
  ◆ ไม่มี check-in มา N วัน (default 2–3 วัน ปรับได้) หรือ milestone เลยกำหนด?
       ใช่ → Challenge.status = NEEDS_PUSH
              → ขึ้นบน Home ของเจ้าของ ("Challenge ของคุณต้องการแรงผลัก")
              → ขึ้นใน feed ของ Supporter/Community ถ้า Challenge.push_permission อนุญาต
              → [Push Prompt] แสดงให้คนที่มีสิทธิ์เห็น:
                   🔴 NEEDS A PUSH
                   <ชื่อ>, Day n/total, "ไม่มี progress มา N วัน"
                   [ 🔥 PUSH ]
       ไม่ → สถานะยังเป็น ACTIVE
```

```
[Push Prompt] → ◆ ผู้ชมกด PUSH
  → (system) บันทึก PushEvent{pusher, challenge, created_at}
  → มี rate limit ต่อคนต่อ challenge (ป้องกัน spam)
  → เจ้าของ Challenge ได้รับ notification แบบรวม (aggregate) ไม่ใช่ ping ทีละครั้ง
       เช่น "🔥 10 คนกำลังรอคุณกลับมา"
```

**การตั้งค่า Push Permission (ตั้งไว้ใน Flow 2):** `🔒 Nobody` / `👥 Friends-Supporters` / `🌎 Community` — บังคับที่ฝั่ง server ไม่ใช่แค่ซ่อนใน UI ข้อความ Push เป็น template ที่กำหนดไว้ล่วงหน้า ไม่มีน้ำเสียง shame (ดูรายการคำที่ใช้ได้/ห้ามใช้ใน Feature Requirements)

---

## 10. Rescue Mode & "I'm Back"

**ข้อ MVP:** 13 (Rescue Mode basic)

```
(system) ถ้า NEEDS_PUSH ค้างเกิน threshold ที่นานขึ้น (เช่น 4+ วัน) →
  Challenge.status = RESCUE
  → [Rescue Card] แสดงเด่นขึ้นให้ Supporter/Community เห็น:
       🔴 <ชื่อ>'S DARUMA NEEDS YOU
       "ไม่มี progress มา N วัน"
       ❤️ <จำนวน> คนกำลังเชียร์
       [ 🔥 PUSH <ชื่อ> ]

ฝั่งเจ้าของ Challenge:
  [Rescue Notice] (push notification + banner ในแอป)
       "🔥 <จำนวน> คนกำลังรอคุณกลับมา — Daruma ของคุณยังไม่จบนะ"
       [ I'M BACK ]
  ◆ เจ้าของกด I'M BACK
       → (system) Challenge.status = ACTIVE
       → พาไปที่ [Check-in Composer] (Flow 5) เพื่อบันทึก check-in จริง
       → เมื่อ check-in สำเร็จ → [I'm Back Celebration] → [Share Card: I'M BACK] (ไม่บังคับ)
  ◆ เจ้าของไม่ทำอะไรต่อ
       → Challenge ยังอยู่ใน RESCUE จนกว่าจะมี check-in หรือครบระยะเวลา Challenge
         ซึ่งจะกลายเป็น NOT_YET (Flow 14)
```

---

## 11. Completion Ritual — เติมตาที่สอง

**ข้อ MVP:** 15 (Completion Ritual)

```
◆ Challenge ถึงเงื่อนไขสำเร็จ (ครบระยะเวลาและถึงเป้าหมาย หรือผู้ใช้ mark ว่าสำเร็จเอง)
  → [You Did It] screen
       🏆 YOU DID IT. <ระยะเวลา> COMPLETED
       🔥 <จำนวน check-in>  ❤️ <จำนวน cheer>
       "ถึงเวลาเติมตาอีกข้างให้ Daruma ของคุณ"
       [ 👁️ เติมตาข้างที่สอง ]
  - ต้องให้ผู้ใช้กดเอง ห้ามเติมอัตโนมัติ (เหมือน Flow 4)
  ◆ ผู้ใช้กด
       → (system) Daruma.right_eye_filled_at = now, animation 👁️◯ → 👁️👁️
       → Challenge.status = COMPLETED
       → [Completion Message] "ครั้งหนึ่ง คุณเคยบอกว่าจะทำ และคุณทำสำเร็จ"
       → [Share Card: COMPLETE] (ไม่บังคับ)
       → Daruma ถูกเพิ่มเข้า [My Daruma Collection] (Flow 13)
```

---

## 12. My Daruma Collection

**ข้อ MVP:** 16 (My Daruma Collection)

```
[Me] → [My Daruma]
  Grid ของ Daruma ทั้งหมด (🔴 สำเร็จแล้ว = 👁️👁️, ยังพยายามอยู่ = 👁️◯)
  สถิติด้านบน: จำนวนรวม, "N Goals Completed"
  ◆ แตะ Daruma → [Daruma Detail]
       ชื่อ, category, ช่วงวันที่, streak ที่ทำได้, จำนวน cheer,
       จำนวนครั้งที่ถูก push, ข้อความ reward, วันที่สำเร็จ (ถ้ามี),
       ประวัติ attempt ถ้าเคย Try Again
```

---

## 13. Not Yet / Try Again / Extend / Change Goal

**ข้อ MVP:** 17 (Not Yet / Try Again)

```
◆ ครบระยะเวลา Challenge แต่ยังไม่ถึงเป้าหมาย
  → [Not Yet] screen
       👁️◯  "Daruma ตัวนี้ยังรอตาอีกข้างอยู่"
       "คุณมาได้ n/total"
       ❤️ <จำนวน supporter ที่เคย cheer> คนเคยช่วย Cheer คุณ
       "อยากทำอะไรต่อ?"
       [ 🔥 TRY AGAIN ]   [ ⏳ EXTEND ]   [ 🌱 CHANGE MY GOAL ]

  ◆ TRY AGAIN
       → (system) สร้าง Attempt ใหม่ภายใต้ Challenge/Daruma เดิม
         รีเซ็ต streak/check-in สำหรับ attempt ใหม่ Daruma ยังเป็นตัวเดิม (ยัง 👁️◯)
       → Challenge.status = ACTIVE → [Challenge Home]
       → ได้ achievement 💪 SECOND TRY (หรือ 🔥 NEVER GIVE UP ถ้าครบ 3 attempt ขึ้นไป)

  ◆ EXTEND
       → [Extend Picker] +7 / +14 / +30 วัน (หรือกำหนดเอง)
       → (system) บันทึก Extension record, ขยายวันสิ้นสุด, Challenge.status = ACTIVE

  ◆ CHANGE MY GOAL
       → [Adjust Goal Form] (แสดงเป้าหมายเดิมไว้ล่วงหน้า เช่น "100 km")
       → (system) เก็บ original_goal (แก้ไม่ได้ ไว้ใน Journey History) + เป้าหมายใหม่
       → Challenge.status = ACTIVE
```

Push แบบ re-engagement ไปหา Supporter เมื่อ Challenge เข้าสถานะ NOT_YET (แยกจากการกระทำของเจ้าของเอง): `❤️ ส่งกำลังใจให้เขากลับมา → [ 🔥 PUSH TO TRY AGAIN ]` แล้ว aggregate กลับไปให้เจ้าของเห็นเป็น `❤️ N คนอยากเห็นตาอีกข้างของ Daruma ตัวนี้ → [ TRY AGAIN ]`

ถ้าสุดท้ายทำสำเร็จหลังผ่าน NOT_YET มาแล้วอย่างน้อย 1 ครั้ง จะได้ 🏆 FINALLY. (Daruma ลาย kintsugi พิเศษ)

---

## 14. Community — Ask for Help

**ข้อ MVP:** 18 (Community Ask-for-Help)

```
[Challenge Home] (โดยเฉพาะตอน NEEDS_PUSH/RESCUE หรือผู้ใช้เปิดเองเมื่อไหร่ก็ได้)
  [ Ask for Help ]
  → [Help Request Composer]
       - อธิบายสั้น ๆ ว่าติดตรงไหน
       - เลือกการมองเห็น (Supporters / Community)
  → (system) สร้าง HelpRequest, โพสต์เข้า [Community → Ask Community] feed
  → [Help Request Posted] ยืนยันสำเร็จ
```

```
[Community → Ask Community feed] (ฝั่งคนช่วย)
  list ของ HelpRequest ที่ยังเปิดอยู่ (ตาม privacy scope ของคนขอ)
  ◆ ผู้ช่วยแตะ request → [Help Request Detail] → [Reply]
       → (system) สร้าง HelpReply, แจ้งเตือนคนขอ
       → คนขอกด mark ว่า Helpful ได้ (มีผลต่อ Guide Reputation, Flow 15)
```

การช่วยฟรีในหน้านี้ ห้ามมีข้อความ upsell บริการ paid ขึ้นมาแทรกเด็ดขาด (กฎ moderation ดู Feature Requirements §18/§35)

---

## 15. Community Guide — Basic Matching

**ข้อ MVP:** 19 (Basic Community Guide Matching)

```
[Me] → [Profile → What I Can Help With]
  - พิมพ์ skill tag อิสระ + category (เหมือน Expertise setup ใน Flow 1)
  - badge ที่แสดง: ❤️ Experienced Helper / 🧭 Community Guide (self-declare ใน V1;
    ✓ Verified Professional และ ⭐ Expert ยังไม่อยู่ใน scope การ matching ของ V1 แต่มี enum เตรียมไว้ใช้ในอนาคต)

[Help Request Detail] (ฝั่งคนขอความช่วยเหลือ หรือระบบ)
  → (system) แนะนำผู้ช่วยที่เป็นไปได้ โดยเรียงตาม:
       category ของ Challenge ↔ skill tag ที่ผู้ช่วยประกาศไว้
       (V1 ยังไม่มี AI/ML matching — ใช้ rule-based tag overlap + flag ความ active/availability)
  → [Suggested Guides] แสดงคู่กับ community feed แบบเปิดตามปกติ
  → คนขอสามารถส่งข้อความ/เชิญ Guide ที่ระบบแนะนำให้เข้ามาดู HelpRequest ได้
```

```
[Guide Reputation] (Me → Community Reputation)
  ❤️ Helpful ×N   🧭 Helped N Challengers   🔥 N people returned after advice
  Achievement: 🏅 Helping Hand, 🧭 Community Guide, ❤️ 100 People Helped
```

---

## 16. Global Challenge

**ข้อ MVP:** 20 (Global Challenge)

```
[Global tab]
  หมวด: Featured / Trending / New / Closing Soon / Categories / Sponsor Challenge
  ◆ แตะการ์ด → [Global Challenge Detail]
       เป้าหมาย, ระยะเวลา, จำนวนคนเข้าร่วม/capacity, reward, eligibility, rules,
       ชื่อ sponsor, terms, privacy/consent notice
       [ JOIN CHALLENGE ]
  ◆ กด JOIN
       → [Consent & Eligibility Check] (ความเหมาะสมตามอายุ, ยอมรับ terms)
       → (system) สร้าง ChallengeAttempt ส่วนตัวที่ผูกกับ GlobalChallenge
         สร้าง Daruma (Limited Sponsor Daruma ถ้ามี)
       → [Daruma First-Eye Ritual] (Flow 4)
       → หลังจากนี้ทำงานเหมือน Personal Challenge Home ปกติ (Flow 5, 6, 9, 10)

◆ Global Challenge หมดเวลา
  ◆ ถึงเป้าหมาย → [Completion Ritual] (Flow 11) + (system) mark Reward = UNLOCKED
      → [Reward Redemption] (แสดง voucher/code วิธี redeem)
  ◆ ไม่ถึงเป้าหมาย → [Global Challenge Ended] screen
       "Sponsor Reward: Not Unlocked" — แสดง progress จริง (เช่น 92/100 KM)
       "Journey ของคุณไม่จำเป็นต้องจบ"
       [ CONTINUE AS PERSONAL CHALLENGE ]
       → (system) แปลง attempt ให้กลายเป็น Personal Challenge เดี่ยว ๆ
         ตัดออกจาก GlobalChallenge/Sponsor, Daruma ยังอยู่ต่อ (ยัง 👁️◯ จนกว่าจะสำเร็จเองภายหลัง)
```

หมายเหตุ V1: Sponsor Portal / สร้าง campaign เองยังไม่อยู่ใน scope — Global Challenge ใน V1 สร้างโดย Admin เท่านั้น (ตาม Master Concept §54) จึงไม่มี flow ฝั่ง sponsor ในเอกสารนี้ มีแค่ฝั่งผู้เข้าร่วมด้านบน

---

## 17. Notification (ข้ามทุกแท็บ)

```
[Notification Center] (ไอคอนกระดิ่ง เข้าได้จากทุกแท็บ)
  ประเภทที่มีใน V1:
   - Supporter ส่ง Cheer/Comment มา
   - ถึง Milestone (ของตัวเองหรือของคนที่เราซัพพอร์ต)
   - ได้รับ Push (แบบ aggregate) / เข้า Rescue
   - มีคนเชิญเป็น Supporter / มีคนตอบรับคำเชิญ
   - มีคนตอบ Help request
   - Global Challenge reward ปลดล็อกแล้ว
   - เตือน ritual ของ Daruma (ตาแรกยังไม่เติม, ตาที่สองพร้อมเติมแล้ว)
  แตะ notification แล้วพาไปหน้าที่เกี่ยวข้องโดยตรง (Challenge Home, Comment Thread ฯลฯ)
```

น้ำเสียงของข้อความยึดกฎ "ห้าม shame" ตาม Master Concept (§12, §51) เตือนแบบชวน ไม่ใช่ตำหนิ ("Daruma ยังรอตาอีกข้างอยู่" ไม่ใช่ "คุณลืม Check-in อีกแล้ว")

---

## 18. Home / Global / Community / Me — Flow ของแต่ละแท็บ

```
[Home]
  My Active Challenges (การ์ด → Challenge Home)
  Today's Check-in (quick action)
  Friends' Progress (feed)
  Needs a Push (feed ของ challenge ที่ซัพพอร์ตอยู่และอยู่ใน NEEDS_PUSH/RESCUE)
  Recommended Challenge (แนะนำแบบ rule-based/static ง่าย ๆ ใน V1)

[Global]
  ดู Flow 16

[➕ Challenge]
  ◆ Create Personal Challenge (Flow 2) / Create Life Challenge (Flow 3)

[Community]
  Cheer feed · People I'm Supporting · People Supporting Me ·
  Needs a Push · Ask Community (Flow 14) · Community Guides (Flow 15) ·
  Comments · Notifications

[Me]
  My Journey · My Daruma (Flow 12) · Completed / Still Trying ·
  Life Challenges · Achievements · Community Reputation · Profile/Expertise (Flow 1)
```

---

## 19. การสร้าง Share Card (ข้ามทุกแท็บ)

Trigger จาก: first-eye ritual, ถึง milestone, I'm Back, completion (ไม่ trigger จาก Not Yet โดยตั้งใจ — ไม่บังคับแชร์สถานะที่ยังไม่สำเร็จ)

```
◆ เหตุการณ์ที่ควรค่าแก่การแชร์เกิดขึ้น
  → (system) render Share Card (branding + สถานะ Daruma + progress + deep link + QR)
  → [Share Sheet] (share ของ OS / copy link ในแอป)
  - เป็น optional เสมอ ไม่ปิดกั้น flow หลักถ้าผู้ใช้ปิดหน้านี้ทิ้ง
```

---
---

# ส่วนที่ 2 — Flow นอกเหนือ MVP V1 (Full Master Concept Coverage)

Flow 20–32 อ้างอิง Master Concept §27–§34, §36, §40, §43–§50 เป็น "Phase 2 / Post-MVP" ตามที่เอกสารต้นฉบับระบุไว้ว่ายังไม่ต้องทำใน V1 (§54) — นำมาแตกละเอียดในเอกสารนี้เพื่อให้ทีม dev เห็นภาพครบทั้ง roadmap แม้จะยังไม่ build ทันที

---

## 20. Sponsor Portal — สร้าง Campaign (Self-serve)

**อ้างอิง:** §43 Sponsor Portal

Actor: Sponsor Admin (ผู้ใช้ role พิเศษ ล็อกอินผ่าน Sponsor Portal แยกจากแอปผู้ใช้ทั่วไป หรือเป็น web portal ต่างหาก)

```
[Sponsor Portal Login]
  → [Sponsor Home] (รายการ Campaign ของ Sponsor นี้ + สถานะ)
  → [+ New Campaign]

[Campaign Builder] (multi-step form)
  1. Campaign Name + Description
  2. Audience / Eligibility (อายุ, พื้นที่, เงื่อนไขอื่น ๆ)
  3. Participants capacity
  4. Duration (Start/End)
  5. Rules & Verification method (วิธีตรวจสอบว่าทำสำเร็จจริง)
  6. Reward: type (GUARANTEED เท่านั้น), รายละเอียด, จำนวน/งบประมาณ
  7. Limited Daruma (ไม่บังคับ): จำนวน, pattern/accessory/theme ที่ออกแบบร่วมกับ Challenge Me
  8. Brand Assets (โลโก้, สี, รูปประกอบ)
  9. Budget
  10. Terms & Conditions
  11. Expert Support (ไม่บังคับ): แนบ Sponsor-funded Expert Voucher (Flow 28)
  → [Review Campaign] → [Submit for Review]
  → (system) สร้าง global_challenges.status = DRAFT, สร้าง campaign_review record
  → [Campaign Pending Review]
```

**Edge case**
- Sponsor แก้ไข Campaign ที่อยู่ระหว่าง review ได้ แต่การแก้ไขจะรีเซ็ต review ใหม่
- Sponsor ลบ Campaign ที่ยัง `DRAFT`/`PENDING_REVIEW` ได้ แต่ลบ Campaign ที่ `PUBLISHED` และมีคน join แล้วไม่ได้ (ต้องปิด/หมดเวลาแทน)

---

## 21. Sponsor Campaign — Review & Publish (ฝั่งแอดมิน Challenge Me)

**อ้างอิง:** §43 ("ทุก Campaign ต้องผ่าน Review ก่อน Publish")

```
[Admin Review Queue]
  ◆ แตะ Campaign ที่รอ review → [Campaign Review Detail]
       ตรวจ: eligibility เหมาะสม, reward mechanism ไม่ใช่ raffle/pool,
       เนื้อหาปลอดภัย (ตาม Appendix B), terms ถูกต้อง, brand asset เหมาะสม
       [ APPROVE ]   [ REQUEST CHANGES ]   [ REJECT ]
  ◆ APPROVE → global_challenges.status = PUBLISHED → ปรากฏใน [Global tab]
  ◆ REQUEST CHANGES → แจ้ง Sponsor พร้อมเหตุผล → กลับไป [Campaign Builder] แก้ไข
  ◆ REJECT → แจ้ง Sponsor พร้อมเหตุผล, Campaign.status = REJECTED
```

Global Challenge ต้องผ่านมาตรฐาน review ที่เข้มกว่า Personal Challenge เสมอ (§41)

---

## 22. Sponsor Dashboard

**อ้างอิง:** §44 Sponsor Dashboard

```
[Sponsor Portal] → [Campaign Dashboard]
  Aggregate metrics:
    Participants, Active, Completion %, Check-ins, Cheers, Pushes,
    Shares, Rewards issued, Rewards redeemed
  Funnel: View → Join → Active → Complete → Reward → Redemption
  Social Funnel: Share → Visit → Signup → Join
  Export report (CSV/PDF)
```

ข้อมูลเป็น aggregate เท่านั้น — Sponsor ไม่เห็นข้อมูลรายบุคคลของผู้เข้าร่วม (ชื่อ, check-in detail) เว้นแต่ผู้เข้าร่วมยินยอมแยกต่างหาก (เช่นผ่าน Expert Supporter, Flow 27)

---

## 23. Verified Professional — สมัครขอ Verify

**อ้างอิง:** §27 Badge ของผู้ช่วย — "✓ Verified Professional: Challenge Me ตรวจสอบคุณสมบัติ/ใบอนุญาตแล้ว"

```
[Me → Profile → Expertise] → [Apply for Verified Professional]
  → [Verification Application Form]
       - ใบอนุญาต/คุณวุฒิวิชาชีพ (อัปโหลดเอกสาร)
       - สาขาความเชี่ยวชาญ
       - ข้อมูลติดต่อยืนยันตัวตน
  → [Submitted — Pending Review]

[Admin Verification Queue] (ฝั่ง Challenge Me)
  ◆ ตรวจเอกสาร → [ APPROVE ] → community_badges: VERIFIED_PROFESSIONAL, granted_by = ADMIN
             → [ REJECT ] → แจ้งเหตุผล ผู้ใช้แก้ไข/ส่งใหม่ได้
```

Health / Legal / Finance / Mental Health ต้องแยก "เคยผ่านมาก่อน (Experience)" ออกจาก "คำแนะนำเชิงวิชาชีพ (Professional Advice)" อย่างชัดเจนในทุกจุดที่แสดง badge นี้ (§27)

---

## 24. Challenge Me Expert — รับสมัคร/ตั้งโปรไฟล์ (Admin-curated)

**อ้างอิง:** §31 Challenge Me Expert — Paid ("Challenge Me คัดเลือก ตรวจสอบ และว่าจ้าง")

```
[Admin Panel] → [+ Add Expert]
  - ข้อมูลผู้เชี่ยวชาญ (คัดเลือก/สัมภาษณ์นอกระบบ)
  - สาขา (Dietitian, Smoking Cessation, Coach, Psychologist, Career, Financial ฯลฯ)
  - อัตราค่าบริการที่ Challenge Me กำหนด
  - อัตราที่จ่ายให้ Expert (ภายใน ไม่แสดงผู้ใช้)
  → (system) สร้าง expert_profiles, ผูกกับ user account (ถ้า Expert เป็น user อยู่แล้วในระบบ) หรือสร้าง account ใหม่
  → Expert เข้าสู่ [Expert Portal] (แยกหรือรวมกับแอปหลัก) เพื่อตั้ง Availability
```

```
[Expert Portal] → [Set Availability]
  - ปฏิทินว่าง (สำหรับ V1 ของ feature นี้: Manual Booking — Admin/Expert จัดคิวเอง
    ก่อนมี automated calendar matching เต็มรูปแบบ)
```

Public Profile ที่ผู้ใช้เห็น:
```
[Expert Public Profile]
  ⭐ Challenge Me Expert
  ✓ Verified by Challenge Me
  🥗 Nutrition   30 min   ฿399
  [ BOOK CONSULT ]
```

---

## 25. Expert Discovery & Booking (Paid Consultation)

**อ้างอิง:** §26 Assistance Ladder ขั้น 4 (Professional-Paid), §28 Expert Matching, §30 เมื่อระบบควรเสนอ Help, §31

```
◆ ระบบเสนอ Expert เฉพาะใน Moment of Need (ไม่โชว์ตลอดเวลา):
    ไม่มี Progress นาน / Push แล้วหลายครั้ง / Attempt หลายรอบ /
    Milestone ติดค้างนาน / ผู้ใช้กด "I need help" / Health Challenge ต้องการ Professional Support
  → [ต้องการความช่วยเหลือไหม?]
       [ 👥 Ask Community — FREE ]   [ ⭐ Talk to a Challenge Me Expert ]

[Expert Matching Results] (เมื่อกด Talk to Expert)
  จัดอันดับ Expert ตาม: Challenge Category, Goal, Milestone, Current problem,
  Expertise, Experience, Professional qualification, Language, Location,
  Age appropriateness, Availability, Rating, Community reputation, Free/Paid preference
  → [Expert Public Profile] → [ BOOK CONSULT ]

[Booking Flow]
  1. เลือกช่วงเวลาที่ Expert ว่าง
  2. สรุปราคา + เงื่อนไข
  3. ชำระเงิน (payment gateway)
  4. ◆ ชำระสำเร็จ → (system) สร้าง booking, ส่ง confirmation ให้ทั้งสองฝ่าย
  5. [Booking Confirmed] — ลิงก์เข้าห้อง consult (video/chat) หรือรายละเอียดนัดพบ
```

**Edge case**
- ยกเลิก/เลื่อนนัด: มีนโยบาย Refund/Reschedule ที่ Challenge Me กำหนด (ดู Feature Requirements ข้อ 25 สำหรับกติกา)
- Sponsor-funded booking (Flow 28) ข้าม step ชำระเงินฝั่งผู้ใช้

---

## 26. Consultation Session → Expert Recommendation → Adjust Plan

**อ้างอิง:** §32 Expert ช่วยปรับ Challenge

```
[Consultation Session] (นอกแอปหรือในแอป ตามช่องทางที่ตกลง)
  → หลังจบ session, Expert กรอก [Recommendation Form]
       Current Goal (ดึงมาจาก Challenge อัตโนมัติ)
       Recommended Goal (Expert เสนอใหม่)
       หมายเหตุ/คำแนะนำ

[ผู้ใช้ได้รับ Notification]
  🧭 Expert Recommendation
  Current Goal: <เดิม>
  Recommended Goal: <ใหม่>
  [ ACCEPT NEW PLAN ]   [ KEEP CURRENT GOAL ]

◆ ACCEPT
  → (system) Challenge เดิม, Daruma เดิม, History เดิม ยังอยู่ครบ
  → บันทึก event "Goal adjusted with Challenge Me Expert" ใน Journey History
  → target_value/goal_description อัปเดตตามคำแนะนำ (เก็บ snapshot เดิมไว้เหมือน Change My Goal, Flow 13)
◆ KEEP CURRENT GOAL
  → ไม่มีการเปลี่ยนแปลง Challenge แต่ยังบันทึกว่ามี recommendation เกิดขึ้น (ใช้ทำ metric Consult → Goal Adjustment)
```

---

## 27. Expert Supporter

**อ้างอิง:** §33 Expert Supporter

```
[หลัง Consultation] → [อนุญาตให้ Expert ติดตามต่อไหม?]
  ◆ ผู้ใช้อนุญาต
     → (system) สร้าง supporters row พิเศษ (role = EXPERT_SUPPORTER)
       พร้อม visibility_scope ที่ผู้ใช้เลือกเอง (ละเอียดกว่า Supporter ทั่วไปได้)
     → Expert เห็น Challenge นี้ใน [Expert Portal → My Clients]
     → Expert ทำได้: Follow Progress, Cheer, Comment, แนะนำ Adjustment เพิ่มเติม, Follow-up
  ◆ ผู้ใช้ไม่อนุญาต
     → ความสัมพันธ์จบที่ session เดียว ไม่มี ongoing visibility
```

Privacy control ต้องละเอียดกว่า Supporter ทั่วไป เพราะอาจเกี่ยวข้องกับข้อมูลสุขภาพ/การเงิน/กฎหมาย — ผู้ใช้ปิดสิทธิ์ Expert Supporter ได้ตลอดเวลาเหมือน Supporter ปกติ (Flow 8)

---

## 28. Sponsor-funded Expert (B2B2C)

**อ้างอิง:** §49 Sponsor-funded Expert

```
[Campaign Builder] (Flow 20, step 11) → เปิด "Sponsor-funded Expert"
  - จำนวนคนที่ได้สิทธิ์ (เช่น 100 คนแรก)
  - จำนวนครั้ง/ประเภท consultation ที่ sponsor จ่ายให้

[ผู้เข้าร่วม Global Challenge ที่เข้าเงื่อนไข]
  🎁 Completion Reward
  ⭐ 100 คนแรกได้รับ Challenge Me Expert Consultation ฟรี 1 ครั้ง
  [ CLAIM FREE CONSULTATION ]
  → เข้า [Booking Flow] (Flow 25) แต่ข้าม step ชำระเงิน — ผูกกับ voucher_claims (จาก sponsor_expert_vouchers) แทน
  → (system) ตัด quota จาก Campaign, บันทึกว่า sponsor เป็นผู้จ่าย ไม่ใช่ผู้ใช้
```

---

## 29. Corporate Wellness Challenge

**อ้างอิง:** §50 Corporate Model

Actor: Corporate Admin (HR/Wellness lead ขององค์กรที่ซื้อแพ็กเกจ)

```
[Corporate Portal Login] → [Corporate Home]
  → [+ New Employee Wellness Challenge]

[Corporate Campaign Builder] (คล้าย Flow 20 แต่ scope เฉพาะพนักงานองค์กร)
  - รายชื่อ/โดเมนอีเมลพนักงานที่ eligible
  - Challenge template (Daruma, Community, Expert Support ตามแพ็กเกจที่ซื้อ)
  - Dashboard access ที่ HR จะเห็น (aggregate เท่านั้น เหมือน Flow 22)
  → [Publish to Employees]

[พนักงานที่ได้รับเชิญ]
  → ได้ notification/อีเมลเชิญเข้าร่วม → เข้า flow เหมือน Global Challenge ปกติ (Flow 16)
  → ข้อมูลรายบุคคลยังเป็นของพนักงาน — HR เห็นแค่ aggregate metric ไม่เห็น check-in/comment รายคน (ต้องรักษาความเป็นส่วนตัวของพนักงาน)
```

---

## 30. B2C Premium — สมัครสมาชิก

**อ้างอิง:** §46 B2C Premium (Advanced Analytics, AI Coach, Advanced Groups, Custom Themes, Family Plan, Private Communities, Advanced Daruma Display, Personal Reports)

```
[Me → Upgrade to Premium]
  → [Premium Plan Picker] (รายเดือน/รายปี/Family Plan)
  → [Payment]
  → ◆ ชำระสำเร็จ
     → (system) สร้าง/อัปเดต subscriptions row, สถานะ ACTIVE
     → ปลดล็อกฟีเจอร์: Advanced Analytics dashboard, AI Coach suggestions,
       Advanced Groups, Custom Daruma Themes, Private Community access,
       Personal Reports (export/summary)
  → [Premium Home] เพิ่ม section/entry point ใหม่สำหรับฟีเจอร์เหล่านี้ในแท็บ Me/Home ที่เกี่ยวข้อง

◆ ยกเลิก/หมดอายุ subscription
  → ฟีเจอร์ Premium ปิดใช้งาน แต่ข้อมูลที่เคยสร้างไว้ (เช่น Personal Report เก่า) ยังดูย้อนหลังได้แบบ read-only ตามนโยบาย data retention
```

Family Plan: เจ้าของแผนเชิญสมาชิกครอบครัวเข้าร่วม แต่ละคนยังมี Challenge/Daruma ส่วนตัวของตัวเอง เพียงแต่ได้สิทธิ์ Premium ร่วมกันและอาจเห็น dashboard ครอบครัวแบบรวม (ต้องมี privacy consent แยกเหมือน Supporter)

---

## 31. Health Challenge — Clinician-Approved Target

**อ้างอิง:** §40 Health Challenge

```
[Personal Challenge Form] (Flow 2) → ◆ category = Health/Clinical-sensitive?
  → [Health Challenge Disclaimer] อธิบายว่าเป้าหมายเชิงคลินิกต้องผ่านผู้เชี่ยวชาญ
  → เลือกทาง:
       ◆ ตั้งเป็น Behavioral Goal ทั่วไป (Activity ตามแผน, Education, นัดหมาย,
         Food tracking, Care Plan adherence) → สร้าง Challenge ได้ทันทีแบบปกติ
       ◆ ต้องการ Clinical Target เฉพาะบุคคล (เช่น HbA1c เป้าหมายของตัวเอง)
            → [Request Clinician Approval]
                 - แนบข้อมูล/ให้ Clinician (Verified Professional เฉพาะทาง) ยืนยัน target
            → (system) สร้าง clinician_approved_targets row สถานะ PENDING
            → Clinician (ผ่าน Expert/Verified Professional flow) review และ approve/reject
            → ◆ Approved → Challenge สร้างได้พร้อม target ที่ผูกกับการอนุมัตินี้
            → ◆ Rejected → แนะนำกลับไปใช้ Behavioral Goal แทน
```

ข้อมูลสุขภาพทั้งหมดในเส้นทางนี้ต้องผ่าน Consent + Access Control + PDPA compliance ตามที่ระบุใน Master Concept §40 — privacy_fields.show_health_data ต้อง default เป็น false เสมอ

---

## 32. Wearable / External Health Platform Integration

**อ้างอิง:** §7 Daily Check-in ("อนาคตสามารถเชื่อม Wearable, Health Platform หรือ External Services ได้")

```
[Me → Settings → Connected Services]
  [ + Connect Wearable/Health App ] (เช่น Apple Health, Google Fit, ผู้ผลิต wearable รายอื่น)
  → OAuth/consent flow ของ provider นั้น ๆ
  → ◆ เชื่อมต่อสำเร็จ → (system) สร้าง wearable_connections row

[ตอนสร้าง/แก้ไข Challenge] → ◆ measurement_type รองรับ auto-sync?
  → toggle "Auto check-in จาก <Wearable>" (เช่น ระยะทางวิ่งจาก GPS watch)
  → (system) sync ข้อมูลตามรอบ (background job) → สร้าง check_ins โดยอัตโนมัติ
    (source = WEARABLE แทน SELF_REPORT) แต่ผู้ใช้ยังแก้ไข/เสริม note ได้

◆ Sync ล้มเหลว/ไม่มีข้อมูลจาก wearable วันนั้น
  → fallback เป็น self-report ตามปกติ (Flow 5) ไม่ auto-fail check-in
```

**Edge case**
- ผู้ใช้ยกเลิกการเชื่อมต่อได้ตลอดเวลา — check-in ในอดีตที่ sync มาแล้วยังอยู่ แต่จะไม่ sync เพิ่มอีก
- ข้อมูลสุขภาพจาก wearable ต้องอยู่ภายใต้ privacy_fields.show_health_data เช่นเดียวกับข้อมูลสุขภาพที่กรอกเอง

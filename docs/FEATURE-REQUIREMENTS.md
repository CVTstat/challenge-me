# Challenge Me — Feature Requirements (Full Master Concept)

ขอบเขต: เอกสารนี้ครอบคลุมทั้งหมด — **ส่วนที่ 1 (ข้อ 1–20)** คือ 20 ฟีเจอร์ MVP V1 ตาม Master Product Concept §54 **ส่วนที่ 2 (ข้อ 21–33)** คือฟีเจอร์ที่เดิมเลื่อนไป V2 — Sponsor Portal เต็มรูปแบบ, Expert Marketplace/Payment, Professional Verification, Corporate Model, B2C Premium, Health Clinical Target, Wearable Integration แต่ละหัวข้อมี user story, functional requirement (FR), acceptance criteria (AC) และ edge case/non-functional note ศัพท์เทคนิค (field/enum/table) ให้ตรงกับ `USER-FLOWS.md` และ `DATABASE-SCHEMA.md`

---

## 1. Register / Login

**User story:** ในฐานะผู้ใช้ใหม่ ฉันอยากสมัครด้วยอีเมล เบอร์โทร หรือ social account ได้อย่างรวดเร็ว เพื่อเริ่ม Challenge ได้โดยไม่ติดขัด

**FR**
- FR1.1 รองรับ email+password, phone+OTP และ social login อย่างน้อย Google + Apple
- FR1.2 บังคับ email/phone ไม่ซ้ำกันต่อ 1 account มีทางลัดชัดเจนไปหน้า login แทนการสมัครซ้ำ
- FR1.3 Session คงอยู่ผ่าน refresh token, auto-login ตอนเปิดแอปใหม่จนกว่าจะ logout หรือ token ถูก revoke
- FR1.4 มี flow reset password ผ่าน OTP อีเมล/เบอร์โทร

**AC**
- สมัครสมาชิกเสร็จได้ภายใน ≤3 หน้าจอ
- ผู้ใช้เดิมที่ session ยัง valid เข้าแอปแล้วไปที่ Home ได้เลยไม่ต้อง login ซ้ำ
- OTP ผิด/หมดอายุ แสดง error เฉพาะเจาะจง ไม่ใช่ error กลาง ๆ

**Edge case / หมายเหตุ**
- Account ที่ถูกลบแล้ว (`users.status = DELETED`) ต้องมีช่วง cooldown ก่อนให้สมัครใหม่ด้วยอีเมลเดิมได้ (ป้องกันการสวมรอย identity ที่ถูกลบ)

---

## 2. User Profile

**User story:** ในฐานะผู้ใช้ ฉันอยากมีโปรไฟล์ที่แสดงว่ากำลังทำอะไรอยู่ ช่วยใครอยู่ และทำอะไรสำเร็จไปแล้ว เพื่อให้ประวัติ Challenge ของฉันรู้สึกเหมือนบันทึกจริง ไม่ใช่แค่ data ในแอป

**FR**
- FR2.1 โปรไฟล์แสดง: ชื่อที่แสดง, avatar, bio, Challenge ที่ active, สรุป My Daruma, สรุป Community Reputation, Expertise tag
- FR2.2 ฟิลด์ที่แก้ไขได้: ชื่อที่แสดง, avatar, bio, ภาษา, การตั้งค่า notification, default push permission
- FR2.3 มุมมอง profile สาธารณะ (ที่คนอื่นเห็น) ยึดตามความสัมพันธ์ของผู้ดูกับเจ้าของ (คนแปลกหน้า / supporter / ตัวเอง) ต่อ privacy setting ของแต่ละ Challenge — profile ไม่ได้มี toggle public/private แบบรวมทั้งหมด แต่ scope ตาม Challenge

**AC**
- แก้ไขข้อมูลโปรไฟล์แล้ว บันทึกทันทีและสะท้อนในหน้าถัดไปโดยไม่ต้องปิดเปิดแอปใหม่
- คนแปลกหน้าที่ดูโปรไฟล์คนอื่น เห็นเฉพาะ Challenge ที่ตั้งเป็น `PUBLIC` บวกตัวเลขสรุปที่ไม่หลุดรายละเอียด Challenge ส่วนตัว (เช่น เห็นจำนวน Daruma รวมได้ แม้ชื่อ Challenge ที่ไม่ public จะไม่แสดง — ค่า default: แสดงแค่ตัวเลข ไม่แสดงชื่อ)

---

## 3. Expertise / Skills Profile

**User story:** ในฐานะผู้ใช้ ฉันอยากบอกว่าช่วยคนอื่นเรื่องอะไรได้บ้าง เพื่อให้ community หาฉันเจอเวลาเขาติดปัญหาที่ฉันเคยผ่านมาแล้ว

**FR**
- FR3.1 ผู้ใช้เพิ่ม `expertise_tags` ได้หลายอัน (category + label) พิมพ์อิสระ
- FR3.2 ใน V1 เป็นการ self-declare — ไม่มีขั้นตอนตรวจสอบมาบล็อกการเพิ่ม tag
- FR3.3 เพิ่ม tag ≥1 อัน จะได้ badge `EXPERIENCED_HELPER` อัตโนมัติ (ระบบให้เอง ผ่าน `community_badges`)
- FR3.4 badge `COMMUNITY_GUIDE` ให้อัตโนมัติเมื่อ activity ถึง threshold ที่กำหนด (เช่น จำนวนคำตอบที่ helpful) — threshold ต้องปรับได้จาก config ไม่ hard-code ใน client
- FR3.5 badge `VERIFIED_PROFESSIONAL` และ `EXPERT` มีอยู่ใน data model แต่ **ไม่มี** UI flow ใน V1 ที่ให้ได้ (เป็น admin-only, manual, นอก scope V1 ตาม Master Concept §54)

**AC**
- ลบ expertise tag ทั้งหมด ไม่ทำให้ achievement badge จากกิจกรรมช่วยเหลือในอดีตถูกเพิกถอนย้อนหลัง
- Expertise tag ต้องค้นหา/filter ได้ตอนระบบแนะนำผู้ช่วยให้ Help Request (Flow 15)

**Non-functional**
- ห้ามนำเสนอผู้ใช้ที่ self-declare ว่าเป็น verified professional ในทุก copy/UI (มีความเสี่ยงด้านความน่าเชื่อถือ/กฎหมาย ตาม Master Concept §27)

---

## 4. Personal Challenge

**User story:** ในฐานะผู้ใช้ ฉันอยากกำหนดเป้าหมายอะไรก็ได้ที่ฉันสนใจ ไม่ใช่แค่เรื่องสุขภาพ พร้อมวิธีวัดผลและ reward ของตัวเอง เพื่อให้แพลตฟอร์มเข้ากับชีวิตฉัน ไม่ใช่ template ตายตัว

**FR**
- FR4.1 form สร้าง Challenge รองรับ: ชื่อ, รายละเอียด, category, `measurement_type` (YES_NO, COUNT, DISTANCE, TIME, NUMBER, SCORE, CHECKLIST, CUSTOM), target value (ถ้ามี), ระยะเวลา, ความถี่ check-in, milestone, ข้อความ reward, privacy, push permission, supporters
- FR4.2 ฟิลด์ reward เป็นข้อความอิสระ แพลตฟอร์มไม่ประมวลผลการจ่ายเงิน escrow หรือรับเดิมพันสำหรับ reward ของ Personal Challenge เด็ดขาด (ข้อจำกัดด้านกฎหมาย, Master Concept §4, §42)
- FR4.3 เมื่อ submit ระบบสร้าง row `challenges` (status `DRAFT`) + row `daruma` + row `challenge_attempts` แรก แล้วพาไปที่ First-Eye Ritual (ข้อ 7)
- FR4.4 category เป็น preset list ที่ดูแลไว้ล่วงหน้า บวกช่องพิมพ์อิสระ "อื่น ๆ" — ไม่ใช่ enum ตายตัวที่ปิดกั้นเป้าหมายแปลกใหม่ (จุดต่างของ product ตามที่ระบุไว้คือรองรับเป้าหมายส่วนตัวแบบไม่จำกัด)

**AC**
- ฟิลด์บังคับตอน submit: ชื่อ, measurement_type, ระยะเวลา ที่เหลือไม่บังคับ มีค่า default
- Challenge ที่ไม่มีข้อความ reward ถือว่า valid และไม่แสดง block reward เปล่า ๆ

**Edge case**
- V1 ไม่อนุญาตให้เปลี่ยน `measurement_type` หลังจากมี check-in แล้ว (จะทำให้ประวัติ check-in เพี้ยน) ผู้ใช้ต้องจบ/สร้าง Challenge ใหม่แทน

---

## 5. Life Challenge (basic)

**User story:** ในฐานะผู้ใช้ที่มีความฝันระยะยาวหลายปี ฉันอยากแตกมันเป็น milestone และติดตาม progress ได้ตลอด เพื่อให้เป้าหมายไม่รู้สึกเลื่อนลอยหรือ "หมดอายุ" ไปเอง

**FR**
- FR5.1 การสร้าง Life Challenge รองรับ list ของ Milestone แบบเรียงลำดับ แต่ละอันมีชื่อ/คำอธิบายเป้าหมายย่อย
- FR5.2 Milestone แรก default เป็น `IN_PROGRESS` ที่เหลือ default เป็น `LOCKED`
- FR5.3 เมื่อ Milestone สำเร็จ: ตั้ง `status = DONE`, `completed_at = now`, ปลดล็อก Milestone ถัดไป (`LOCKED → IN_PROGRESS`) สร้าง Milestone Daruma ให้ Milestone ที่เพิ่งปลดล็อก
- FR5.4 ตาที่สองของ Master Daruma เติมได้จากการกดของผู้ใช้เท่านั้น เมื่อ mark ว่าความฝันทั้งหมดสำเร็จ — ห้าม derive อัตโนมัติจาก "milestone ครบทุกอัน" โดยไม่ผ่านการ confirm (สอดคล้องกับกฎห้ามเติมอัตโนมัติในข้อ 7/12)
- FR5.5 Journey Progress % = จำนวน milestone ที่สำเร็จ / milestone ทั้งหมด (สัดส่วนธรรมดาใน V1 ยังไม่มี weighting)

**AC**
- Life Challenge ที่ `planned_end_date = null` จะไม่เปลี่ยนเป็น `NOT_YET` อัตโนมัติเด็ดขาด
- จัดลำดับ milestone ใหม่หลังสร้างแล้ว ทำได้เฉพาะตอนที่ milestone ทั้งหมดยังเป็น `LOCKED`/`IN_PROGRESS` (ห้ามจัดลำดับข้าม milestone ที่ `DONE` แล้ว เพื่อรักษาความถูกต้องของ Journey History)

---

## 6. Create Daruma

**User story:** ในฐานะผู้ใช้ ฉันอยากให้ทุก Challenge ที่ฉันตั้งใจทำมี Daruma แทนตัว เพื่อให้สิ่งที่ฉันผูกพันทางใจคือสัญลักษณ์นี้ ไม่ใช่แค่ progress bar เป็น %

**FR**
- FR6.1 ทุก row `challenges` ได้ row `daruma` เดียว ตอนสร้าง อยู่ในสถานะยังไม่เติมตาทั้งสองข้าง
- FR6.2 rarity tier ของ Daruma คำนวณตอนสำเร็จ จากระยะเวลาจริงของ Challenge (tier 7/30/100/365 วัน หรือ `CUSTOM`) — ไม่ใช่ให้ผู้ใช้เลือกเอง
- FR6.3 Daruma จะไม่ถูกลบเมื่อ Challenge เข้า `NOT_YET` และจะอยู่ต่อไปในทุก attempt ที่ Try Again (`daruma.challenge_id` คงที่ ส่วน `challenge_attempts` คือตัวที่เพิ่มจำนวน)

**AC**
- Challenge หนึ่งอัน ไม่ว่าจะ Try Again กี่ครั้ง ต้อง map กับ Daruma เพียงตัวเดียวเสมอ

---

## 7. First-Eye Ritual

**User story:** ในฐานะผู้ใช้ ฉันอยากเป็นคนเติมตาแรกด้วยตัวเอง เพื่อให้การเริ่ม Challenge รู้สึกเหมือนเป็นการตัดสินใจของฉันเอง ไม่ใช่ค่า default จากระบบ

**FR**
- FR7.1 `daruma.left_eye_filled_at` ตั้งค่าได้ **เฉพาะ** จากการกด `[ เติมตาข้างแรก ]` เท่านั้น — ห้ามตั้งโดย background job, ค่า default ตอนสมัคร หรือ template ใด ๆ
- FR7.2 ก่อนเติมตาแรก `challenges.status` ยังเป็น `DRAFT` และ Challenge จะไม่แสดงใน feed, notification ของ Supporter หรือการคำนวณ streak
- FR7.3 การเติมตาแรกเปลี่ยน `status → ACTIVE` และเริ่มนับเวลา (`start_date` อาจตั้งตอนกดเติมตา แทนที่จะตั้งตอน submit form — เป็นจุดที่ต้อง confirm กับ product แต่เหตุการณ์เติมตาแรกคือ timestamp มาตรฐานที่ถือว่า "Challenge เริ่มแล้ว" สำหรับคำนวณ streak)

**AC**
- Challenge ที่ค้างอยู่ใน `DRAFT` (ยังไม่เติมตา) ต้องไม่ปรากฏใน surface ที่สาธารณะ/Supporter เห็นทั้งหมด
- ห้าม bypass หน้า ritual นี้ผ่าน deep link หรือ API shortcut โดยไม่มี event การกดจริงถูกบันทึกไว้

---

## 8. Check-in

**User story:** ในฐานะผู้ใช้ ฉันอยากบันทึก progress ในรูปแบบที่เข้ากับเป้าหมายของฉัน (yes/no, ตัวเลข, รูปภาพ, checklist) เพื่อให้การ track ไม่รู้สึกฝืนรูปแบบที่ไม่ตรงกับสิ่งที่ทำ

**FR**
- FR8.1 UI ของ check-in composer ปรับตาม `challenges.measurement_type`
- FR8.2 มี row `check_ins` แค่ 1 อันต่อ (`challenge_attempt_id`, `checkin_date`) — บังคับด้วย unique constraint การ submit ซ้ำในช่วงเวลาเดียวกันจะแก้ไข record เดิม ไม่สร้างซ้ำ
- FR8.3 การแบ่งช่วงของ `checkin_date` ตาม `checkin_frequency` (daily → วันปฏิทิน; weekly → สัปดาห์ ISO; custom → ตาม config ของแอป)
- FR8.4 แนบ note และรูปได้เสมอ ไม่ว่า `measurement_type` หลักจะเป็นแบบไหน
- FR8.5 เมื่อ check-in สำเร็จ: คำนวณ streak ปัจจุบัน, progress % ใหม่ และตรวจว่าเข้าเกณฑ์ milestone หรือยัง (25/50/75/100% หรือ list ที่กำหนดเอง) เพื่อ trigger celebration

**AC**
- Submit check-in ครั้งที่สองในวันเดียวกัน จะ update ไม่ใช่สร้างซ้ำ — ยืนยันด้วย unique constraint ระดับ DB ไม่ใช่แค่ guard ฝั่ง client
- วันที่ขาด check-in จะไม่มีการเขียน record "ล้มเหลว" ใด ๆ — การไม่มี row คือสัญญาณเดียว และข้อความ UI ต้องเป็นกลางเสมอ

---

## 9. Progress / Streak

**User story:** ในฐานะผู้ใช้ ฉันอยากเห็น streak และสถิติที่ดีที่สุดของตัวเอง โดยไม่รู้สึกโดนลงโทษเมื่อพลาดไปช่วงหนึ่ง เพื่อไม่ให้ความล้มเหลวเล็ก ๆ ทำให้ฉันอยากเลิกแอปไปเลย

**FR**
- FR9.1 Streak ปัจจุบัน = จำนวนช่วงเวลาที่มี check-in ติดต่อกัน นับย้อนจากช่วงล่าสุดที่ควรมี check-in
- FR9.2 `challenge_attempts.best_streak` อัปเดตทุกครั้งที่ streak ปัจจุบันแซงค่าที่เก็บไว้ และคงอยู่แม้ streak ปัจจุบันจะรีเซ็ตในภายหลัง
- FR9.3 Progress % = จำนวน check-in ที่ทำสำเร็จ / จำนวนช่วงที่ควรมีทั้งหมดในระยะเวลา (หรือคำนวณจาก milestone สำหรับ Life Challenge ตามข้อ 5)
- FR9.4 Timeline ของ milestone แสดง checkpoint ตายตัว (Day 1/7/14/21/30/Complete ตาม default หรือ milestone ที่กำหนดเองของ Challenge นั้น)

**AC**
- Streak ที่รีเซ็ตจะไม่แสดงสถานะ "คุณล้มเหลว" เด็ดขาด — ช่วงที่ขาดหายแสดงเป็น mark กลาง ๆ บนปฏิทิน และ Personal Best ยังแสดงคู่กับ streak ปัจจุบันที่รีเซ็ตแล้ว

---

## 10. Cheer / Comment

**User story:** ในฐานะ supporter หรือสมาชิก community ฉันอยากส่งกำลังใจได้เร็ว ๆ เพื่อให้การอยู่เคียงข้างใครสักคนไม่ต้องพิมพ์อะไรเลยก็ได้

**FR**
- FR10.1 Cheer เป็น action toggle แบบ idempotent (คนละคนได้ 1 ครั้งต่อ Challenge) กดซ้ำ = ยกเลิก
- FR10.2 Cheer ไม่มีผลต่อสิทธิ์ Sponsor Reward ของ Global Challenge เด็ดขาด (ข้อบังคับ, Master Concept §9/§42) และซื้อ/แลกไม่ได้
- FR10.3 Comment ยึดตาม flag `privacy_fields.show_comments` ของเจ้าของ Challenge ถ้าเป็น false ต้องซ่อน UI comment ทั้งหมด (ไม่ใช่แค่ read-only)
- FR10.4 ผู้เขียน comment ลบ comment ตัวเองได้; เจ้าของ Challenge ซ่อน (ไม่ลบ) comment บน Challenge ของตัวเองได้; moderator ซ่อนถาวรได้ผ่าน action Report

**AC**
- จำนวน cheer ที่แสดง ต้องตรงกับจำนวน row `cheers` ที่ยังไม่ถูกลบแบบ real-time (ไม่ cache ค้างเกิน TTL สั้น ๆ เช่น <60 วินาที)

---

## 11. Supporters

**User story:** ในฐานะเจ้าของ Challenge ฉันอยากเชิญคนสำคัญให้มาติดตามและให้กำลังใจ เพื่อให้คนใกล้ตัวเห็น progress ของฉัน แม้ Challenge จะตั้งเป็นส่วนตัว

**FR**
- FR11.1 เจ้าของเชิญผ่าน contact picker หรือแชร์ลิงก์เชิญ; การเชิญสร้าง row `supporters` สถานะ `INVITED`
- FR11.2 ผู้ถูกเชิญต้องตอบรับก่อนจะได้รับ notification progress หรือขึ้นใน "People Supporting Me" / list Supporters ของเจ้าของ
- FR11.3 เจ้าของตั้ง `visibility_scope` เฉพาะแต่ละ Supporter ได้ ให้แคบกว่า (ไม่ใช่กว้างกว่า) `privacy_fields` หลักของ Challenge
- FR11.4 เจ้าของลบ/mute Supporter ได้ตลอดเวลา ประวัติ Cheer/Comment เดิมของคนนั้นยังอยู่ เว้นแต่จะถูก moderate แยก

**AC**
- Supporter ที่ถูกลบ จะหยุดรับ notification progress ใหม่ของ Challenge นั้นทันที
- list Supporter และ "People I'm Supporting"/"People Supporting Me" (ระดับ feature, แท็บ Community) ต้อง sync มาจากตาราง `supporters` ตารางเดียวกัน ไม่ต้องมีตาราง follow แยกซ้ำใน V1

---

## 12. Push Me

**User story:** ในฐานะ supporter ฉันอยากมีวิธีง่าย ๆ ในการกระตุ้นคนที่เงียบไป เพื่อไม่ต้องคิดเองว่าจะพูดอะไรดี

**FR**
- FR12.1 job ที่รันตามรอบจะประเมิน Challenge attempt ที่เป็น `ACTIVE` ทุกตัว ถ้าไม่ check-in ≥ `push_threshold_days` (config default 2–3 วัน) จะเปลี่ยนสถานะเป็น `NEEDS_PUSH`
- FR12.2 Challenge ที่เป็น `NEEDS_PUSH` แสดงปุ่ม Push ให้เฉพาะคนที่ `challenges.push_permission` อนุญาต (`NOBODY` = ไม่มีใครเห็น รวมถึง Supporter)
- FR12.3 การ Push คือกดปุ่มเดียวจบ ข้อความที่ส่งถึงเจ้าของเป็น template ตายตัวที่ผ่านการอนุมัติแล้ว — ห้ามมีช่องพิมพ์อิสระให้ผู้กด push (ป้องกันข้อความ shame ตั้งแต่ระดับ design, Master Concept §12)
- FR12.4 Notification ที่ส่งถึงเจ้าของต้องเป็นแบบรวม (batch ทุกชั่วโมง หรือเมื่อถึง threshold จำนวน) ไม่ใช่ notification แยกทุกครั้งที่มีคนกด push
- FR12.5 Rate limit: 1 row `push_events` ต่อ (pusher, attempt) ต่อ 24 ชั่วโมง

**AC**
- ตั้ง `push_permission = NOBODY` แล้ว ปุ่ม Push ต้องหายไปจากทุกคนที่ไม่ใช่เจ้าของ 100% และต้อง verify ที่ฝั่ง server (API ปฏิเสธการ push แม้จะ bypass UI มาก็ตาม)
- คำต้องห้าม ("ขี้เกียจ", "จะยอมแพ้เหรอ") ต้องไม่มีใน template ใด ๆ เด็ดขาด; copy ต้อง review เทียบกับ list ที่ approve แล้วใน Appendix A ของเอกสารนี้

---

## 13. Rescue Mode (basic)

**User story:** ในฐานะผู้ใช้ที่เงียบไปนาน ฉันอยากมีทางกลับมาที่ชัดเจนและไม่ตัดสิน เพื่อไม่ให้การกลับมารู้สึกยากกว่าการเริ่มใหม่

**FR**
- FR13.1 Challenge attempt ที่อยู่ใน `NEEDS_PUSH` เกิน `rescue_threshold_days` (config default 4+ วัน) เปลี่ยนเป็น `RESCUE` และสร้าง row `rescue_states`
- FR13.2 Challenge ที่เป็น `RESCUE` ต้องแสดงเด่นขึ้นให้ Supporter/Community เห็น (ตาม push_permission) มากกว่า `NEEDS_PUSH` ธรรมดา
- FR13.3 เจ้าของเห็นปุ่ม "I'M BACK" ที่พาตรงไปหน้า check-in composer; กด I'M BACK อย่างเดียวโดยไม่ check-in ให้เสร็จ ไม่นับว่า resolve Rescue Mode
- FR13.4 เมื่อ check-in จาก Rescue Mode สำเร็จ: `rescue_states.resolved_at = now`, สถานะ attempt → `ACTIVE`, trigger celebration "I'm Back" + Share Card (ไม่บังคับ)
- FR13.5 ถ้าครบเวลา Challenge ขณะยังอยู่ใน `RESCUE` โดยไม่มี check-in จะเปลี่ยนเป็น `NOT_YET` (ข้อ 17) ไม่ใช่ค้างอยู่แบบไม่มีสถานะชัดเจน

**AC**
- ทุกการเปลี่ยนเข้า/ออกจาก `RESCUE` ต้องมี timestamp และ query ได้ เพื่อรองรับ signature metric "Push Recovery Rate" (Master Concept §57)

---

## 14. Share Card + Deep Link

**User story:** ในฐานะผู้ใช้ ฉันอยากได้การ์ดสวย ๆ ไว้โพสต์ตอนมีเรื่องดี ๆ เกิดขึ้น เพื่อให้การแชร์รู้สึกเหมือนฉลอง ไม่ใช่การโฆษณาแอป

**FR**
- FR14.1 Share Card generate อัตโนมัติตอน: เติมตาแรก (START), ถึง milestone (PROGRESS/MILESTONE), I'm Back, Completion (COMPLETE) โดยตั้งใจ **ไม่** generate อัตโนมัติสำหรับ `NOT_YET` (ไม่บังคับแชร์สถานะที่ยังไม่สำเร็จ)
- FR14.2 การ์ดมี: branding ของ Challenge Me, สถานะ Daruma, สรุป progress, deep link, QR code
- FR14.3 Deep link เปิดตรงไปที่ Challenge นั้น (ยึดตามสิทธิ์การเห็นของผู้ชม — คนแปลกหน้าที่กดลิงก์เข้ามาดู Challenge ที่เป็น `PRIVATE` จะเห็นหน้า "Challenge นี้เป็นส่วนตัว" แบบ generic ไม่เห็นเนื้อหา พร้อม CTA ให้ติดตั้ง/เปิดแอป Challenge Me)
- FR14.4 การแชร์เป็น optional/ปิดได้เสมอ ปฏิเสธการแชร์แล้วไม่บล็อก flow หลัก (เช่น การจบ Challenge ไม่จำเป็นต้องแชร์)

**AC**
- Share Card ทุกอันที่ generate ต้องถูกบันทึก (row `share_cards`) เพื่อใช้ทำ analytics (metric Share Rate, Master Concept §55) แม้ผู้ใช้จะกดออกจาก native share sheet ก็ตาม

---

## 15. Completion Ritual (เติมตาที่สอง)

**User story:** ในฐานะผู้ใช้ที่ทำสิ่งที่ตั้งใจไว้สำเร็จ ฉันอยากได้ moment ที่รู้สึกคุ้มค่าจริง ๆ เพื่อให้การจบ Challenge มีความหมายมากกว่าแค่ติ๊กถูก

**FR**
- FR15.1 `daruma.right_eye_filled_at` ตั้งค่าได้ **เฉพาะ** จากการกด `[ เติมตาข้างที่สอง ]` เท่านั้น — สอดคล้องกับกฎห้ามเติมอัตโนมัติของ FR7.1
- FR15.2 เมื่อถึงเงื่อนไขสำเร็จ (ครบเวลาและถึงเป้าหมาย หรือผู้ใช้ mark สำเร็จเองสำหรับเป้าหมายแบบ open-ended) จะแสดงหน้า "You Did It" แต่ **ยังไม่** เปลี่ยน `challenges.status` เป็น `COMPLETED` — จะเปลี่ยนก็ต่อเมื่อกดเติมตาที่สองแล้วเท่านั้น
- FR15.3 Animation ตอนสำเร็จ (👁️◯ → 👁️👁️) มี haptic/confetti/sound เสริม แต่ละอย่างเปิด-ปิดแยกได้ในตั้งค่า
- FR15.4 ถ้า Challenge สำเร็จหลังผ่าน `NOT_YET` มาแล้วอย่างน้อย 1 ครั้งบน Daruma เดียวกัน ให้ตั้ง `daruma.kintsugi_variant = true` และให้ achievement `FINALLY`

**AC**
- Challenge ที่ถึงเป้าหมายแล้วแต่เจ้าของยังไม่กดเติมตาที่สอง ต้อง query ได้ในสถานะ "ถึงเป้าหมายแล้ว รอทำ ritual" — ห้าม auto-complete เองแบบเงียบ ๆ เมื่อครบ timeout (ritual นี้ผู้ใช้เป็นคนกำหนดจังหวะเอง โดยตั้งใจ)

---

## 16. My Daruma Collection

**User story:** ในฐานะผู้ใช้ ฉันอยากย้อนดูทุกอย่างที่เคยพยายามทำ ไม่ว่าจะสำเร็จหรือไม่ เพื่อให้ประวัติของฉันรู้สึกเหมือนเรื่องราว ไม่ใช่ leaderboard

**FR**
- FR16.1 หน้า Collection แสดง Daruma ทั้งหมดของผู้ใช้ แยก/filter ได้เป็น Completed (👁️👁️) กับ Still Trying (👁️◯)
- FR16.2 หน้า Detail ของแต่ละ Daruma: ชื่อ, category, ช่วงวันที่, best streak, จำนวน cheer, จำนวนครั้งที่ถูก push, ข้อความ reward, วันที่สำเร็จ (ถ้ามี) และประวัติ attempt (ทุก row `challenge_attempts`) ถ้าเคย retry
- FR16.3 Daruma ที่เป็น `NOT_YET` จะไม่ถูกเอาออกจาก collection หรือถูก mark ว่าล้มเหลวเด็ดขาด — แสดงสถานะ "ยังพยายามอยู่" ต่อเนื่องจนกว่าจะสำเร็จ หรือผู้ใช้ archive/ลบ Challenge นั้นเอง

**AC**
- สถิติใน Collection (เช่น "12 Daruma, 12 Goals Completed") ต้องตรงกับจำนวน row `daruma` ที่ `right_eye_filled_at IS NOT NULL` ของ user นั้นแบบ real-time

---

## 17. Not Yet / Try Again

**User story:** ในฐานะผู้ใช้ที่ทำไม่ทันเวลา ฉันอยากได้ทางไปต่อจริง ๆ ไม่ใช่ทางตัน เพื่อไม่ให้ Challenge ที่ยังไม่สำเร็จรู้สึกเหมือนแอปยอมแพ้กับฉันไปแล้ว

**FR**
- FR17.1 เมื่อครบเวลา Challenge แต่ยังไม่ถึงเป้าหมาย สถานะ → `NOT_YET`; หน้าจอเสนอ 3 ทางเลือกเท่านั้น: Try Again, Extend, Change My Goal
- FR17.2 Try Again สร้าง row `challenge_attempts` ใหม่ (`attempt_number` เพิ่มขึ้น) ใช้ `daruma_id` เดิม รีเซ็ต check-in/streak เฉพาะ scope ของ attempt ใหม่เท่านั้น
- FR17.3 Extend เพิ่มวันเข้า `planned_end_date` ผ่าน row `extensions` และเปลี่ยนสถานะกลับเป็น `ACTIVE` บน attempt เดิม (ไม่สร้าง attempt ใหม่)
- FR17.4 Change My Goal เก็บ snapshot เป้าหมายปัจจุบันไว้ที่ `original_goal_snapshot` ก่อน apply เป้าหมายใหม่ แล้วเปลี่ยนสถานะกลับเป็น `ACTIVE` บน attempt เดิม
- FR17.5 เมื่อเข้าสถานะ `NOT_YET` ต้องแจ้งเตือน Supporter/Community (ตาม push_permission) ด้วยข้อความ re-engagement ที่แยกจากหน้า Not Yet ที่เจ้าของเห็น (Master Concept §22)
- FR17.6 Achievement: attempt ที่ 2 ของ Challenge เดียวกันได้ `SECOND_TRY`; attempt ที่ 3 ขึ้นไปได้ `NEVER_GIVE_UP` (ให้ครั้งเดียว ไม่ให้ซ้ำทุกครั้งที่เกิน threshold)

**AC**
- คำว่า "Failed" ต้องไม่ปรากฏที่ไหนเลย ไม่ว่าจะเป็น UI copy, notification copy หรือ label ฝั่ง analytics (เท่าที่ทำได้) — มีแค่คำว่า `NOT_YET` เท่านั้น
- Extend และ Change My Goal ต้องไม่สร้าง row `challenge_attempts` ใหม่เด็ดขาด (มีแค่ Try Again เท่านั้นที่สร้าง) — เพื่อให้ Journey History ของแต่ละ attempt ตามรอยได้

---

## 18. Community Ask-for-Help

**User story:** ในฐานะผู้ใช้ที่ติดปัญหา ฉันอยากถามคนที่เคยผ่านจุดนี้มาก่อน เพื่อให้ได้มากกว่าคำว่า "สู้ ๆ นะ"

**FR**
- FR18.1 เจ้าของเปิด Help Request จาก Challenge ได้ตลอดเวลา (ไม่ได้ล็อกเฉพาะตอน `NEEDS_PUSH`/`RESCUE`) กำหนดการมองเห็นเป็น Supporters หรือ Community
- FR18.2 Help Request แสดงใน feed "Ask Community" ตาม visibility ที่คนขอเลือก และยึดตาม privacy ของ Challenge
- FR18.3 Reply เป็นข้อความอิสระ; คนขอ mark ว่า "Helpful" ได้ ซึ่งเพิ่ม counter ชื่อเสียงของผู้ช่วย และมีผลต่อ threshold ของ badge `COMMUNITY_GUIDE`
- FR18.4 Moderation: Help Request/Reply ที่มีเนื้อหาขายของ ชวนโอนเงินนอกระบบ affiliate link หรือขายยา/อาหารเสริมโดยไม่ได้รับอนุญาต ต้อง report ได้ และเข้า pipeline Report/Block/Moderation เดียวกับ comment ทั่วไป (Master Concept §35)

**AC**
- ระบบต้องไม่แทรก copy upsell บริการ paid เข้าไปใน flow Ask-for-Help แบบฟรีเด็ดขาด (มีแค่ navigation ที่ผู้ใช้เลือกเองไปยัง flow Expert แยกต่างหาก ซึ่งอยู่นอก scope V1 อยู่แล้วตาม §54)

---

## 19. Basic Community Guide Matching

**User story:** ในฐานะผู้ใช้ที่ขอความช่วยเหลือ ฉันอยากเห็นคนที่ประสบการณ์ตรงกับสถานการณ์ของฉันจริง ๆ เพื่อไม่ต้องพูดลอย ๆ ใน feed รวม

**FR**
- FR19.1 การ matching ใน V1 เป็นแบบ rule-based: เรียงลำดับผู้ช่วยที่เป็นไปได้จากการ overlap ระหว่าง `category` ของ Challenge กับ `expertise_tags.category` ของผู้ช่วย บวก tiebreaker ง่าย ๆ เรื่อง recency/activity ยังไม่มี ML/embedding matching ใน V1
- FR19.2 Suggested Guides แสดงคู่กับ (ไม่ใช่แทนที่) community feed แบบเปิด — คนขอไม่ถูกจำกัดให้เห็นแค่ list ที่แนะนำ
- FR19.3 Badge ที่แสดงข้าง ๆ ผู้ช่วยที่แนะนำ ต้องตรงกับ row จริงใน `community_badges` (มีแค่ `EXPERIENCED_HELPER`/`COMMUNITY_GUIDE` เพราะ `VERIFIED_PROFESSIONAL`/`EXPERT` ให้ไม่ได้ใน V1)

**AC**
- Help Request ที่อยู่ใน category X ต้องรวม user ทุกคนที่มี row `expertise_tags.category = X` เข้าไปใน query จัดลำดับ (ไม่ตัดออกแบบเงียบ ๆ นอกจากผ่านความสัมพันธ์ block/mute)

---

## 20. Global Challenge

**User story:** ในฐานะผู้ใช้ ฉันอยากเข้าร่วม challenge ที่มีแบรนด์หรือองค์กรสนับสนุน และรู้ชัดว่าทำสำเร็จแล้วจะได้อะไร เพื่อให้การเข้าร่วมรู้สึกแฟร์ ไม่ใช่การเสี่ยงดวง

**FR**
- FR20.1 Global Challenge สร้างโดย admin ใน V1 (ยังไม่มี Sponsor Portal แบบ self-serve) admin เป็นคนตั้งค่า field ทั้งหมดของ `global_challenges` รวมถึง `reward_type`
- FR20.2 `reward_type` ใน V1 รองรับแค่ `GUARANTEED` หรือ `NONE` — ไม่สามารถทำกลไกจับฉลาก/pool/"ผู้ชนะกินรวบ" ได้เลย (ข้อบังคับด้านกฎหมาย, Master Concept §37/§42)
- FR20.3 การ join ต้องผ่านการยอมรับ consent + eligibility ชัดเจน (ตั้ง `consent_accepted_at`) ก่อนจะสร้าง row `global_challenge_participants` และ `challenge_attempt`/`daruma` ที่ผูกกัน
- FR20.4 ถ้า `has_limited_daruma` เป็น true การ join หลังจาก `limited_daruma_claimed >= limited_daruma_total` ต้องถูกบล็อกพร้อมข้อความ "เต็มแล้ว" ที่ชัดเจน (ต้อง confirm กับ product ว่ายัง join ตัว challenge หลักได้ไหมถ้า capacity ของ challenge ยังเหลือ แค่ไม่ได้ limited Daruma — สมมติฐาน default: ถ้า Global Challenge ตั้งใจ frame เป็น Daruma-limited จำนวน Daruma ที่จำกัดจะเป็นตัว gate การ join ทั้งหมด)
- FR20.5 เมื่อหมดเวลา: ถึงเป้าหมาย → ออก reward (`REWARD_ISSUED`, generate `reward_code`) และใช้ Completion Ritual ปกติ (ข้อ 15) กับ Daruma นั้น; ไม่ถึงเป้าหมาย → `ENDED_NOT_MET` พร้อมตัวเลือก "Continue as Personal Challenge" ที่สร้าง row `challenges` แยกเดี่ยว (`is_global = false` ต่อจากนี้ แม้ record การเข้าร่วมเดิมยังเก็บไว้เป็นประวัติ) และตัดขาดการอัปเดตในอนาคตจาก Global Challenge/Sponsor
- FR20.6 Sponsor Dashboard ที่รวมตัวเลข (participants, active, completion %, check-ins, cheers, pushes, shares, rewards issued/redeemed) ยังไม่อยู่ใน scope UI ของ V1 แต่ schema (§8/§11 ของ `DATABASE-SCHEMA.md`) ต้องรองรับการคำนวณย้อนหลังได้โดยไม่ต้อง migrate เพิ่ม

**AC**
- Global Challenge ใน V1 ต้อง config เป็นกลไกจับฉลาก/lottery ไม่ได้เลย — ต้องบังคับที่ระดับ admin tooling ไม่ใช่แค่ตกลงกันด้วยปาก
- ผู้เข้าร่วมที่เลือก Convert เป็น Personal Challenge ยังเก็บประวัติ check-in และ Daruma เดิมไว้ครบ มีแค่ความเชื่อมโยงกับ Sponsor และสิทธิ์ reward ที่จบลง

---
---

# ส่วนที่ 2 — ฟีเจอร์นอก MVP V1 (Full Master Concept Coverage)

ข้อ 21–33 อ้างอิง Master Concept §27–§34, §36, §40, §43–§50 — Flow ที่เกี่ยวข้องอยู่ใน `USER-FLOWS.md` ข้อ 20–32 และ schema อยู่ใน `DATABASE-SCHEMA.md` §13–§20

---

## 21. Sponsor Portal — สร้าง Campaign (Self-serve)

**User story:** ในฐานะ Sponsor ฉันอยากสร้างและจัดการ Campaign ของตัวเองได้โดยไม่ต้องพึ่ง Challenge Me ทุกขั้นตอน เพื่อให้ launch แคมเปญได้เร็วขึ้น

**FR**
- FR21.1 Sponsor Portal มี auth แยกผ่าน `sponsor_users` ไม่ใช้ระบบ login เดียวกับผู้ใช้ทั่วไป
- FR21.2 Campaign Builder ต้องกรอกครบทุก field ที่ระบุใน `global_challenges` (รวม field ที่ alter เพิ่มใน DB §13) ก่อน submit ได้: budget, brand_assets, eligibility, reward (ต้องเป็น `GUARANTEED` เท่านั้น — UI ต้องไม่มีตัวเลือก raffle/pool ให้เลือกเลย ไม่ใช่แค่ validate ตอน submit)
- FR21.3 Submit แล้วตั้ง `review_status = PENDING_REVIEW` โดยที่ `status` (การแสดงผลจริง) ยังเป็น `DRAFT` จนกว่าจะผ่าน review
- FR21.4 แก้ไข Campaign ที่อยู่ระหว่าง review ต้องรีเซ็ต `review_status` กลับเป็น `PENDING_REVIEW`

**AC**
- Sponsor ไม่สามารถ publish Campaign เองได้โดยไม่ผ่านการอนุมัติจาก Challenge Me admin ไม่ว่าจะผ่านช่องทางไหนก็ตาม (บังคับที่ server, ไม่ใช่แค่ UI)
- Campaign ที่ `PUBLISHED` แล้วและมีคน join แล้ว ลบไม่ได้ — มีแค่ปิด/หมดเวลา

---

## 22. Sponsor Campaign — Review & Publish

**User story:** ในฐานะแอดมิน Challenge Me ฉันอยากตรวจทุก Campaign ก่อนปล่อยจริง เพื่อรักษามาตรฐานความปลอดภัยและความยุติธรรมของ reward mechanism

**FR**
- FR22.1 ทุก Global Challenge ต้องผ่าน `campaign_reviews` อย่างน้อย 1 รอบที่ decision = `APPROVED` ก่อน `status` จะเปลี่ยนเป็น `PUBLISHED` ได้
- FR22.2 เกณฑ์ตรวจต้องครอบคลุมอย่างน้อย: eligibility เหมาะสม, reward_type ต้องเป็น `GUARANTEED` เท่านั้น (ปฏิเสธอัตโนมัติถ้าไม่ใช่), เนื้อหาปลอดภัยตาม Appendix B, terms ถูกต้อง, brand asset เหมาะสม
- FR22.3 Global Challenge ต้องผ่านเกณฑ์ review ที่เข้มกว่า Personal Challenge เสมอ (Master Concept §41) — ในทางปฏิบัติหมายถึง reviewer ต้อง sign-off แบบ manual เสมอ ไม่มี auto-approve สำหรับ Global Challenge แม้แต่กรณีเดียว

**AC**
- Campaign ที่ decision = `REJECTED` หรือ `CHANGES_REQUESTED` ต้องกลับไปอยู่ใน `review_status` ที่ไม่ใช่ `APPROVED` และ `status` ต้องไม่มีทางเป็น `PUBLISHED` ได้เลย

---

## 23. Sponsor Dashboard

**User story:** ในฐานะ Sponsor ฉันอยากเห็นว่าเงินที่จ่ายไปสร้างผลลัพธ์อะไรจริง ๆ เพื่อประเมินความคุ้มค่าของแคมเปญ

**FR**
- FR23.1 Dashboard แสดง metric ครบตาม Master Concept §44: Participants, Active, Completion %, Check-ins, Cheers, Pushes, Shares, Rewards issued, Rewards redeemed, Funnel (View→Join→Active→Complete→Reward→Redemption), Social Funnel (Share→Visit→Signup→Join)
- FR23.2 ข้อมูลที่แสดงต้องเป็น aggregate เท่านั้น — ห้ามแสดงชื่อ/ข้อมูลระบุตัวตนของผู้เข้าร่วมรายบุคคลใน Dashboard นี้เด็ดขาด (แยกจาก Expert Supporter ที่ผู้ใช้ยินยอมเปิดเผยเองในข้อ 28)
- FR23.3 Metric คำนวณจากตารางที่มีอยู่แล้ว (§4–§8 ของ DB schema) — ควรทำเป็น scheduled aggregation แทน query สดเพื่อรองรับ scale

**AC**
- Sponsor ที่ query API/Dashboard ต้องไม่สามารถเข้าถึงข้อมูลของ Campaign ที่ไม่ใช่ของตัวเองได้ (authorization scoped by sponsor_id)

---

## 24. Verified Professional — สมัครขอ Verify

**User story:** ในฐานะผู้เชี่ยวชาญที่มีใบอนุญาตจริง ฉันอยากให้ badge ของฉันน่าเชื่อถือกว่าคนที่แค่ประกาศ experience เอง เพื่อให้คนที่ต้องการความช่วยเหลือแยกได้ว่าใครผ่านการตรวจสอบแล้ว

**FR**
- FR24.1 ผู้ใช้ยื่นคำขอผ่าน `verification_requests` แนบเอกสาร/ใบอนุญาต
- FR24.2 การอนุมัติเป็น manual โดย admin เท่านั้นใน V1 ของฟีเจอร์นี้ — ไม่มี auto-approve
- FR24.3 เมื่ออนุมัติ ระบบสร้าง row `community_badges` (badge=`VERIFIED_PROFESSIONAL`, granted_by=`ADMIN`) โดยอัตโนมัติ
- FR24.4 badge นี้ต้องแสดงคู่กับสาขาที่ได้รับอนุมัติเท่านั้น (ไม่ใช่ badge เหมารวมทุกสาขา) — โดยเฉพาะ Health/Legal/Finance/Mental Health ต้องระบุสาขาชัดเจนที่ UI ทุกจุด

**AC**
- ผู้ใช้ที่ถูก `REJECTED` เห็นเหตุผลและยื่นใหม่ได้โดยไม่ต้องสร้าง request ซ้ำซ้อน (edit/resubmit บน request เดิม หรือสร้างใหม่ก็ได้ แต่ history เก่าต้องเก็บไว้)
- badge `VERIFIED_PROFESSIONAL` ต้องไม่มีทางได้มาโดยไม่ผ่าน `verification_requests.status = APPROVED` (บังคับที่ระดับ business logic ไม่ใช่แค่ policy)

---

## 25. Challenge Me Expert — โปรไฟล์และการว่าจ้าง (Admin-curated)

**User story:** ในฐานะ Challenge Me ฉันอยากควบคุมคุณภาพของผู้เชี่ยวชาญที่ให้บริการ paid consultation เอง เพื่อรักษามาตรฐานและความน่าเชื่อถือของแบรนด์

**FR**
- FR25.1 `expert_profiles` สร้างได้โดย admin เท่านั้น (ไม่ใช่ open marketplace ที่ใครก็สมัครเองได้) ตาม Master Concept §31
- FR25.2 `expert_profiles.payout_rate` (อัตราที่จ่ายให้ Expert) เป็น internal field ที่ต้องไม่ส่งออกไปยัง client ของผู้ใช้ทั่วไปหรือของ Expert เองเด็ดขาด — ควบคุมที่ API response layer
- FR25.3 Public Profile แสดง: badge ⭐ Challenge Me Expert, ✓ Verified by Challenge Me, สาขา, ระยะเวลา session, ราคา
- FR25.4 Availability ใน V1 ของฟีเจอร์นี้เป็น manual slot (`expert_availability`) — ยังไม่ต้องมี recurring-availability engine หรือ calendar sync อัตโนมัติ

**AC**
- Expert ที่ `status = SUSPENDED` หรือ `INACTIVE` ต้องหายไปจากผลการค้นหา/matching ทันที แต่ booking ในอดีตยังอ้างอิงถึงได้ (ไม่ลบ record)

---

## 26. Expert Discovery & Booking (Paid Consultation)

**User story:** ในฐานะผู้ใช้ที่ต้องการความช่วยเหลือมากกว่าที่ community ให้ได้ ฉันอยากจองปรึกษาผู้เชี่ยวชาญที่ตรงกับปัญหาของฉัน โดยไม่ถูกยัดเยียดให้ซื้อบริการตลอดเวลา

**FR**
- FR26.1 ระบบเสนอ Paid Consultation เฉพาะใน "Moment of Need" ตาม Master Concept §30 เท่านั้น (ไม่มี progress นาน, push หลายครั้ง, attempt หลายรอบ, milestone ค้างนาน, ผู้ใช้กด "I need help" เอง, หรือ Health Challenge ที่ต้องการ professional support) — ห้ามแสดง CTA นี้แบบถาวรในทุกหน้าจอ
- FR26.2 Matching ใช้เกณฑ์ครบตาม §28: Challenge Category, Goal, Milestone, Current problem, Expertise, Experience, Professional qualification, Language, Location, Age appropriateness, Availability, Rating, Community reputation, Free/Paid preference — ใน V1 ของฟีเจอร์นี้ทำเป็น weighted rule-based scoring ก่อน ยังไม่ต้องเป็น ML
- FR26.3 Booking flow ต้องเลือก slot จาก `expert_availability` ที่ `is_booked = false` เท่านั้น และต้อง lock slot ทันทีตอนเริ่ม booking (ป้องกันการจองซ้ำ, race condition)
- FR26.4 ชำระเงินสำเร็จ (`payments.status = PAID`) จึงจะเปลี่ยน `bookings.status = CONFIRMED` — ห้าม confirm booking ก่อนชำระเงินยืนยันจาก payment provider
- FR26.5 มีนโยบาย cancel/reschedule ชัดเจน (Challenge Me กำหนด, ระบุใน Terms) พร้อม refund policy ที่สะท้อนใน `payments.status`

**AC**
- ผู้ใช้ที่ Assistance Ladder ยังไม่ผ่านขั้น Self/Social/Community (Master Concept §29) ยังคงเห็นตัวเลือก Paid Expert ได้เสมอถ้าต้องการ — Ladder เป็นลำดับการ "แนะนำ" ไม่ใช่การ "บังคับ" ผ่านขั้นตอน
- Double-booking บน slot เดียวกันต้องเป็นไปไม่ได้ที่ระดับ DB constraint (ไม่ใช่แค่ตรวจฝั่ง application)

---

## 27. Consultation → Expert Recommendation → Adjust Plan

**User story:** ในฐานะผู้ใช้ที่ปรึกษาผู้เชี่ยวชาญแล้ว ฉันอยากให้คำแนะนำที่ได้ถูกนำมาปรับ Challenge ของฉันได้จริง โดยไม่ต้องเริ่มใหม่หรือเสีย Daruma เดิม

**FR**
- FR27.1 Expert กรอก `expert_recommendations` หลังจบ session พร้อม `recommended_goal`
- FR27.2 ผู้ใช้ต้องกด Accept/Keep เองเสมอ — ห้าม apply คำแนะนำอัตโนมัติ
- FR27.3 เมื่อ Accept: Challenge/Daruma/History เดิมทั้งหมดยังอยู่ครบ มีการบันทึก event "Goal adjusted with Challenge Me Expert" ใน Journey History (เก็บ snapshot เป้าหมายเดิมเหมือนกลไก Change My Goal ในข้อ 17)
- FR27.4 ไม่ว่าผลจะ Accept หรือ Keep ก็ตาม ต้องนับเป็น 1 "Consult" สำหรับ metric Consult → Goal Adjustment / Consult → Completion (Master Concept §56)

**AC**
- `expert_recommendations.accepted` ต้องแยกความต่างระหว่าง "ยังไม่ตอบ" (null) กับ "ปฏิเสธ" (false) ได้ชัดเจน เพื่อไม่ให้ metric เพี้ยน

---

## 28. Expert Supporter

**User story:** ในฐานะผู้ใช้ที่ปรึกษาผู้เชี่ยวชาญแล้วรู้สึกว่าอยากให้ติดตามต่อ ฉันอยากอนุญาตให้ Expert เห็น progress ของฉันต่อได้ โดยควบคุมได้ว่าเปิดเผยแค่ไหน

**FR**
- FR28.1 หลัง booking เสร็จ ผู้ใช้เลือกได้ว่าจะอนุญาตให้ Expert เป็น `EXPERT_SUPPORTER` หรือไม่ (เพิ่ม row ใน `supporters` ด้วย `role = EXPERT_SUPPORTER`, `source_booking_id` อ้างถึง booking นั้น)
- FR28.2 Expert Supporter ทำได้เท่าที่ Supporter ทั่วไปทำได้ (Follow Progress, Cheer, Comment) บวกสามารถส่ง Recommendation เพิ่มเติมได้ (สร้าง `expert_recommendations` row ใหม่แม้ไม่มี booking ใหม่)
- FR28.3 `visibility_scope` ของ Expert Supporter ต้องตั้งแยกจาก Supporter ทั่วไปได้ โดยเฉพาะเมื่อ Challenge เกี่ยวข้องกับข้อมูลสุขภาพ

**AC**
- ผู้ใช้ถอนสิทธิ์ Expert Supporter ได้ตลอดเวลาเหมือน Supporter ปกติ (ใช้กลไกเดียวกับ FR11.4) และ Expert จะหยุดเห็นข้อมูลใหม่ทันที

---

## 29. Sponsor-funded Expert (B2B2C)

**User story:** ในฐานะ Sponsor ฉันอยากมอบสิทธิ์ปรึกษาผู้เชี่ยวชาญฟรีให้คนที่เข้าร่วมแคมเปญของฉัน เพื่อเพิ่มคุณค่าให้แคมเปญมากกว่าการแจก reward เฉย ๆ

**FR**
- FR29.1 Sponsor กำหนด quota ผ่าน `sponsor_expert_vouchers` (จำนวนคน, สาขา) ตอนสร้าง/แก้ไข Campaign
- FR29.2 ผู้เข้าร่วมที่เข้าเงื่อนไข (เช่น 100 คนแรกที่ complete) เห็นสิทธิ์ claim และ booking flow ข้าม step ชำระเงิน (`bookings.funded_by = SPONSOR`)
- FR29.3 การ claim ต้อง atomic กับการเช็ค `claimed_count < total_quota` (ป้องกัน race condition ตอน quota ใกล้เต็ม) และบังคับ unique(`voucher_id`, `user_id`) ที่ระดับ DB

**AC**
- Sponsor เห็นจำนวน voucher ที่ claim ไปแล้วใน Sponsor Dashboard (ข้อ 23) แบบ real-time
- ผู้ใช้ที่ claim voucher ไปแล้วไม่สามารถ claim ซ้ำจาก voucher เดียวกันได้ แม้จะพยายามผ่าน API โดยตรง

---

## 30. Corporate Wellness Challenge

**User story:** ในฐานะ HR/Wellness lead ขององค์กร ฉันอยากซื้อโปรแกรม Challenge ให้พนักงานและดูภาพรวมผลลัพธ์ โดยไม่ล้วงข้อมูลส่วนตัวของพนักงานแต่ละคน

**FR**
- FR30.1 `corporate_accounts` ผูกกับ `sponsors` (1:1) พร้อม `package_tier` ที่กำหนดฟีเจอร์ที่เปิดใช้ได้ (Daruma, Community, Expert Support, Dashboard)
- FR30.2 Eligibility ของพนักงานตรวจสอบผ่าน `email_domain` เป็นหลัก รองรับ manual allow-list เพิ่มเติมถ้าองค์กรมีอีเมลหลายโดเมน
- FR30.3 Corporate Admin (`corporate_admins`) เข้าถึงได้เฉพาะ Dashboard แบบ aggregate เท่านั้น (ใช้ authorization/metric เดียวกับ Sponsor Dashboard ข้อ 23) — ห้ามเห็น check-in, comment, หรือข้อมูลสุขภาพรายบุคคลของพนักงานเด็ดขาด แม้จะเป็นคนจ่ายเงินก็ตาม
- FR30.4 Corporate Challenge ใช้กลไก Global Challenge เดิมทั้งหมด (reward ต้อง `GUARANTEED`, ผ่าน review เหมือน Global Challenge ทั่วไป)

**AC**
- พนักงานที่เข้าร่วม Corporate Challenge ต้องเห็น consent ชัดเจนว่าอะไรที่นายจ้างเห็นได้/เห็นไม่ได้ ก่อนกด Join
- Corporate Admin ที่พยายามดูข้อมูลรายบุคคลผ่าน API ต้องถูกปฏิเสธที่ authorization layer ไม่ใช่แค่ซ่อนใน UI

---

## 31. B2C Premium — สมัครสมาชิก

**User story:** ในฐานะผู้ใช้ที่จริงจังกับ Challenge ของตัวเองมาก ฉันอยากได้เครื่องมือเพิ่มเติม (analytics, AI coach, custom themes) เพื่อสนับสนุนการทำเป้าหมายให้ดีขึ้น

**FR**
- FR31.1 `subscriptions` รองรับแผน `MONTHLY`/`ANNUAL`/`FAMILY` ผูกกับ payment provider เดียวกับที่ใช้ใน Expert Marketplace
- FR31.2 ฟีเจอร์ Premium (Advanced Analytics, AI Coach, Advanced Groups, Custom Themes, Private Communities, Advanced Daruma Display, Personal Reports) ต้องเป็น feature flag ที่ตรวจจาก `subscriptions.status = ACTIVE` แบบ real-time ไม่ cache นานเกินไป (ผู้ใช้ยกเลิกแล้วต้องเสียสิทธิ์ทันทีเมื่อ current_period_end ผ่านไป)
- FR31.3 Family Plan: เจ้าของแผนเชิญสมาชิกผ่าน `family_group_members`; สมาชิกแต่ละคนมี Challenge/Daruma ส่วนตัวแยกกันเสมอ ได้แค่สิทธิ์ Premium ร่วมกัน ไม่ได้แชร์ข้อมูล Challenge กัน (เว้นแต่ผ่าน Supporter ตามปกติ)
- FR31.4 ยกเลิก subscription แล้ว ข้อมูลที่เคยสร้างตอนเป็น Premium (เช่น Personal Report เก่า) ยังดูย้อนหลังได้แบบ read-only แต่สร้างใหม่ไม่ได้

**AC**
- ฟีเจอร์ Premium ทุกตัวต้อง gate ที่ backend ไม่ใช่แค่ซ่อนปุ่มใน UI (ป้องกัน bypass ผ่าน API)
- สมาชิก Family Plan ที่ถูกเจ้าของแผนเอาออก เสียสิทธิ์ Premium ทันที แต่ Challenge/Daruma ของตัวเองไม่หายไปไหน

---

## 32. Health Challenge — Clinician-Approved Target

**User story:** ในฐานะผู้ใช้ที่มีเป้าหมายสุขภาพเฉพาะบุคคล ฉันอยากตั้ง target ที่แพทย์/ผู้เชี่ยวชาญของฉันรับรองจริง แทนที่จะใช้ตัวเลขมาตรฐานที่อาจไม่เหมาะกับร่างกายฉัน

**FR**
- FR32.1 Challenge หมวดสุขภาพที่ต้องการ Clinical Target (ไม่ใช่ Behavioral Goal ทั่วไป) ต้องผ่าน `clinician_approved_targets` ก่อนเปิดใช้งานได้
- FR32.2 `clinician_user_id` ต้องเป็น user ที่มี `community_badges.badge = VERIFIED_PROFESSIONAL` ในสาขาที่เกี่ยวข้องเท่านั้น — ระบบต้อง validate ความสัมพันธ์นี้ ไม่ปล่อยให้ user ทั่วไป approve เป้าหมาย clinical ได้
- FR32.3 Challenge ที่ผูกกับ target ประเภทนี้ ต้องมี `privacy_fields.show_health_data = false` เป็น default เสมอ และ override เป็น public ไม่ได้โดยไม่มี consent เพิ่มเติมนอกเหนือ consent มาตรฐานของ Challenge
- FR32.4 ถ้าไม่ต้องการผ่านขั้นตอนนี้ ผู้ใช้ยังสร้าง Challenge หมวดสุขภาพแบบ Behavioral Goal (activity ตามแผน, education, นัดหมาย, food tracking, care plan adherence) ได้ทันทีแบบ Personal Challenge ปกติ ไม่ต้องรอ approve

**AC**
- ไม่มีทางสร้าง Challenge ที่มี clinical target แบบไม่มาตรฐาน (เช่น ตัวเลข HbA1c เฉพาะบุคคล) โดยไม่ผ่าน `clinician_approved_targets.status = APPROVED` — บังคับที่ business logic
- Target ที่ `REJECTED` ต้องมีทางเลือกกลับไปใช้ Behavioral Goal ได้ทันทีโดยไม่ต้องเริ่มสร้าง Challenge ใหม่ทั้งหมด

---

## 33. Wearable / External Health Platform Integration

**User story:** ในฐานะผู้ใช้ที่มี smartwatch/fitness app อยู่แล้ว ฉันอยากให้ check-in ของ Challenge ที่เกี่ยวกับกิจกรรมทางกาย sync มาอัตโนมัติ แทนที่จะกรอกซ้ำเอง

**FR**
- FR33.1 เชื่อมต่อผ่าน OAuth/consent flow มาตรฐานของแต่ละ provider บันทึกไว้ที่ `wearable_connections` (เก็บ token ผ่าน secret store ไม่เก็บใน DB โดยตรง)
- FR33.2 Challenge ที่ `measurement_type` รองรับ auto-sync (เช่น DISTANCE, COUNT ที่ map กับข้อมูล wearable ได้) เปิด toggle auto check-in ได้ต่อ Challenge
- FR33.3 Check-in ที่ sync มาจาก wearable บันทึกด้วย `check_ins.source = WEARABLE` และ `wearable_connection_id` อ้างอิงไว้ ผู้ใช้ยังแก้ไข/เพิ่ม note ได้เหมือน check-in ปกติ
- FR33.4 Sync ล้มเหลวหรือไม่มีข้อมูลวันนั้น ต้อง fallback เป็น self-report ตามปกติ ไม่ auto-mark ว่าพลาด check-in

**AC**
- ผู้ใช้ตัดการเชื่อมต่อ wearable ได้ตลอดเวลา (`wearable_connections.status = DISCONNECTED`) โดยไม่กระทบ check-in ในอดีตที่ sync มาแล้ว
- ข้อมูลจาก wearable ที่เกี่ยวกับสุขภาพ ต้องอยู่ภายใต้ privacy control เดียวกับข้อมูลสุขภาพที่กรอกเอง (`privacy_fields.show_health_data`)

---
---

## Appendix A — กฎการเขียน copy สำหรับ Push/Rescue (อ้างอิง FR12.3, FR13.*)

**ห้ามใช้เด็ดขาด:** น้ำเสียง shame, guilt หรือท้าทาย ("ขี้เกียจอีกแล้ว", "จะยอมแพ้เหรอ?", "you're failing", หรือ "don't give up now" แบบตำหนิ)

**ตัวอย่างน้ำเสียงที่ approve แล้ว (จาก Master Concept §12, §51):**
- "กลับมาเมื่อพร้อมนะ ❤️"
- "Daruma ยังรอตาอีกข้างอยู่"
- "N คนกำลังรอคุณกลับมา"

Template notification ทุกแบบสำหรับ push/rescue/reminder ต้อง review เทียบกับ list นี้ก่อน ship; ข้อความอิสระจากฝั่งผู้กด push ถูกปิดกั้นตั้งแต่ระดับ design (FR12.3) แล้ว list นี้จึงคุมเฉพาะ copy ที่ระบบ generate เอง

---

## Appendix B — Safety & Moderation (ข้ามหลายฟีเจอร์ ใช้กับข้อ 10, 11, 12, 18, 20)

- ทุก surface ที่เป็น user-generated content (Comment, Help Request/Reply, ชื่อ/รายละเอียด Challenge) ต้องรองรับ Report, Block, Mute; เจ้าของ Hide ได้; moderator hard-hide/ban ได้; และมีทาง appeal — แม้ใน V1 ขั้นตอน appeal จะเป็น manual/admin ก็ตาม
- ประเภทเนื้อหาที่ต้องตรวจจับ/บล็อกตอนสร้าง Challenge (field title/description/category): self-harm, dangerous activities, violence, illegal acts, extreme dieting/eating-disorder encouragement, drug misuse, dangerous driving, sexual exploitation, harm to others, unsafe challenges involving minors V1 ทำเป็น keyword/category blocklist บวก manual review queue ได้ ยังไม่ต้องมี automated classification เต็มรูปแบบ แต่ data model ของ review queue ต้องมีไว้รองรับ
- Global Challenge ต้องผ่านเกณฑ์ review ที่เข้มกว่า Personal Challenge ก่อนจะ `status = PUBLISHED` (Master Concept §41)
- Challenge หมวดสุขภาพ ห้ามกำหนด clinical target แบบเดียวกันสำหรับทุกคนเด็ดขาด (เช่น ตัวเลข HbA1c ตายตัว) — V1 ควรจำกัด Challenge หมวดสุขภาพให้เป็นเป้าหมายเชิงพฤติกรรม/self-report เท่านั้น (ทำตามแผนกิจกรรม, education, ติดตามนัดหมาย) แทน clinical target และต้อง flag เป้าหมายที่ฟังดูเป็น clinical ให้เข้า manual review

# Challenge Me — Database Schema (Full Master Concept)

ขอบเขต: เอกสารนี้ครอบคลุมทั้งหมด — **ส่วนที่ 1 (§1–§12)** คือ schema ที่จำเป็นสำหรับ 20 ฟีเจอร์ MVP V1 (Master Concept §54) **ส่วนที่ 2 (§13–§21)** คือ schema สำหรับฟีเจอร์ที่เดิมเลื่อนไป V2 — Sponsor Portal เต็มรูปแบบ, Expert Marketplace/Payment, Professional Verification, Corporate Model, B2C Premium, Health Clinical Target, Wearable Integration ตาราง/field ทั้งหมดในส่วนที่ 2 พร้อม deploy ได้ แต่ยังไม่ผูกกับ UI ใน V1

หมายเหตุ: ชื่อ table/field/enum คงไว้เป็นภาษาอังกฤษเพราะเป็นสิ่งที่จะใช้ในโค้ดจริง ส่วนคำอธิบายเขียนเป็นภาษาไทย `id` เป็น UUID ทั้งหมดเว้นแต่ระบุไว้เป็นอย่างอื่น timestamp ทั้งหมดเป็น UTC FK = foreign key

---

## 1. ภาพรวม Entity

```
User ──< Profile (1:1)
User ──< ExpertiseTag (1:N)               "ช่วยคนอื่นเรื่องอะไรได้บ้าง"
User ──< Challenge (1:N, เป็นเจ้าของ)
Challenge ──< ChallengeAttempt (1:N)
Challenge ──1:1── Daruma
Challenge ──< Milestone (1:N)             (Life challenge; Personal challenge ไม่บังคับมี)
Milestone ──1:1── Daruma (nullable)       "Milestone Daruma"
ChallengeAttempt ──< CheckIn (1:N)
ChallengeAttempt ──< Extension (1:N)
Challenge ──< Cheer (1:N)
Challenge ──< Comment (1:N)
Challenge ──< Supporter (1:N)             join table User <-> Challenge
Challenge ──< PushEvent (1:N)
ChallengeAttempt ──1:1── RescueState (nullable)
Challenge ──< ShareCard (1:N)
User ──< Achievement (1:N)
Challenge ──< HelpRequest (1:N)
HelpRequest ──< HelpReply (1:N)
GlobalChallenge ──< GlobalChallengeParticipant (1:N) ──1:1── ChallengeAttempt
User ──< Notification (1:N)
User ──< Report (1:N, ในฐานะผู้ report)
```

---

## 2. Core Identity

### `users`
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID PK | |
| email | string, unique, nullable | ต้องมี email หรือ phone อย่างใดอย่างหนึ่ง |
| phone | string, unique, nullable | |
| auth_provider | enum: `EMAIL`, `PHONE_OTP`, `GOOGLE`, `APPLE`, `FACEBOOK` | |
| password_hash | string, nullable | null ถ้าใช้ social login อย่างเดียว |
| status | enum: `ACTIVE`, `SUSPENDED`, `DELETED` | ค่า default `ACTIVE` |
| created_at | timestamp | |
| last_login_at | timestamp | |

### `profiles`
| Field | Type | หมายเหตุ |
|---|---|---|
| user_id | UUID PK, FK → users.id | ความสัมพันธ์ 1:1 |
| display_name | string | |
| avatar_url | string, nullable | |
| bio | text, nullable | |
| language | enum: `TH`, `EN` | default `TH` |
| default_push_permission | enum: `NOBODY`, `SUPPORTERS`, `COMMUNITY` | ใช้เป็นค่า default ตอนสร้าง Challenge ใหม่ |
| notifications_enabled | boolean | default true |
| updated_at | timestamp | |

### `expertise_tags`
"ช่วยคนอื่นเรื่องอะไรได้บ้าง" — tag ที่ผู้ใช้ประกาศเอง (self-declare) (Flow 1, Flow 15)
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users.id | |
| category | string | เช่น `smoking_cessation`, `running`, `career_medicine` |
| label | string | ข้อความที่แสดง เช่น "คนที่เลิกบุหรี่สำเร็จ 5 ปี" |
| created_at | timestamp | |

### `community_badges`
สถานะที่ user ได้รับ — แยกเป็นตารางของตัวเอง (ไม่ใช่แค่ computed field) เพื่อให้ในอนาคตระบบ verification ของ V2 แนบหลักฐานเพิ่มได้
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users.id | |
| badge | enum: `EXPERIENCED_HELPER`, `COMMUNITY_GUIDE`, `VERIFIED_PROFESSIONAL`, `EXPERT` | V1 ให้ auto เฉพาะ `EXPERIENCED_HELPER`/`COMMUNITY_GUIDE` จาก self-declare + activity ส่วน `VERIFIED_PROFESSIONAL`/`EXPERT` เตรียม schema ไว้แต่ต้องผ่านขั้นตอน verify โดย admin ซึ่งยังไม่ได้ build ใน V1 |
| granted_at | timestamp | |
| granted_by | enum: `SYSTEM`, `ADMIN` | |

---

## 3. Challenge & Daruma

### `challenges`
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID PK | |
| owner_id | UUID FK → users.id | |
| type | enum: `PERSONAL`, `LIFE` | |
| title | string | |
| description | text, nullable | |
| category | string | |
| goal_description | string | |
| measurement_type | enum: `YES_NO`, `COUNT`, `DISTANCE`, `TIME`, `NUMBER`, `SCORE`, `CHECKLIST`, `CUSTOM` | |
| measurement_unit | string, nullable | เช่น `km`, `บาท`, `ครั้ง` |
| target_value | numeric, nullable | null สำหรับ YES_NO/CHECKLIST |
| original_goal_snapshot | jsonb, nullable | บันทึกไว้ตอนเปลี่ยนเป้าหมายผ่าน "Change My Goal" (Flow 13) เพื่อรักษา Journey History |
| checkin_frequency | enum: `DAILY`, `WEEKLY`, `CUSTOM` | |
| start_date | date | |
| planned_end_date | date, nullable | Life challenge ปล่อยเป็น open-ended ได้ |
| reward_text | string, nullable | ข้อความอิสระ ระบบไม่ถือเงินสำหรับ field นี้เด็ดขาด |
| privacy_level | enum: `PUBLIC`, `SUPPORTERS`, `PRIVATE` | |
| privacy_fields | jsonb | flag แยกรายละเอียด เช่น `{"show_progress": true, "show_checkins": true, "show_photos": false, "show_comments": true, "show_health_data": false}` |
| push_permission | enum: `NOBODY`, `SUPPORTERS`, `COMMUNITY` | |
| status | enum: `DRAFT`, `ACTIVE`, `NEEDS_PUSH`, `RESCUE`, `NOT_YET`, `COMPLETED` | ดู state machine §7 |
| is_global | boolean | true ถ้าสร้างผ่านการ join Global Challenge (Flow 16) |
| created_at | timestamp | |
| updated_at | timestamp | |

### `challenge_attempts`
รองรับ Try Again (Flow 13) โดยไม่เสียประวัติเดิม — Challenge หนึ่งอันมี Attempt อย่างน้อย 1 เสมอ
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID PK | |
| challenge_id | UUID FK → challenges.id | |
| attempt_number | int | 1, 2, 3… |
| status | enum: `ACTIVE`, `NEEDS_PUSH`, `RESCUE`, `NOT_YET`, `COMPLETED` | ตรงกับ Challenge.status ปัจจุบัน; Challenge.status derive มาจาก Attempt ปัจจุบัน |
| started_at | timestamp | |
| ended_at | timestamp, nullable | |
| best_streak | int | denormalize ไว้เพื่อแสดงผลใน profile ได้เร็ว |
| created_at | timestamp | |

### `daruma`
1:1 กับ Challenge (Master Daruma สำหรับ Life challenge) — ดู `milestones.daruma_id` สำหรับ Milestone Daruma ด้วย
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID PK | |
| challenge_id | UUID FK → challenges.id, unique | |
| left_eye_filled_at | timestamp, nullable | ตั้งค่าได้จากการกดของผู้ใช้เท่านั้น (Flow 4) |
| right_eye_filled_at | timestamp, nullable | ตั้งค่าได้จากการกดของผู้ใช้เท่านั้น (Flow 11) |
| rarity_tier | enum: `SMALL_7D`, `CLASSIC_30D`, `SPECIAL_100D`, `LEGENDARY_365D`, `CUSTOM` | คำนวณจากระยะเวลาจริงของ Challenge ตอนสำเร็จ |
| is_limited_sponsor_edition | boolean | true ถ้าออกผ่าน Global Challenge ที่มี Limited Daruma |
| sponsor_edition_ref | string, nullable | อ้างอิง edition/pattern ที่ sponsor กำหนด (รายละเอียดเต็มอยู่ใน `global_challenges` ของ V2) |
| kintsugi_variant | boolean | true ถ้าได้ 🏆 FINALLY (สำเร็จหลังผ่าน NOT_YET มาอย่างน้อย 1 ครั้ง) |
| created_at | timestamp | |

### `milestones`
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID PK | |
| challenge_id | UUID FK → challenges.id | |
| daruma_id | UUID FK → daruma.id, nullable | Milestone Daruma เฉพาะ Life challenge |
| title | string | |
| target_description | string, nullable | |
| order_index | int | |
| status | enum: `LOCKED`, `IN_PROGRESS`, `DONE` | |
| completed_at | timestamp, nullable | |

### `extensions`
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID PK | |
| challenge_attempt_id | UUID FK → challenge_attempts.id | |
| days_added | int | 7 / 14 / 30 / กำหนดเอง |
| created_at | timestamp | |

---

## 4. Check-in & Progress

### `check_ins`
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID PK | |
| challenge_attempt_id | UUID FK → challenge_attempts.id | |
| checkin_date | date | 1 record ต่อ 1 period (วัน/สัปดาห์) บังคับด้วย unique(`challenge_attempt_id`, `checkin_date`) |
| value_bool | boolean, nullable | สำหรับ YES_NO |
| value_number | numeric, nullable | สำหรับ COUNT/DISTANCE/TIME/NUMBER/SCORE |
| value_checklist | jsonb, nullable | `[{"item": "...", "done": true}]` |
| note | text, nullable | |
| media_url | string, nullable | |
| created_at | timestamp | |

Streak และ progress % เป็นค่า **คำนวณสด** ไม่ได้เก็บซ้ำ ยกเว้น `challenge_attempts.best_streak` ที่ denormalize ไว้เพื่อความเร็วในการอ่าน และอัปเดตทุกครั้งที่มีการ check-in ใหม่

---

## 5. ชั้นข้อมูล Social

### `cheers`
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID PK | |
| challenge_id | UUID FK → challenges.id | |
| user_id | UUID FK → users.id | |
| created_at | timestamp | |
| — | unique(`challenge_id`, `user_id`) | ทำงานแบบ toggle: ลบ record เพื่อยกเลิก cheer |

### `comments`
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID PK | |
| challenge_id | UUID FK → challenges.id | |
| user_id | UUID FK → users.id | |
| body | text | |
| status | enum: `VISIBLE`, `HIDDEN_BY_OWNER`, `HIDDEN_BY_MOD`, `DELETED` | |
| created_at | timestamp | |

### `supporters`
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID PK | |
| challenge_id | UUID FK → challenges.id | |
| user_id | UUID FK → users.id | คือ supporter |
| invited_by | UUID FK → users.id | |
| status | enum: `INVITED`, `ACTIVE`, `MUTED`, `REMOVED` | |
| visibility_scope | jsonb | override ของ `privacy_fields` เฉพาะ supporter คนนี้ ถ้าเจ้าของให้สิทธิ์เห็นมาก/น้อยกว่าปกติ |
| created_at | timestamp | |
| responded_at | timestamp, nullable | |

### `push_events`
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID PK | |
| challenge_id | UUID FK → challenges.id | |
| challenge_attempt_id | UUID FK → challenge_attempts.id | |
| pusher_user_id | UUID FK → users.id | |
| created_at | timestamp | |
| — | rate limit บังคับที่ application layer: 1 push ต่อคนต่อ attempt ต่อ 24 ชม. |

### `rescue_states`
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID PK | |
| challenge_attempt_id | UUID FK → challenge_attempts.id, unique ระหว่างที่ active | |
| triggered_at | timestamp | |
| resolved_at | timestamp, nullable | ตั้งเมื่อเจ้าของกด "I'M BACK" แล้ว check-in สำเร็จ |
| push_count_at_trigger | int | snapshot ไว้ใช้ทำข้อความ "N คนช่วยดันคุณ" |

---

## 6. Achievement & Sharing

### `achievements`
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users.id | |
| type | enum: `IM_BACK`, `SECOND_TRY`, `NEVER_GIVE_UP`, `FINALLY`, `CHEER_LEADER`, `MOTIVATOR`, `NEVER_WALK_ALONE`, `RESCUER`, `HELPING_HAND`, `COMMUNITY_GUIDE_100`, `DARUMA_MAKER` | เพิ่ม enum ใหม่ได้เรื่อย ๆ เมื่อมี achievement เพิ่ม |
| related_challenge_id | UUID FK → challenges.id, nullable | |
| earned_at | timestamp | |

### `share_cards`
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID PK | |
| challenge_id | UUID FK → challenges.id | |
| type | enum: `START`, `PROGRESS`, `IM_BACK`, `COMPLETE`, `MILESTONE` | ตั้งใจไม่มี Not-Yet (ไม่บังคับแชร์สถานะที่ยังไม่สำเร็จ) |
| image_url | string | asset ของการ์ดที่ generate ไว้ |
| deep_link | string | |
| created_at | timestamp | |

---

## 7. Community Help (ฟรี)

### `help_requests`
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID PK | |
| challenge_id | UUID FK → challenges.id | |
| requester_id | UUID FK → users.id | |
| body | text | |
| visibility | enum: `SUPPORTERS`, `COMMUNITY` | |
| status | enum: `OPEN`, `ANSWERED`, `CLOSED` | |
| created_at | timestamp | |

### `help_replies`
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID PK | |
| help_request_id | UUID FK → help_requests.id | |
| helper_id | UUID FK → users.id | |
| body | text | |
| marked_helpful | boolean | default false; มีผลต่อ counter ชื่อเสียงใน `community_badges` |
| created_at | timestamp | |

---

## 8. Global Challenge (ฝั่งผู้เข้าร่วม, V1)

V1 สร้างโดย Admin เท่านั้น — ยังไม่มีชุดตาราง `sponsors`/campaign-builder แบบ self-serve เต็มรูปแบบ แต่มีตาราง `sponsors` แบบย่อไว้ก่อน เพราะ Global Challenge ต้องแสดงชื่อ/terms ของ sponsor

### `sponsors`
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID PK | |
| name | string | |
| logo_url | string, nullable | |
| contact_email | string | ใช้ภายในทีมเท่านั้น |

### `global_challenges`
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID PK | |
| sponsor_id | UUID FK → sponsors.id, nullable | null = Challenge Me จัดเอง ไม่มี sponsor ภายนอก |
| title | string | |
| description | text | |
| category | string | |
| goal_description | string | |
| measurement_type | enum | ใช้ domain เดียวกับ `challenges.measurement_type` |
| target_value | numeric, nullable | |
| start_date | date | |
| end_date | date | |
| capacity | int, nullable | จำนวนคนเข้าร่วมสูงสุด; null = ไม่จำกัด |
| eligibility_rules | jsonb | เช่น ช่วงอายุ, พื้นที่ |
| reward_text | string | |
| reward_type | enum: `GUARANTEED`, `NONE` | V1 ไม่รองรับกลไกจับฉลาก/pool เด็ดขาดโดยตั้งใจ (Master Concept §37/§42) |
| has_limited_daruma | boolean | |
| limited_daruma_total | int, nullable | |
| limited_daruma_claimed | int | default 0 |
| terms_url | string | |
| status | enum: `DRAFT`, `PUBLISHED`, `CLOSED` | Admin จัดการใน V1 |
| created_at | timestamp | |

### `global_challenge_participants`
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID PK | |
| global_challenge_id | UUID FK → global_challenges.id | |
| user_id | UUID FK → users.id | |
| challenge_attempt_id | UUID FK → challenge_attempts.id, unique | attempt ส่วนตัวที่สร้างตอนกด Join |
| consent_accepted_at | timestamp | ต้องมีก่อนการ join จะสมบูรณ์ |
| status | enum: `JOINED`, `ACTIVE`, `COMPLETED`, `REWARD_ISSUED`, `REWARD_REDEEMED`, `ENDED_NOT_MET`, `CONVERTED_TO_PERSONAL` | |
| reward_code | string, nullable | ออกให้ตอน `REWARD_ISSUED` |
| converted_challenge_id | UUID FK → challenges.id, nullable | ตั้งค่าถ้าผู้เข้าร่วมเลือก "Continue as Personal Challenge" |
| joined_at | timestamp | |

---

## 9. Notification, Report & Moderation

### `notifications`
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users.id | ผู้รับ |
| type | enum: `CHEER`, `COMMENT`, `MILESTONE`, `PUSH_AGGREGATE`, `RESCUE_TRIGGERED`, `SUPPORTER_INVITE`, `SUPPORTER_ACCEPTED`, `HELP_REPLY`, `GLOBAL_REWARD_UNLOCKED`, `DARUMA_EYE_REMINDER` | |
| payload | jsonb | ปลายทาง deep-link + ข้อความที่จะแสดง |
| read_at | timestamp, nullable | |
| created_at | timestamp | |

### `reports`
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID PK | |
| reporter_id | UUID FK → users.id | |
| target_type | enum: `CHALLENGE`, `COMMENT`, `HELP_REPLY`, `USER` | |
| target_id | UUID | polymorphic, resolve ผ่าน target_type |
| reason | enum: `SPAM`, `SELLING`, `SHAMING`, `SAFETY`, `HARASSMENT`, `OTHER` | |
| detail | text, nullable | |
| status | enum: `OPEN`, `REVIEWING`, `ACTIONED`, `DISMISSED` | |
| created_at | timestamp | |
| resolved_at | timestamp, nullable | |

### `blocks`
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID PK | |
| blocker_id | UUID FK → users.id | |
| blocked_id | UUID FK → users.id | |
| created_at | timestamp | |

---

## 10. State Machine

### `challenges.status` (ตรงกับ `challenge_attempts.status` ของ attempt ปัจจุบัน)
```
DRAFT ──(เติมตาแรกแล้ว, Flow 4)──> ACTIVE
ACTIVE ──(ไม่ check-in ≥ push_threshold_days)──> NEEDS_PUSH
NEEDS_PUSH ──(มี check-in)──> ACTIVE
NEEDS_PUSH ──(ไม่ check-in ≥ rescue_threshold_days)──> RESCUE
RESCUE ──(I'M BACK + check-in)──> ACTIVE
ACTIVE|NEEDS_PUSH|RESCUE ──(ครบเวลา ไม่ถึงเป้าหมาย)──> NOT_YET
ACTIVE|NEEDS_PUSH|RESCUE ──(ถึงเป้าหมาย + เติมตาที่สองแล้ว)──> COMPLETED
NOT_YET ──(Try Again)──> สร้าง challenge_attempts row ใหม่ สถานะ ACTIVE
NOT_YET ──(Extend)──> ACTIVE (attempt เดิม ขยายวันสิ้นสุด)
NOT_YET ──(Change Goal)──> ACTIVE (attempt เดิม เปลี่ยนเป้าหมาย เก็บ snapshot เป้าหมายเดิมไว้)
```
`push_threshold_days` / `rescue_threshold_days` ควรตั้งเป็นค่า config แยกตาม category ได้ (เก็บใน config table หรือ app-config ไม่ hard-code ในแต่ละ row) — ค่าแนะนำเริ่มต้น 2–3 วัน / 4+ วันตามลำดับ (Master Concept §11/§13)

### `global_challenge_participants.status`
```
JOINED → ACTIVE → (ถึงเป้าหมาย) → COMPLETED → REWARD_ISSUED → REWARD_REDEEMED
ACTIVE → (หมดเวลา ไม่ถึงเป้าหมาย) → ENDED_NOT_MET → (ไม่บังคับ) CONVERTED_TO_PERSONAL
```

---

## 11. Index ที่จำเป็นสำหรับ V1

- `challenges(owner_id, status)` — ใช้กับ Home tab "My Active Challenges" / "Needs a Push"
- `challenge_attempts(challenge_id, status)` — หา attempt ปัจจุบัน
- `check_ins(challenge_attempt_id, checkin_date)` — unique + range scan สำหรับคำนวณ streak
- `cheers(challenge_id)`, `comments(challenge_id, created_at)` — render feed
- `supporters(user_id, status)` — "People I'm Supporting" / "People Supporting Me" (ต้องมี `supporters(challenge_id, status)` ด้วย)
- `push_events(challenge_attempt_id, created_at)` — rate limit + คำนวณ aggregate
- `help_requests(status, visibility, created_at)` — community feed
- `global_challenge_participants(global_challenge_id, status)` — สรุปตัวเลขให้ sponsor (dashboard เป็น V2 แต่ data shape ควรรองรับตั้งแต่ V1)
- `notifications(user_id, read_at)` — นับ badge unread

---

## 12. สรุปขอบเขต V1 (จบส่วนที่ 1)

Schema ด้านบน (§1–§11) เพียงพอสำหรับ 20 ฟีเจอร์ MVP ทั้งหมด ส่วนที่เหลือของเอกสาร (§13 เป็นต้นไป) คือ schema เพิ่มเติมสำหรับฟีเจอร์ที่ Master Concept ระบุว่า "ยังไม่ต้องทำใน V1" — ออกแบบไว้ให้ deploy เพิ่มทีหลังได้โดยไม่ต้อง migrate ตารางใน §1–§11 (ยกเว้นจุดที่ระบุไว้อย่างชัดเจนใน §21 ว่าต้อง alter ตารางเดิม)

---
---

# ส่วนที่ 2 — Schema สำหรับฟีเจอร์นอก MVP V1 (Full Master Concept Coverage)

## 13. Sponsor Portal & Campaign Workflow

**อ้างอิง:** §43 Sponsor Portal, §44 Sponsor Dashboard — รองรับ Flow 20–22 ใน `USER-FLOWS.md`

### `sponsor_users`
บัญชีล็อกอินสำหรับ Sponsor Portal แยกจาก `users` (พนักงานฝั่งแบรนด์/องค์กร ไม่ใช่ผู้เล่นทั่วไป)
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID PK | |
| sponsor_id | UUID FK → sponsors.id | |
| email | string, unique | |
| password_hash | string | |
| role | enum: `SPONSOR_ADMIN`, `SPONSOR_EDITOR` | |
| created_at | timestamp | |

### แก้ไขตาราง `global_challenges` (alter จาก §8)
เพิ่ม field ต่อไปนี้เพื่อรองรับ workflow แบบ self-serve:
| Field | Type | หมายเหตุ |
|---|---|---|
| created_by_sponsor_user_id | UUID FK → sponsor_users.id, nullable | null = Admin สร้างให้ (เหมือน V1) |
| budget | numeric, nullable | งบประมาณที่ sponsor ตั้ง |
| brand_assets | jsonb, nullable | โลโก้, สี, รูปประกอบ |
| review_status | enum: `NOT_SUBMITTED`, `PENDING_REVIEW`, `CHANGES_REQUESTED`, `APPROVED`, `REJECTED` | แยกจาก `status` เดิม (DRAFT/PUBLISHED/CLOSED) — `review_status` คุม workflow ภายใน, `status` คุมการแสดงผลจริง |

### `campaign_reviews`
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID PK | |
| global_challenge_id | UUID FK → global_challenges.id | |
| reviewer_admin_id | UUID FK → users.id | แอดมิน Challenge Me |
| decision | enum: `APPROVED`, `CHANGES_REQUESTED`, `REJECTED` | |
| notes | text, nullable | |
| created_at | timestamp | |

Dashboard metrics ของ §44 ทั้งหมด (Participants, Active, Completion %, Check-ins, Cheers, Pushes, Shares, Rewards issued/redeemed, Funnel) **คำนวณจากตารางที่มีอยู่แล้ว** ใน §4–§8 (`check_ins`, `cheers`, `push_events`, `share_cards`, `global_challenge_participants`) ไม่ต้องมีตารางสรุปแยก — แนะนำทำเป็น materialized view หรือ scheduled aggregation job แทนการ query สดทุกครั้งเมื่อ scale ขึ้น

---

## 14. Expert Marketplace (Paid Consultation)

**อ้างอิง:** §31–§32 Challenge Me Expert, §25–§26 ใน `USER-FLOWS.md`

### `expert_profiles`
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users.id, unique | Expert ต้องมี user account ปกติด้วย |
| specialty | string | เช่น `nutrition`, `smoking_cessation`, `psychology`, `career_counseling`, `financial` |
| bio | text | |
| price_per_session | numeric | ราคาที่ผู้ใช้จ่าย (Challenge Me กำหนด) |
| session_duration_min | int | |
| payout_rate | numeric | ส่วนที่ Challenge Me จ่ายให้ Expert ต่อ session — **internal only field ห้ามส่งออกไปฝั่ง client ผู้ใช้ทั่วไปเด็ดขาด** |
| status | enum: `ACTIVE`, `INACTIVE`, `SUSPENDED` | |
| curated_by_admin_id | UUID FK → users.id | ยืนยันว่าเป็น Expert ที่ Challenge Me คัดเลือกจริง (ไม่ใช่ open marketplace) |
| created_at | timestamp | |

### `expert_availability`
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID PK | |
| expert_profile_id | UUID FK → expert_profiles.id | |
| start_at | timestamp | slot ว่างแบบระบุเวลาตรง (V1 ของฟีเจอร์นี้ใช้ manual slot ไม่ใช่ recurring-rule engine) |
| end_at | timestamp | |
| is_booked | boolean | default false |

### `bookings`
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID PK | |
| expert_profile_id | UUID FK → expert_profiles.id | |
| user_id | UUID FK → users.id | |
| challenge_id | UUID FK → challenges.id, nullable | Challenge ที่เกี่ยวข้อง (ถ้ามี) |
| availability_slot_id | UUID FK → expert_availability.id | |
| status | enum: `PENDING_PAYMENT`, `CONFIRMED`, `COMPLETED`, `CANCELLED`, `NO_SHOW` | |
| funded_by | enum: `USER`, `SPONSOR` | ถ้า `SPONSOR` ต้องมี `sponsor_voucher_claim_id` (§16) |
| price_charged | numeric | อาจต่างจาก `expert_profiles.price_per_session` ถ้ามีโปรโมชัน |
| created_at | timestamp | |
| cancelled_reason | string, nullable | |

### `payments`
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID PK | |
| booking_id | UUID FK → bookings.id, unique | |
| amount | numeric | |
| currency | string | default `THB` |
| provider | string | เช่น `stripe`, `omise` |
| provider_ref | string | transaction id จาก payment provider |
| status | enum: `PENDING`, `PAID`, `REFUNDED`, `PARTIALLY_REFUNDED`, `FAILED` | |
| refund_reason | string, nullable | |
| created_at | timestamp | |

### `expert_recommendations`
บันทึกคำแนะนำหลัง consultation (Flow 26)
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID PK | |
| booking_id | UUID FK → bookings.id | |
| challenge_id | UUID FK → challenges.id | |
| previous_goal_snapshot | jsonb | |
| recommended_goal | jsonb | |
| accepted | boolean, nullable | null = ผู้ใช้ยังไม่ตอบ |
| accepted_at | timestamp, nullable | |
| created_at | timestamp | |

### แก้ไขตาราง `supporters` (alter จาก §5)
เพิ่ม field เพื่อรองรับ Expert Supporter (Flow 27) โดยไม่ต้องสร้างตารางใหม่:
| Field | Type | หมายเหตุ |
|---|---|---|
| role | enum: `SUPPORTER`, `EXPERT_SUPPORTER` | default `SUPPORTER` |
| source_booking_id | UUID FK → bookings.id, nullable | ระบุว่า Expert Supporter คนนี้มาจาก booking ไหน |

---

## 15. Professional Verification

**อ้างอิง:** §27 Badge ของผู้ช่วย, Flow 23 ใน `USER-FLOWS.md`

### `verification_requests`
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users.id | |
| badge_requested | enum: `VERIFIED_PROFESSIONAL` | เผื่อขยาย enum ในอนาคตถ้ามี badge verify แบบอื่น |
| profession | string | เช่น `physician`, `lawyer`, `financial_advisor` |
| documents | jsonb | array ของ URL เอกสาร/ใบอนุญาตที่อัปโหลด |
| status | enum: `PENDING`, `APPROVED`, `REJECTED` | |
| reviewed_by_admin_id | UUID FK → users.id, nullable | |
| review_notes | string, nullable | |
| created_at | timestamp | |
| reviewed_at | timestamp, nullable | |

เมื่อ `status = APPROVED` ระบบสร้าง row ใน `community_badges` (badge=`VERIFIED_PROFESSIONAL`, granted_by=`ADMIN`) โดยอัตโนมัติ — ตาราง `community_badges` เดิมใน §2 ไม่ต้องแก้ไข

---

## 16. Sponsor-funded Expert Vouchers

**อ้างอิง:** §49, Flow 28 ใน `USER-FLOWS.md`

### `sponsor_expert_vouchers`
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID PK | |
| global_challenge_id | UUID FK → global_challenges.id | |
| expert_specialty | string, nullable | จำกัดเฉพาะสาขา หรือ null = สาขาใดก็ได้ตามที่ sponsor ระบุ |
| total_quota | int | |
| claimed_count | int | default 0 |
| created_at | timestamp | |

### `voucher_claims`
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID PK | |
| voucher_id | UUID FK → sponsor_expert_vouchers.id | |
| user_id | UUID FK → users.id | |
| booking_id | UUID FK → bookings.id, unique | |
| claimed_at | timestamp | |
| — | unique(`voucher_id`, `user_id`) | คนหนึ่งใช้สิทธิ์ voucher เดียวกันได้ครั้งเดียว |

---

## 17. Corporate Model

**อ้างอิง:** §50 Corporate Model, Flow 29 ใน `USER-FLOWS.md`

### `corporate_accounts`
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID PK | |
| sponsor_id | UUID FK → sponsors.id, unique | นำ record ของ sponsor เดิมมาขยาย ไม่สร้างระบบแยกซ้ำ |
| company_name | string | |
| email_domain | string, nullable | ใช้ตรวจสอบ eligibility พนักงานอัตโนมัติ (เช่น `@company.com`) |
| package_tier | enum: `BASIC`, `STANDARD`, `PREMIUM` | กำหนดว่าเปิดฟีเจอร์ไหนได้บ้าง (Daruma, Community, Expert Support, Dashboard) |
| contact_email | string | |
| created_at | timestamp | |

### `corporate_admins`
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID PK | |
| corporate_account_id | UUID FK → corporate_accounts.id | |
| user_id | UUID FK → users.id | HR/Wellness lead ที่มีสิทธิ์เข้า Corporate Portal |
| created_at | timestamp | |

Corporate Challenge ใช้ตาราง `global_challenges` เดิม (§8) โดยตั้ง `sponsor_id` ให้ชี้ไปที่ sponsor ของ corporate account นั้น และใช้ `eligibility_rules.email_domain` ตรวจสอบพนักงาน — ไม่ต้องสร้างตาราง challenge แยกสำหรับ corporate

---

## 18. B2C Premium / Subscriptions

**อ้างอิง:** §46 B2C Premium, Flow 30 ใน `USER-FLOWS.md`

### `subscriptions`
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users.id | เจ้าของแผน (owner ของ Family Plan ด้วยถ้าเป็นแบบนั้น) |
| plan | enum: `MONTHLY`, `ANNUAL`, `FAMILY` | |
| status | enum: `ACTIVE`, `CANCELLED`, `EXPIRED`, `PAST_DUE` | |
| current_period_end | timestamp | |
| payment_provider_ref | string | |
| created_at | timestamp | |

### `family_groups`
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID PK | |
| subscription_id | UUID FK → subscriptions.id, unique | ต้องเป็น subscription ที่ `plan = FAMILY` |
| owner_user_id | UUID FK → users.id | |

### `family_group_members`
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID PK | |
| family_group_id | UUID FK → family_groups.id | |
| user_id | UUID FK → users.id | |
| invited_by | UUID FK → users.id | |
| status | enum: `INVITED`, `ACTIVE`, `REMOVED` | |
| created_at | timestamp | |

Premium-only ฟีเจอร์อื่น ๆ (Advanced Analytics, AI Coach, Custom Themes, Personal Reports) เป็น **feature flags** ที่อ่านจาก `subscriptions.status = ACTIVE` ของ user นั้น ไม่ต้องมีตารางข้อมูลแยกในระดับ schema นี้ — เนื้อหาของแต่ละฟีเจอร์ (เช่น AI Coach suggestion, Personal Report) จะมี schema ของตัวเองเมื่อ spec ฟีเจอร์นั้นละเอียดขึ้นในอนาคต

---

## 19. Health Challenge — Clinician-Approved Targets

**อ้างอิง:** §40 Health Challenge, Flow 31 ใน `USER-FLOWS.md`

### `clinician_approved_targets`
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID PK | |
| challenge_id | UUID FK → challenges.id | |
| requested_by_user_id | UUID FK → users.id | |
| clinician_user_id | UUID FK → users.id | ต้องมี `community_badges.badge = VERIFIED_PROFESSIONAL` สาขาที่เกี่ยวข้อง |
| target_description | text | |
| status | enum: `PENDING`, `APPROVED`, `REJECTED` | |
| approved_at | timestamp, nullable | |
| created_at | timestamp | |

Challenge ที่ผูกกับ target นี้ต้องมี `privacy_fields.show_health_data = false` เป็นค่า default เสมอ และห้าม override เป็น `PUBLIC` โดยไม่ผ่าน consent เพิ่มเติมนอกเหนือจาก consent มาตรฐาน (บังคับที่ application layer)

---

## 20. Wearable / External Health Platform Integration

**อ้างอิง:** §7, Flow 32 ใน `USER-FLOWS.md`

### `wearable_connections`
| Field | Type | หมายเหตุ |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users.id | |
| provider | enum: `APPLE_HEALTH`, `GOOGLE_FIT`, `OTHER` | |
| access_token_ref | string | เก็บ reference ไปยัง secret store ไม่เก็บ token ตรง ๆ ใน DB |
| status | enum: `CONNECTED`, `DISCONNECTED`, `ERROR` | |
| connected_at | timestamp | |
| disconnected_at | timestamp, nullable | |

### แก้ไขตาราง `check_ins` (alter จาก §4)
| Field | Type | หมายเหตุ |
|---|---|---|
| source | enum: `SELF_REPORT`, `WEARABLE` | default `SELF_REPORT` — ใน V1 ทุก row เป็น `SELF_REPORT` โดย implicit; alter นี้ทำตอนเปิดใช้ฟีเจอร์นี้จริง |
| wearable_connection_id | UUID FK → wearable_connections.id, nullable | |

---

## 21. หมายเหตุการ Migrate จาก V1 → Full Scope

ตารางใน §1–§11 (V1) ที่ต้อง `ALTER` เมื่อเปิดใช้ฟีเจอร์ส่วนที่ 2 มีอยู่ 4 จุดเท่านั้น ที่เหลือเป็นตารางใหม่ล้วน ไม่กระทบ schema เดิม:

1. `global_challenges` — เพิ่ม `created_by_sponsor_user_id`, `budget`, `brand_assets`, `review_status` (§13)
2. `supporters` — เพิ่ม `role`, `source_booking_id` (§14)
3. `check_ins` — เพิ่ม `source`, `wearable_connection_id` (§20)
4. `community_badges` — ไม่ต้องแก้ schema แต่เริ่มมีการ `INSERT` แถว `VERIFIED_PROFESSIONAL`/`EXPERT` จริงเป็นครั้งแรกผ่าน §15/§14 (เดิมใน V1 กำหนดไว้แต่ไม่เคย insert)

สิ่งที่ยังไม่ต้อง build แม้ในสโคปเต็มนี้ (เพราะ Master Concept เองก็ยังไม่ลงรายละเอียดพอ): AI-based embedding/matching engine (ยังใช้ rule-based tag-overlap ตาม §11 ของเอกสาร; ถ้าจะทำ ML จริงควรแยกเป็น service ต่างหากนอก schema นี้) และระบบ dispute/appeal เต็มรูปแบบสำหรับ Expert Marketplace (Complaint/Refund ใน §31 ยังเป็น manual admin process ผ่าน `payments.status` และ `reports` ที่มีอยู่แล้วใน §9 ก็เพียงพอสำหรับเริ่มต้น)

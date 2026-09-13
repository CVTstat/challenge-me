// ชั้น API ที่ห่อ Supabase query ตาม Flow/FR ใน USER-FLOWS.md และ
// FEATURE-REQUIREMENTS.md — เก็บ logic ของแต่ละ action ไว้ที่เดียว ไม่กระจาย
// อยู่ในแต่ละ screen โดยตรง

import { supabase } from "@/lib/supabase";
import type { ChallengeRow, MeasurementType, PrivacyFields, PushPermission } from "@/types/database";

export interface NewPersonalChallengeInput {
  title: string;
  category: string;
  goalDescription: string;
  measurementType: MeasurementType;
  targetValue?: number;
  measurementUnit?: string;
  checkinFrequency?: "DAILY" | "WEEKLY" | "CUSTOM";
  plannedEndDate?: string; // ISO date
  rewardText?: string;
  privacyLevel?: "PUBLIC" | "SUPPORTERS" | "PRIVATE";
  pushPermission?: PushPermission;
}

const DEFAULT_PRIVACY_FIELDS: PrivacyFields = {
  show_progress: true,
  show_checkins: true,
  show_photos: true,
  show_comments: true,
  show_health_data: false,
};

/**
 * Flow 2 / FR4.3: submit form -> สร้าง challenges (status DRAFT) + daruma +
 * challenge_attempts แรก แล้วพาไป First-Eye Ritual (ยังไม่ ACTIVE จนกว่าจะ
 * เติมตาแรกจริง — ดู fillFirstEye ด้านล่าง, ตรง FR7.1/FR7.2)
 */
export async function createPersonalChallenge(ownerId: string, input: NewPersonalChallengeInput) {
  const { data: challenge, error: challengeError } = await supabase
    .from("challenges")
    .insert({
      owner_id: ownerId,
      type: "PERSONAL",
      title: input.title,
      category: input.category,
      goal_description: input.goalDescription,
      measurement_type: input.measurementType,
      measurement_unit: input.measurementUnit ?? null,
      target_value: input.targetValue ?? null,
      checkin_frequency: input.checkinFrequency ?? "DAILY",
      planned_end_date: input.plannedEndDate ?? null,
      reward_text: input.rewardText ?? null,
      privacy_level: input.privacyLevel ?? "PRIVATE",
      privacy_fields: DEFAULT_PRIVACY_FIELDS,
      push_permission: input.pushPermission ?? "SUPPORTERS",
      status: "DRAFT",
    })
    .select()
    .single();

  if (challengeError || !challenge) {
    return { challenge: null, error: challengeError?.message ?? "สร้าง Challenge ไม่สำเร็จ" };
  }

  const { error: darumaError } = await supabase.from("daruma").insert({ challenge_id: challenge.id });
  if (darumaError) return { challenge, error: darumaError.message };

  const { error: attemptError } = await supabase
    .from("challenge_attempts")
    .insert({ challenge_id: challenge.id, attempt_number: 1, status: "ACTIVE" });
  if (attemptError) return { challenge, error: attemptError.message };

  return { challenge: challenge as ChallengeRow, error: null };
}

/**
 * Flow 4 / FR7.1: ต้องมาจากการกดของผู้ใช้เท่านั้น ห้ามเรียกอัตโนมัติจากที่ไหน
 * ทั้งสิ้น — เติมตาแรก + เปลี่ยน Challenge เป็น ACTIVE
 */
export async function fillFirstEye(challengeId: string) {
  const { error: darumaError } = await supabase
    .from("daruma")
    .update({ left_eye_filled_at: new Date().toISOString() })
    .eq("challenge_id", challengeId);
  if (darumaError) return { error: darumaError.message };

  const { error: challengeError } = await supabase
    .from("challenges")
    .update({ status: "ACTIVE" })
    .eq("id", challengeId);
  return { error: challengeError?.message ?? null };
}

/**
 * Flow 11 / FR15.1: เติมตาที่สอง — ต้องมาจากการกดของผู้ใช้เท่านั้นเช่นกัน
 */
export async function fillSecondEye(challengeId: string) {
  const { error: darumaError } = await supabase
    .from("daruma")
    .update({ right_eye_filled_at: new Date().toISOString() })
    .eq("challenge_id", challengeId);
  if (darumaError) return { error: darumaError.message };

  const { error: challengeError } = await supabase
    .from("challenges")
    .update({ status: "COMPLETED" })
    .eq("id", challengeId);
  return { error: challengeError?.message ?? null };
}

export interface SubmitCheckInInput {
  challengeAttemptId: string;
  date?: string; // ISO date, default = วันนี้
  valueBool?: boolean;
  valueNumber?: number;
  note?: string;
  mediaUrl?: string;
}

/**
 * Flow 5 / FR8.2: หนึ่ง check-in ต่อหนึ่งช่วงเวลา — ใช้ upsert บน
 * unique(challenge_attempt_id, checkin_date) แทนการเช็คก่อน insert เอง
 * เพื่อลด race condition และให้ตรงกับ constraint ที่ DB บังคับไว้
 */
export async function submitCheckIn(input: SubmitCheckInInput) {
  const checkinDate = input.date ?? new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("check_ins")
    .upsert(
      {
        challenge_attempt_id: input.challengeAttemptId,
        checkin_date: checkinDate,
        value_bool: input.valueBool ?? null,
        value_number: input.valueNumber ?? null,
        note: input.note ?? null,
        media_url: input.mediaUrl ?? null,
      },
      { onConflict: "challenge_attempt_id,checkin_date" }
    )
    .select()
    .single();

  return { checkIn: data, error: error?.message ?? null };
}

/** Flow 7 / FR10.1: toggle cheer — ลองลบก่อน ถ้าไม่มีแถวให้ลบค่อย insert */
export async function toggleCheer(challengeId: string, userId: string) {
  const { data: existing } = await supabase
    .from("cheers")
    .select("id")
    .eq("challenge_id", challengeId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("cheers").delete().eq("id", existing.id);
    return { cheered: false, error: error?.message ?? null };
  }

  const { error } = await supabase.from("cheers").insert({ challenge_id: challengeId, user_id: userId });
  return { cheered: !error, error: error?.message ?? null };
}

/** Home tab / Flow 18: Challenge ที่ active ของผู้ใช้ */
export async function listMyActiveChallenges(userId: string) {
  const { data, error } = await supabase
    .from("challenges")
    .select("*")
    .eq("owner_id", userId)
    .in("status", ["ACTIVE", "NEEDS_PUSH", "RESCUE"])
    .order("updated_at", { ascending: false });
  return { challenges: (data ?? []) as ChallengeRow[], error: error?.message ?? null };
}

/** Global tab / Flow 16: Global Challenge ที่เปิดรับสมัครอยู่ */
export async function listPublishedGlobalChallenges() {
  const { data, error } = await supabase
    .from("global_challenges")
    .select("*")
    .eq("status", "PUBLISHED")
    .order("start_date", { ascending: true });
  return { globalChallenges: data ?? [], error: error?.message ?? null };
}

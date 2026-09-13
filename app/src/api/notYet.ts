// ฟีเจอร์ 17 (FEATURE-REQUIREMENTS.md ข้อ 17) — Not Yet / Try Again / Extend /
// Change Goal — Flow 13 ใน USER-FLOWS.md
// (การเปลี่ยนเป็น NOT_YET เองทำอัตโนมัติผ่าน evaluate_challenge_lifecycle()
// ฝั่ง DB — ไฟล์นี้จัดการ 3 ทางเลือกที่ผู้ใช้กดหลังจากนั้น)

import { supabase } from "@/lib/supabase";
import type { ChallengeAttemptRow, ChallengeRow } from "@/types/database";

/** FR17.2: สร้าง attempt ใหม่ ใช้ Daruma เดิม รีเซ็ต streak ของ attempt ใหม่ */
export async function tryAgain(challengeId: string) {
  const { data: attempts, error: attemptsError } = await supabase
    .from("challenge_attempts")
    .select("*")
    .eq("challenge_id", challengeId)
    .order("attempt_number", { ascending: false })
    .limit(1);
  if (attemptsError) return { error: attemptsError.message };

  const lastAttemptNumber = attempts?.[0]?.attempt_number ?? 0;

  const { error: newAttemptError } = await supabase.from("challenge_attempts").insert({
    challenge_id: challengeId,
    attempt_number: lastAttemptNumber + 1,
    status: "ACTIVE",
  });
  if (newAttemptError) return { error: newAttemptError.message };

  const { error: challengeError } = await supabase
    .from("challenges")
    .update({ status: "ACTIVE" })
    .eq("id", challengeId);
  if (challengeError) return { error: challengeError.message };

  // FR17.6: attempt ที่ 2 = SECOND_TRY, attempt ที่ 3+ = NEVER_GIVE_UP (ให้ครั้งเดียว)
  const { data: challenge } = await supabase.from("challenges").select("owner_id").eq("id", challengeId).single();
  if (challenge) {
    const achievementType = lastAttemptNumber + 1 === 2 ? "SECOND_TRY" : lastAttemptNumber + 1 >= 3 ? "NEVER_GIVE_UP" : null;
    if (achievementType) {
      const { data: existing } = await supabase
        .from("achievements")
        .select("id")
        .eq("user_id", challenge.owner_id)
        .eq("type", achievementType)
        .eq("related_challenge_id", challengeId)
        .maybeSingle();
      if (!existing) {
        await supabase.from("achievements").insert({
          user_id: challenge.owner_id,
          type: achievementType,
          related_challenge_id: challengeId,
        });
      }
    }
  }

  return { error: null as string | null };
}

/** FR17.3: เพิ่มวัน ไม่สร้าง attempt ใหม่ */
export async function extendChallenge(challengeId: string, attemptId: string, daysAdded: number) {
  const { data: challenge, error: challengeFetchError } = await supabase
    .from("challenges")
    .select("planned_end_date")
    .eq("id", challengeId)
    .single();
  if (challengeFetchError || !challenge) return { error: challengeFetchError?.message ?? "ไม่พบ Challenge" };

  const base = challenge.planned_end_date ? new Date(challenge.planned_end_date) : new Date();
  base.setDate(base.getDate() + daysAdded);
  const newEndDate = base.toISOString().slice(0, 10);

  const { error: extensionError } = await supabase
    .from("extensions")
    .insert({ challenge_attempt_id: attemptId, days_added: daysAdded });
  if (extensionError) return { error: extensionError.message };

  const { error: updateChallengeError } = await supabase
    .from("challenges")
    .update({ planned_end_date: newEndDate, status: "ACTIVE" })
    .eq("id", challengeId);
  if (updateChallengeError) return { error: updateChallengeError.message };

  const { error: updateAttemptError } = await supabase
    .from("challenge_attempts")
    .update({ status: "ACTIVE" })
    .eq("id", attemptId);
  return { error: updateAttemptError?.message ?? null };
}

/** FR17.4: เก็บ snapshot เป้าหมายเดิมไว้ก่อน apply เป้าหมายใหม่ */
export async function changeGoal(
  challenge: ChallengeRow,
  attemptId: string,
  newGoalDescription: string,
  newTargetValue?: number
) {
  const snapshot = {
    goal_description: challenge.goal_description,
    target_value: challenge.target_value,
    changed_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("challenges")
    .update({
      goal_description: newGoalDescription,
      target_value: newTargetValue ?? challenge.target_value,
      original_goal_snapshot: snapshot,
      status: "ACTIVE",
    })
    .eq("id", challenge.id);
  if (error) return { error: error.message };

  const { error: attemptError } = await supabase
    .from("challenge_attempts")
    .update({ status: "ACTIVE" })
    .eq("id", attemptId);
  return { error: attemptError?.message ?? null };
}

export async function getLatestAttempt(challengeId: string) {
  const { data, error } = await supabase
    .from("challenge_attempts")
    .select("*")
    .eq("challenge_id", challengeId)
    .order("attempt_number", { ascending: false })
    .limit(1)
    .single();
  return { attempt: data as ChallengeAttemptRow | null, error: error?.message ?? null };
}

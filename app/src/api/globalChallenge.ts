// ฟีเจอร์ 20 (FEATURE-REQUIREMENTS.md ข้อ 20) — Global Challenge Join flow
// Flow 16 ใน USER-FLOWS.md

import { supabase } from "@/lib/supabase";
import type { GlobalChallengeRow } from "@/types/database";

export async function getGlobalChallenge(globalChallengeId: string) {
  const { data, error } = await supabase
    .from("global_challenges")
    .select("*")
    .eq("id", globalChallengeId)
    .single();
  return { globalChallenge: data as GlobalChallengeRow | null, error: error?.message ?? null };
}

/**
 * FR20.3: ต้องยอมรับ consent ก่อนเสมอ -> สร้าง challenge (is_global=true) +
 * daruma (+ limited edition flag ถ้ามี) + attempt + participant record
 * FR20.4: ถ้า has_limited_daruma และเต็มโควต้าแล้ว บล็อกการ join ทั้งหมด
 */
export async function joinGlobalChallenge(globalChallengeId: string, userId: string) {
  const { data: gc, error: gcError } = await supabase
    .from("global_challenges")
    .select("*")
    .eq("id", globalChallengeId)
    .single();
  if (gcError || !gc) return { error: gcError?.message ?? "ไม่พบ Global Challenge นี้" };

  if (gc.has_limited_daruma && (gc.limited_daruma_claimed ?? 0) >= (gc.limited_daruma_total ?? 0)) {
    return { error: "ใบไม้พิเศษ (Limited) เต็มโควต้าแล้ว" };
  }

  const { data: challenge, error: challengeError } = await supabase
    .from("challenges")
    .insert({
      owner_id: userId,
      type: "PERSONAL",
      title: gc.title,
      category: gc.category,
      goal_description: gc.goal_description,
      measurement_type: gc.measurement_type,
      target_value: gc.target_value,
      checkin_frequency: "DAILY",
      planned_end_date: gc.end_date,
      reward_text: gc.reward_text,
      privacy_level: "PRIVATE",
      privacy_fields: {
        show_progress: true,
        show_checkins: true,
        show_photos: true,
        show_comments: true,
        show_health_data: false,
      },
      push_permission: "SUPPORTERS",
      status: "DRAFT",
      is_global: true,
    })
    .select()
    .single();
  if (challengeError || !challenge) return { error: challengeError?.message ?? "สร้าง Challenge ไม่สำเร็จ" };

  const { error: darumaError } = await supabase.from("daruma").insert({
    challenge_id: challenge.id,
    is_limited_sponsor_edition: gc.has_limited_daruma,
  });
  if (darumaError) return { error: darumaError.message };

  const { data: attempt, error: attemptError } = await supabase
    .from("challenge_attempts")
    .insert({ challenge_id: challenge.id, attempt_number: 1, status: "ACTIVE" })
    .select()
    .single();
  if (attemptError || !attempt) return { error: attemptError?.message ?? "สร้าง attempt ไม่สำเร็จ" };

  const { error: participantError } = await supabase.from("global_challenge_participants").insert({
    global_challenge_id: globalChallengeId,
    user_id: userId,
    challenge_attempt_id: attempt.id,
    consent_accepted_at: new Date().toISOString(),
    status: "JOINED",
  });
  if (participantError) return { error: participantError.message };

  if (gc.has_limited_daruma) {
    await supabase
      .from("global_challenges")
      .update({ limited_daruma_claimed: (gc.limited_daruma_claimed ?? 0) + 1 })
      .eq("id", globalChallengeId);
  }

  return { challengeId: challenge.id as string, error: null };
}

// ฟีเจอร์ 12-13 (FEATURE-REQUIREMENTS.md ข้อ 12-13) — Push Me + Rescue Mode
// การตรวจจับ ACTIVE -> NEEDS_PUSH -> RESCUE ทำที่ DB โดย
// public.evaluate_challenge_lifecycle() (0003_functions_triggers.sql) — ฝั่งนี้
// มีแค่ "กด Push" (FR12.3) และ "I'm Back" (FR13.3-13.4)

import { supabase } from "@/lib/supabase";
import type { ChallengeRow } from "@/types/database";

/**
 * FR12.3/FR12.5: กด Push ครั้งเดียวจบ ข้อความเป็น template ตายตัว (ไม่มี
 * free-text ให้กรอก) — rate limit 1 ครั้ง/คน/attempt/24 ชม. เช็คก่อน insert
 * (การบังคับแบบเข้มกว่านี้ควรทำเป็น DB constraint/trigger เพิ่มเติมด้วย
 * ตอนขึ้น production จริง)
 */
export async function pushChallenge(challengeId: string, attemptId: string, pusherUserId: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recent } = await supabase
    .from("push_events")
    .select("id")
    .eq("challenge_attempt_id", attemptId)
    .eq("pusher_user_id", pusherUserId)
    .gte("created_at", since)
    .maybeSingle();

  if (recent) {
    return { error: "คุณ Push Challenge นี้ไปแล้วในช่วง 24 ชั่วโมงที่ผ่านมา" };
  }

  const { error } = await supabase
    .from("push_events")
    .insert({ challenge_id: challengeId, challenge_attempt_id: attemptId, pusher_user_id: pusherUserId });
  return { error: error?.message ?? null };
}

/** Home > "Needs a Push" feed — Challenge ของคนที่ฉันซัพพอร์ตอยู่ที่ต้องการแรงผลัก */
export async function listChallengesNeedingPush(supporterUserId: string) {
  const { data, error } = await supabase
    .from("supporters")
    .select("challenges:challenge_id(id, title, status, push_permission, owner_id)")
    .eq("user_id", supporterUserId)
    .eq("status", "ACTIVE");

  if (error) return { challenges: [] as ChallengeRow[], error: error.message };

  const challenges = (data ?? [])
    .map((row: any) => row.challenges as ChallengeRow | null)
    .filter(
      (c): c is ChallengeRow =>
        !!c && (c.status === "NEEDS_PUSH" || c.status === "RESCUE") && c.push_permission !== "NOBODY"
    );

  return { challenges, error: null };
}

/**
 * FR13.3-13.4: "I'M BACK" ต้องพาไป check-in จริง ไม่ได้ resolve rescue แค่กดปุ่ม
 * เดียว — ฟังก์ชันนี้แค่ mark ว่าเห็นปุ่มแล้ว (ใช้ log/analytics); rescue
 * จะถูก resolve จริงตอน submitCheckIn() เรียก (ผ่าน trigger ฝั่ง DB)
 */
export async function acknowledgeImBack(_attemptId: string) {
  // ยังไม่มีตาราง log เฉพาะสำหรับ event นี้ใน V1 — ปล่อยให้ trigger
  // handle_checkin_written() ใน DB เป็นคนตัดสิน resolve rescue_states จริง ๆ
  return { error: null as string | null };
}

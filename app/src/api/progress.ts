// ฟีเจอร์ 9 (FEATURE-REQUIREMENTS.md ข้อ 9) — Progress / Streak
// best_streak คำนวณฝั่ง DB แล้ว (trigger ใน 0003_functions_triggers.sql,
// FR9.2) ไฟล์นี้ดึง check-in history มาคำนวณ current streak + progress %
// ฝั่ง client สำหรับแสดงผล (ไม่ต้อง round-trip เรียก DB function ทุกครั้ง)

import { supabase } from "@/lib/supabase";
import type { CheckInRow, ChallengeRow } from "@/types/database";

export interface ProgressSummary {
  currentStreak: number;
  bestStreak: number;
  totalCheckIns: number;
  /**
   * ผลรวมของตัวเลขที่กรอกไว้ทุก check-in — ใช้กับ Challenge ที่วัดด้วยตัวเลข
   * สะสม (ระยะทาง/เวลา/จำนวน) เช่น วิ่งสะสมให้ครบ 10 กม. ค่านี้คือ "วิ่งไป
   * แล้วกี่ กม." ส่วน Challenge แบบ Yes/No จะไม่ใช้ค่านี้ (ใช้ totalCheckIns แทน)
   */
  totalValue: number;
  progressPct: number | null; // null ถ้าคำนวณ % ไม่ได้ (เช่นไม่มี planned_end_date)
  checkIns: CheckInRow[];
}

/**
 * สรุปความคืบหน้าของหลาย Challenge พร้อมกันในทีเดียว — ใช้ที่หน้า Home เพื่อ
 * วาดแถบความคืบหน้าใต้ Challenge แต่ละอัน
 *
 * จงใจใช้แค่ 2 query ไม่ว่าจะมีกี่ Challenge (ดึง attempt ทั้งหมดทีเดียว แล้ว
 * ดึง check-in ของทุก attempt ทีเดียว) แทนการวนเรียกทีละอัน ซึ่งจะช้าขึ้น
 * เรื่อย ๆ ตามจำนวน Challenge ที่ผู้ใช้มี
 */
export async function getProgressForChallenges(challengeIds: string[]) {
  const empty: Record<string, { totalCheckIns: number; totalValue: number }> = {};
  if (challengeIds.length === 0) return { progress: empty, error: null };

  const { data: attempts, error: attemptError } = await supabase
    .from("challenge_attempts")
    .select("id, challenge_id")
    .in("challenge_id", challengeIds);
  if (attemptError) return { progress: empty, error: attemptError.message };

  const attemptToChallenge = new Map<string, string>();
  for (const a of attempts ?? []) attemptToChallenge.set(a.id as string, a.challenge_id as string);
  const attemptIds = [...attemptToChallenge.keys()];
  if (attemptIds.length === 0) return { progress: empty, error: null };

  const { data: rows, error: checkInError } = await supabase
    .from("check_ins")
    .select("challenge_attempt_id, value_number")
    .in("challenge_attempt_id", attemptIds);
  if (checkInError) return { progress: empty, error: checkInError.message };

  const progress = { ...empty };
  for (const row of rows ?? []) {
    const challengeId = attemptToChallenge.get(row.challenge_attempt_id as string);
    if (!challengeId) continue;
    const bucket = progress[challengeId] ?? { totalCheckIns: 0, totalValue: 0 };
    bucket.totalCheckIns += 1;
    const v = Number(row.value_number);
    if (Number.isFinite(v)) bucket.totalValue += v;
    progress[challengeId] = bucket;
  }
  return { progress, error: null };
}

/** FR9.1: นับช่วงเวลาที่มี check-in ติดต่อกัน ย้อนจากล่าสุด (DAILY เป็นหลัก) */
function computeCurrentStreak(sortedDesc: CheckInRow[], frequency: ChallengeRow["checkin_frequency"]): number {
  if (sortedDesc.length === 0) return 0;
  const stepDays = frequency === "WEEKLY" ? 7 : 1;
  let streak = 1;
  let cursor = new Date(sortedDesc[0].checkin_date);

  for (let i = 1; i < sortedDesc.length; i++) {
    const expected = new Date(cursor);
    expected.setDate(expected.getDate() - stepDays);
    const actual = new Date(sortedDesc[i].checkin_date);
    if (actual.toISOString().slice(0, 10) === expected.toISOString().slice(0, 10)) {
      streak += 1;
      cursor = actual;
    } else {
      break;
    }
  }
  return streak;
}

export async function getChallengeProgress(challenge: ChallengeRow, attemptId: string, bestStreak: number) {
  const { data, error } = await supabase
    .from("check_ins")
    .select("*")
    .eq("challenge_attempt_id", attemptId)
    .order("checkin_date", { ascending: false });

  if (error) {
    return { summary: null, error: error.message };
  }

  const checkIns = (data ?? []) as CheckInRow[];
  const currentStreak = computeCurrentStreak(checkIns, challenge.checkin_frequency);

  let progressPct: number | null = null;
  if (challenge.planned_end_date) {
    const start = new Date(challenge.start_date).getTime();
    const end = new Date(challenge.planned_end_date).getTime();
    const totalDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);
    const totalExpectedPeriods =
      challenge.checkin_frequency === "WEEKLY" ? Math.ceil(totalDays / 7) : totalDays;
    progressPct = Math.min(100, Math.round((checkIns.length / totalExpectedPeriods) * 100));
  }

  // รวมตัวเลขที่กรอกไว้ทุกครั้ง (ข้ามค่าที่ว่าง/ไม่ใช่ตัวเลข)
  const totalValue = checkIns.reduce((sum, c) => {
    const v = Number(c.value_number);
    return Number.isFinite(v) ? sum + v : sum;
  }, 0);

  const summary: ProgressSummary = {
    currentStreak,
    bestStreak,
    totalCheckIns: checkIns.length,
    totalValue,
    progressPct,
    checkIns,
  };
  return { summary, error: null };
}

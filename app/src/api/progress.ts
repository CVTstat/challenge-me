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
  progressPct: number | null; // null ถ้าคำนวณ % ไม่ได้ (เช่นไม่มี planned_end_date)
  checkIns: CheckInRow[];
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

  const summary: ProgressSummary = {
    currentStreak,
    bestStreak,
    totalCheckIns: checkIns.length,
    progressPct,
    checkIns,
  };
  return { summary, error: null };
}

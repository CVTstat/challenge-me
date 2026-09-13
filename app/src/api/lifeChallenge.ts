// ฟีเจอร์ 5 (FEATURE-REQUIREMENTS.md ข้อ 5) — Life Challenge + Milestones
// Flow 3 ใน USER-FLOWS.md

import { supabase } from "@/lib/supabase";
import type { MilestoneRow } from "@/types/database";

export interface NewLifeChallengeInput {
  title: string;
  category: string;
  goalDescription: string;
  milestoneTitles: string[]; // อย่างน้อย 1 รายการ เรียงตามลำดับ
  rewardText?: string;
}

/**
 * FR5.1-5.2: สร้าง Challenge(type=LIFE) + Master Daruma + milestones เรียงลำดับ
 * (อันแรก IN_PROGRESS ที่เหลือ LOCKED) + Milestone Daruma ให้ milestone แรก
 */
export async function createLifeChallenge(ownerId: string, input: NewLifeChallengeInput) {
  const { data: challenge, error: challengeError } = await supabase
    .from("challenges")
    .insert({
      owner_id: ownerId,
      type: "LIFE",
      title: input.title,
      category: input.category,
      goal_description: input.goalDescription,
      measurement_type: "CUSTOM",
      checkin_frequency: "CUSTOM",
      reward_text: input.rewardText ?? null,
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
    })
    .select()
    .single();

  if (challengeError || !challenge) {
    return { challenge: null, error: challengeError?.message ?? "สร้าง Life Challenge ไม่สำเร็จ" };
  }

  const { error: darumaError } = await supabase.from("daruma").insert({ challenge_id: challenge.id });
  if (darumaError) return { challenge, error: darumaError.message };

  const { error: attemptError } = await supabase
    .from("challenge_attempts")
    .insert({ challenge_id: challenge.id, attempt_number: 1, status: "ACTIVE" });
  if (attemptError) return { challenge, error: attemptError.message };

  const milestoneRows = input.milestoneTitles.map((title, index) => ({
    challenge_id: challenge.id,
    title,
    order_index: index,
    status: index === 0 ? ("IN_PROGRESS" as const) : ("LOCKED" as const),
  }));
  const { data: milestones, error: milestoneError } = await supabase
    .from("milestones")
    .insert(milestoneRows)
    .select();
  if (milestoneError) return { challenge, error: milestoneError.message };

  // สร้าง Milestone Daruma ให้ milestone แรกที่ IN_PROGRESS (FR5.1)
  const firstMilestone = (milestones ?? []).find((m) => m.order_index === 0);
  if (firstMilestone) {
    const { data: milestoneDaruma } = await supabase
      .from("daruma")
      .insert({ challenge_id: challenge.id })
      .select()
      .single();
    if (milestoneDaruma) {
      await supabase.from("milestones").update({ daruma_id: milestoneDaruma.id }).eq("id", firstMilestone.id);
    }
  }

  return { challenge, error: null };
}

export async function listMilestones(challengeId: string) {
  const { data, error } = await supabase
    .from("milestones")
    .select("*")
    .eq("challenge_id", challengeId)
    .order("order_index", { ascending: true });
  return { milestones: (data ?? []) as MilestoneRow[], error: error?.message ?? null };
}

/**
 * FR5.3: mark milestone สำเร็จ -> ปลดล็อก milestone ถัดไป + สร้าง
 * Milestone Daruma ให้ตัวใหม่ที่ปลดล็อก
 */
export async function completeMilestone(challengeId: string, milestoneId: string) {
  const { error: completeError } = await supabase
    .from("milestones")
    .update({ status: "DONE", completed_at: new Date().toISOString() })
    .eq("id", milestoneId);
  if (completeError) return { error: completeError.message };

  const { data: milestones } = await supabase
    .from("milestones")
    .select("*")
    .eq("challenge_id", challengeId)
    .order("order_index", { ascending: true });

  const next = (milestones ?? []).find((m) => m.status === "LOCKED");
  if (next) {
    const { data: milestoneDaruma } = await supabase
      .from("daruma")
      .insert({ challenge_id: challengeId })
      .select()
      .single();
    await supabase
      .from("milestones")
      .update({ status: "IN_PROGRESS", daruma_id: milestoneDaruma?.id ?? null })
      .eq("id", next.id);
  }

  return { error: null as string | null };
}

/** FR5.5: Journey Progress % = milestone ที่ DONE / ทั้งหมด */
export function computeJourneyProgressPct(milestones: MilestoneRow[]): number {
  if (milestones.length === 0) return 0;
  const done = milestones.filter((m) => m.status === "DONE").length;
  return Math.round((done / milestones.length) * 100);
}

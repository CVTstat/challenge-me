// ฟีเจอร์ 11 (FEATURE-REQUIREMENTS.md ข้อ 11) — Supporters
// Flow 8 ใน USER-FLOWS.md: Invite -> Invitee accepts -> เห็น progress notification

import { supabase } from "@/lib/supabase";
import type { SupporterRow } from "@/types/database";

/** FR11.1: เชิญ Supporter — สร้าง row status=INVITED */
export async function inviteSupporter(challengeId: string, inviterId: string, inviteeUserId: string) {
  const { data, error } = await supabase
    .from("supporters")
    .insert({ challenge_id: challengeId, user_id: inviteeUserId, invited_by: inviterId, status: "INVITED" })
    .select()
    .single();
  return { supporter: data as SupporterRow | null, error: error?.message ?? null };
}

/** FR11.2: ผู้ถูกเชิญต้องตอบรับก่อนถึงจะเริ่มได้ progress notification */
export async function respondToSupporterInvite(supporterId: string, accept: boolean) {
  if (accept) {
    const { error } = await supabase
      .from("supporters")
      .update({ status: "ACTIVE", responded_at: new Date().toISOString() })
      .eq("id", supporterId);
    return { error: error?.message ?? null };
  }
  const { error } = await supabase
    .from("supporters")
    .update({ status: "REMOVED", responded_at: new Date().toISOString() })
    .eq("id", supporterId);
  return { error: error?.message ?? null };
}

/** จัดการ Supporter list ของ Challenge หนึ่ง ๆ (เจ้าของดูเอง) */
export async function listSupportersForChallenge(challengeId: string) {
  const { data, error } = await supabase
    .from("supporters")
    .select("*, profiles:user_id(display_name, avatar_url)")
    .eq("challenge_id", challengeId)
    .order("created_at", { ascending: true });
  return { supporters: (data ?? []) as (SupporterRow & { profiles: { display_name: string; avatar_url: string | null } | null })[], error: error?.message ?? null };
}

/** FR11.4: เจ้าของลบ/mute Supporter ได้ตลอดเวลา */
export async function removeSupporter(supporterId: string) {
  const { error } = await supabase.from("supporters").update({ status: "REMOVED" }).eq("id", supporterId);
  return { error: error?.message ?? null };
}

export async function muteSupporter(supporterId: string) {
  const { error } = await supabase.from("supporters").update({ status: "MUTED" }).eq("id", supporterId);
  return { error: error?.message ?? null };
}

/** [Me] > People I'm Supporting — Challenge ที่ฉันเป็น Supporter (ACTIVE) */
export async function listChallengesImSupporting(userId: string) {
  const { data, error } = await supabase
    .from("supporters")
    .select("*, challenges:challenge_id(id, title, status, category)")
    .eq("user_id", userId)
    .eq("status", "ACTIVE");
  return { rows: data ?? [], error: error?.message ?? null };
}

/** คำเชิญ Supporter ที่ค้างตอบรับของฉัน */
export async function listPendingSupporterInvites(userId: string) {
  const { data, error } = await supabase
    .from("supporters")
    .select("*, challenges:challenge_id(id, title)")
    .eq("user_id", userId)
    .eq("status", "INVITED");
  return { rows: data ?? [], error: error?.message ?? null };
}

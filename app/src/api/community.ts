// ฟีเจอร์ 18-19 (FEATURE-REQUIREMENTS.md ข้อ 18-19) — Community Ask-for-Help
// + Basic Community Guide Matching
// Flow 14-15 ใน USER-FLOWS.md

import { supabase } from "@/lib/supabase";
import type { ExpertiseTagRow, HelpReplyRow, HelpRequestRow } from "@/types/database";

/** FR18.1: เปิด Help Request ได้ตลอดเวลา ไม่ผูกกับสถานะ Challenge */
export async function createHelpRequest(
  challengeId: string,
  requesterId: string,
  body: string,
  visibility: "SUPPORTERS" | "COMMUNITY"
) {
  const { data, error } = await supabase
    .from("help_requests")
    .insert({ challenge_id: challengeId, requester_id: requesterId, body, visibility, status: "OPEN" })
    .select()
    .single();
  return { helpRequest: data as HelpRequestRow | null, error: error?.message ?? null };
}

export async function getHelpRequest(helpRequestId: string) {
  const { data, error } = await supabase.from("help_requests").select("*").eq("id", helpRequestId).single();
  return { helpRequest: data as HelpRequestRow | null, error: error?.message ?? null };
}

export async function listOpenCommunityHelpRequests() {
  const { data, error } = await supabase
    .from("help_requests")
    .select("*")
    .eq("visibility", "COMMUNITY")
    .eq("status", "OPEN")
    .order("created_at", { ascending: false });
  return { helpRequests: (data ?? []) as HelpRequestRow[], error: error?.message ?? null };
}

export async function listRepliesForHelpRequest(helpRequestId: string) {
  const { data, error } = await supabase
    .from("help_replies")
    .select("*")
    .eq("help_request_id", helpRequestId)
    .order("created_at", { ascending: true });
  return { replies: (data ?? []) as HelpReplyRow[], error: error?.message ?? null };
}

/** FR18.3: ตอบคำถามฟรี — mark helpful ทำแยกด้วย markReplyHelpful() */
export async function replyToHelpRequest(helpRequestId: string, helperId: string, body: string) {
  const { data, error } = await supabase
    .from("help_replies")
    .insert({ help_request_id: helpRequestId, helper_id: helperId, body })
    .select()
    .single();
  if (error) return { reply: null, error: error.message };

  await supabase.from("help_requests").update({ status: "ANSWERED" }).eq("id", helpRequestId);
  return { reply: data as HelpReplyRow, error: null };
}

export async function markReplyHelpful(replyId: string) {
  const { error } = await supabase.from("help_replies").update({ marked_helpful: true }).eq("id", replyId);
  return { error: error?.message ?? null };
}

/**
 * FR19.1: Matching แบบ rule-based — เรียง candidate ตาม category ของ
 * Challenge ที่ overlap กับ expertise_tags.category ของผู้ช่วย (ยังไม่ใช้ ML)
 */
export async function findSuggestedGuides(category: string) {
  const { data, error } = await supabase
    .from("expertise_tags")
    .select("*, profiles:user_id(display_name, avatar_url)")
    .eq("category", category)
    .order("created_at", { ascending: false })
    .limit(10);
  return {
    guides: (data ?? []) as (ExpertiseTagRow & { profiles: { display_name: string; avatar_url: string | null } | null })[],
    error: error?.message ?? null,
  };
}

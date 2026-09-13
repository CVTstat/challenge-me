// ฟีเจอร์ "ท้าเพื่อน" (Challenge a Friend) — เชื่อมกับ
// supabase/migrations/0004_challenge_invites.sql
//
// สองช่องทาง:
//  - ในแอป (IN_APP): เชิญเพื่อนที่มีบัญชีอยู่แล้ว ต้องกด "ตอบรับ" ก่อน
//  - ลิงก์สาธารณะ (LINK): แชร์ไปที่ไหนก็ได้ (เช่น Facebook) ใครก็กดรับได้เลย
//    ไม่ต้องมีบัญชีมาก่อน (แต่ต้องสมัคร/login ก่อนถึงจะ "รับคำท้า" จริงได้)

import { supabase } from "@/lib/supabase";
import type { ChallengeInviteRow, ChallengeRow, InvitePreview } from "@/types/database";

/** ค้นหาผู้ใช้จากชื่อที่แสดง เพื่อเลือกคนมาท้า (IN_APP) */
export async function searchUsersByName(query: string, excludeUserId: string) {
  if (!query.trim()) return { users: [] as { id: string; display_name: string; avatar_url: string | null }[], error: null };
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .ilike("display_name", `%${query.trim()}%`)
    .neq("id", excludeUserId)
    .limit(20);
  return { users: data ?? [], error: error?.message ?? null };
}

/** ส่งคำท้าตรงถึงเพื่อนที่มีบัญชีในระบบแล้ว (สร้างแจ้งเตือนให้ทันที) */
export async function inviteFriendToChallenge(challengeId: string, inviteeUserId: string, message?: string) {
  const { data, error } = await supabase.rpc("invite_friend_to_challenge", {
    p_challenge_id: challengeId,
    p_invitee_user_id: inviteeUserId,
    p_message: message ?? null,
  });
  return { inviteId: (data as string | null) ?? null, error: error?.message ?? null };
}

/**
 * ดึงลิงก์ท้าเพื่อนสาธารณะของ Challenge หนึ่ง ๆ — ใช้ token ที่ติดมากับทุก
 * challenge อยู่แล้ว (ไม่ต้องสร้างใหม่ทุกครั้งที่แชร์ ใช้ลิงก์เดิมซ้ำได้เรื่อย ๆ)
 */
export function buildInviteShareUrl(webBaseUrl: string, publicInviteToken: string) {
  return `${webBaseUrl.replace(/\/$/, "")}/invite/${publicInviteToken}`;
}

export async function getMyChallengeInviteToken(challengeId: string) {
  const { data, error } = await supabase.from("challenges").select("public_invite_token").eq("id", challengeId).single();
  return { token: (data as Pick<ChallengeRow, "public_invite_token"> | null)?.public_invite_token ?? null, error: error?.message ?? null };
}

/** หน้า Landing ตอนกดลิงก์ท้า — เห็นตัวอย่างได้แม้ยังไม่ login (bypass RLS ผ่าน RPC) */
export async function getInvitePreview(token: string) {
  const { data, error } = await supabase.rpc("get_invite_preview", { p_token: token });
  const row = (data as InvitePreview[] | null)?.[0] ?? null;
  return { preview: row, error: error?.message ?? null };
}

/** รับคำท้าจากลิงก์สาธารณะ — ต้อง login แล้วเท่านั้น */
export async function acceptChallengeInviteByToken(token: string) {
  const { data, error } = await supabase.rpc("accept_challenge_invite", { p_token: token });
  return { challengeId: (data as string | null) ?? null, error: error?.message ?? null };
}

/** คำเชิญ IN_APP ที่ค้างตอบรับของฉัน — โชว์ใน Community inbox */
export async function listPendingChallengeInvites(userId: string) {
  const { data, error } = await supabase
    .from("challenge_invites")
    .select("*, challenges:challenge_id(id, title, goal_description), inviter:inviter_id(display_name)")
    .eq("invitee_user_id", userId)
    .eq("status", "PENDING")
    .eq("channel", "IN_APP")
    .order("created_at", { ascending: false });
  return {
    rows: (data ?? []) as (ChallengeInviteRow & {
      challenges: { id: string; title: string; goal_description: string } | null;
      inviter: { display_name: string } | null;
    })[],
    error: error?.message ?? null,
  };
}

/** ตอบรับ/ปฏิเสธคำเชิญ IN_APP — ตอบรับแล้วได้ Challenge โคลนของตัวเองกลับมา */
export async function respondToChallengeInvite(inviteId: string, accept: boolean) {
  const { data, error } = await supabase.rpc("respond_to_challenge_invite", {
    p_invite_id: inviteId,
    p_accept: accept,
  });
  return { newChallengeId: (data as string | null) ?? null, error: error?.message ?? null };
}

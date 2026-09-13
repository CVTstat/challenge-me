// ฟีเจอร์ 3 (FEATURE-REQUIREMENTS.md ข้อ 3) — Expertise / Skills Profile
// self-declare เท่านั้นใน V1 (FR3.2) — เพิ่ม tag แรก = ได้ badge
// EXPERIENCED_HELPER อัตโนมัติ (FR3.3)

import { supabase } from "@/lib/supabase";
import type { CommunityBadgeRow, ExpertiseTagRow } from "@/types/database";

export async function listMyExpertiseTags(userId: string) {
  const { data, error } = await supabase
    .from("expertise_tags")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  return { tags: (data ?? []) as ExpertiseTagRow[], error: error?.message ?? null };
}

export async function addExpertiseTag(userId: string, category: string, label: string) {
  const { data, error } = await supabase
    .from("expertise_tags")
    .insert({ user_id: userId, category, label })
    .select()
    .single();
  if (error) return { tag: null, error: error.message };

  // FR3.3: เพิ่ม tag อย่างน้อย 1 อัน -> ได้ badge EXPERIENCED_HELPER
  // (upsert กัน insert ซ้ำ เพราะ community_badges มี unique(user_id, badge))
  const { error: badgeError } = await supabase
    .from("community_badges")
    .upsert({ user_id: userId, badge: "EXPERIENCED_HELPER", granted_by: "SYSTEM" }, { onConflict: "user_id,badge" });

  return { tag: data as ExpertiseTagRow, error: badgeError?.message ?? null };
}

export async function removeExpertiseTag(tagId: string) {
  const { error } = await supabase.from("expertise_tags").delete().eq("id", tagId);
  return { error: error?.message ?? null };
}

export async function listMyBadges(userId: string) {
  const { data, error } = await supabase.from("community_badges").select("*").eq("user_id", userId);
  return { badges: (data ?? []) as CommunityBadgeRow[], error: error?.message ?? null };
}

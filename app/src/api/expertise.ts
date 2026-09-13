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
  //
  // สำคัญ: การให้ badge เป็นแค่ "ผลพลอยได้" ของการเพิ่ม tag ไม่ใช่สิ่งที่ผู้ใช้
  // ตั้งใจทำ ถ้าขั้นนี้พลาดก็ต้องไม่ทำให้ผู้ใช้เห็นว่า "เพิ่มไม่สำเร็จ" ทั้งที่
  // tag ถูกบันทึกลงฐานข้อมูลเรียบร้อยแล้ว
  //
  // บั๊กที่เจอจริง: ตาราง community_badges เปิด RLS ไว้แต่มี policy แค่ select
  // การ upsert จึงโดนบล็อกและคืน error ออกมา ทำให้หน้าจอขึ้นว่าเพิ่มไม่สำเร็จ
  // และไม่โหลดรายการใหม่ ทั้งที่จริง ๆ tag เพิ่มไปแล้ว (แก้ RLS ที่ migration
  // 0010 ส่วนตรงนี้กันไว้อีกชั้นเผื่อยังไม่ได้รัน SQL หรือมีปัญหาอื่นในอนาคต)
  // ต้องใช้ ignoreDuplicates: true (= ON CONFLICT DO NOTHING) ไม่ใช่ upsert ปกติ
  //
  // เหตุผล: upsert ธรรมดาจะกลายเป็น UPDATE เมื่อมีเหรียญอยู่แล้ว (ตั้งแต่การ
  // เพิ่ม tag อันแรก) ซึ่งจะโดน RLS บล็อกอีกแบบ เพราะเราตั้งใจไม่เปิด policy
  // สำหรับ update เหรียญ — และจริง ๆ ก็ไม่มีอะไรต้องอัปเดตอยู่แล้ว แค่ "ถ้ายัง
  // ไม่มีก็ให้" เท่านั้น (ทดสอบกับ Postgres จริงแล้วว่า upsert แบบเดิมพังจริง)
  const { error: badgeError } = await supabase
    .from("community_badges")
    .upsert(
      { user_id: userId, badge: "EXPERIENCED_HELPER", granted_by: "SYSTEM" },
      { onConflict: "user_id,badge", ignoreDuplicates: true }
    );

  return { tag: data as ExpertiseTagRow, error: null, badgeError: badgeError?.message ?? null };
}

export async function removeExpertiseTag(tagId: string) {
  const { error } = await supabase.from("expertise_tags").delete().eq("id", tagId);
  return { error: error?.message ?? null };
}

export async function listMyBadges(userId: string) {
  const { data, error } = await supabase.from("community_badges").select("*").eq("user_id", userId);
  return { badges: (data ?? []) as CommunityBadgeRow[], error: error?.message ?? null };
}

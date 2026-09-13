// กล่องแจ้งเตือน "เรื่องที่เกี่ยวข้องกับเรา"
//
// แถวในตาราง notifications ถูกสร้างโดย trigger ในฐานข้อมูล (migration 0011)
// ไม่ใช่จากโค้ดฝั่งนี้ — ฝั่งแอปมีหน้าที่แค่ "อ่าน" กับ "กดว่าอ่านแล้ว"
// (เขียนไม่ได้ด้วย เพราะ RLS ไม่เปิด insert ให้ผู้ใช้ กันคนยัดข้อความใส่กล่องคนอื่น)

import { supabase } from "@/lib/supabase";

/** ชนิดการแจ้งเตือนทั้งหมดที่ฐานข้อมูลรู้จัก (enum notification_type) */
export type NotificationType =
  | "CHEER"
  | "COMMENT"
  | "MILESTONE"
  | "PUSH_AGGREGATE"
  | "RESCUE_TRIGGERED"
  | "SUPPORTER_INVITE"
  | "SUPPORTER_ACCEPTED"
  | "HELP_REPLY"
  | "GLOBAL_REWARD_UNLOCKED"
  | "DARUMA_EYE_REMINDER"
  | "CHALLENGE_INVITE"
  | "CHALLENGE_INVITE_ACCEPTED";

export interface NotificationRow {
  id: string;
  user_id: string;
  type: NotificationType;
  payload: {
    from_name?: string;
    from_user_id?: string;
    challenge_id?: string;
    challenge_title?: string;
    help_request_id?: string;
    invite_id?: string;
    text?: string;
    [key: string]: unknown;
  };
  read_at: string | null;
  delivered_at?: string | null;
  created_at: string;
}

export async function listMyNotifications(userId: string, limit = 50) {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return { notifications: (data ?? []) as NotificationRow[], error: error?.message ?? null };
}

/** จำนวนที่ยังไม่ได้อ่าน — ใช้โชว์ตัวเลขแดงบนกระดิ่ง */
export async function countUnreadNotifications(userId: string) {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  return { count: count ?? 0, error: error?.message ?? null };
}

export async function markNotificationRead(id: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .is("read_at", null);
  return { error: error?.message ?? null };
}

export async function markAllNotificationsRead(userId: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);
  return { error: error?.message ?? null };
}

/**
 * แปลงการแจ้งเตือนเป็นข้อความที่คนอ่านรู้เรื่อง
 *
 * เก็บใน payload เป็น jsonb แทนที่จะเก็บข้อความสำเร็จรูปในฐานข้อมูล เพราะ
 * ถ้าวันหลังอยากแก้สำนวนหรือเพิ่มภาษาอังกฤษ จะได้แก้ที่นี่ที่เดียว
 * ไม่ต้องไล่แก้ข้อความเก่าที่บันทึกไปแล้วเป็นพัน ๆ แถว
 */
export function describeNotification(n: NotificationRow): { icon: string; title: string; body: string } {
  const who = n.payload?.from_name ?? "เพื่อนคนหนึ่ง";
  const what = n.payload?.challenge_title ?? "";
  const text = n.payload?.text ?? "";

  switch (n.type) {
    case "CHEER":
      return { icon: "❤️", title: `${who} ส่งกำลังใจให้คุณ`, body: what };
    case "COMMENT":
      return { icon: "💬", title: `${who} แสดงความคิดเห็น`, body: text || what };
    case "CHALLENGE_INVITE":
      return { icon: "🎯", title: `${who} ท้าคุณมาทำด้วยกัน`, body: text || what };
    case "CHALLENGE_INVITE_ACCEPTED":
      return { icon: "🔥", title: `${who} รับคำท้าของคุณแล้ว`, body: what };
    case "HELP_REPLY":
      return { icon: "🧭", title: `${who} ตอบคำถามของคุณแล้ว`, body: text };
    case "PUSH_AGGREGATE":
      return { icon: "💪", title: `${who} ส่งแรงผลักดันมาให้คุณ`, body: what };
    case "RESCUE_TRIGGERED":
      return { icon: "🛟", title: "Challenge ของคุณกำลังจะหลุด", body: what };
    case "SUPPORTER_INVITE":
      return { icon: "📬", title: `${who} ชวนคุณเป็นผู้สนับสนุน`, body: what };
    case "SUPPORTER_ACCEPTED":
      return { icon: "👥", title: `${who} มาเป็นผู้สนับสนุนของคุณแล้ว`, body: what };
    case "MILESTONE":
      return { icon: "🏁", title: "ผ่าน Milestone แล้ว", body: what };
    case "GLOBAL_REWARD_UNLOCKED":
      return { icon: "🎁", title: "ปลดล็อกรางวัลจาก Global Challenge", body: what };
    case "DARUMA_EYE_REMINDER":
      return { icon: "👁️", title: "ดารุมะรอตาข้างที่สองจากคุณอยู่", body: what };
    default:
      return { icon: "🔔", title: "มีอัปเดตใหม่", body: what };
  }
}

/** เวลาแบบอ่านง่าย: เมื่อกี้ / 5 นาทีที่แล้ว / 3 ชั่วโมงที่แล้ว / 2 วันที่แล้ว */
export function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "เมื่อกี้";
  if (mins < 60) return `${mins} นาทีที่แล้ว`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} วันที่แล้ว`;
  return new Date(iso).toLocaleDateString("th-TH");
}

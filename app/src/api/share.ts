// ฟีเจอร์ 14 (FEATURE-REQUIREMENTS.md ข้อ 14) — Share Card + Deep Link
//
// หมายเหตุการตัดสินใจ (engineering decision ที่ควรรู้): การ render รูปภาพ
// Share Card จริง (branding + Daruma state + QR) ต้องมี image-generation
// service แยก (เช่น Supabase Edge Function ที่ใช้ satori/resvg หรือ headless
// browser) ซึ่งเกินขอบเขตของ scaffold นี้ — เวอร์ชันนี้จึงทำแค่ส่วนที่ FR14
// บังคับจริง ๆ คือ (1) บันทึก share_cards row ทุกครั้งที่ trigger [FR14 AC]
// และ (2) เปิด native Share sheet ด้วยข้อความ + deep link (FR14.2-14.4)
// ส่วนรูปภาพให้ต่อ image-generation service เข้ามาเติม `image_url` ทีหลังได้
// โดยไม่ต้องแก้ schema หรือ API shape ตรงนี้เลย

import { Share } from "react-native";
import { supabase } from "@/lib/supabase";
import type { ChallengeRow, ShareCardType } from "@/types/database";

const DEEP_LINK_SCHEME = "challengeme://challenge";

// ข้อความตามธีมต้นไม้: เริ่มปลูก → ดูแลจนโต → ได้ใบไม้ 1 ใบเมื่อสำเร็จจริง
const SHARE_COPY: Record<ShareCardType, (c: ChallengeRow) => string> = {
  START: (c) => `🌱 ปลูกต้นกล้าใหม่แล้ว\n\nผมรับคำท้านี้: ${c.title}\n\n❤️ มาช่วยเชียร์กันหน่อย`,
  PROGRESS: (c) => `🌱 กำลังดูแลต้นนี้อยู่: ${c.title}\n\n❤️ มาช่วยเชียร์กันหน่อย`,
  MILESTONE: (c) => `🌿 โตขึ้นอีกขั้นแล้วใน ${c.title}\n\n❤️ มาช่วยเชียร์กันหน่อย`,
  IM_BACK: (c) => `🌱 กลับมาแล้ว\n\nต้นนี้ยังไม่ตาย — ${c.title} ของผมยังไปต่อ\n\n❤️ ใครช่วยดันผมกลับมาบ้าง`,
  COMPLETE: (c) => `🍃 ได้ใบไม้ใหม่ 1 ใบ!\n\n${c.title} — ทำสำเร็จแล้ว\n\n❤️ ขอบคุณทุกคนที่ช่วยเชียร์`,
};

/** FR14.1/AC: บันทึก share_cards row ทุกครั้งที่ trigger แม้ผู้ใช้จะปิด native share sheet ทิ้ง */
export async function generateAndShareCard(challenge: ChallengeRow, type: ShareCardType) {
  const deepLink = `${DEEP_LINK_SCHEME}/${challenge.id}`;

  const { error: insertError } = await supabase.from("share_cards").insert({
    challenge_id: challenge.id,
    type,
    deep_link: deepLink,
  });
  if (insertError) return { error: insertError.message };

  try {
    await Share.share({
      message: `${SHARE_COPY[type](challenge)}\n\n${deepLink}`,
    });
  } catch (e) {
    // ผู้ใช้ปิด share sheet เอง หรือ share ไม่สำเร็จ — ไม่ถือเป็น error ของ flow หลัก (FR14.4)
  }

  return { error: null as string | null };
}

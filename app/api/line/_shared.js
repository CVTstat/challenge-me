// เครื่องมือที่ใช้ร่วมกันของทุกฟังก์ชันฝั่ง LINE
// ไฟล์ที่ขึ้นต้นด้วย _ จะไม่ถูก Vercel มองเป็น endpoint (เป็นไลบรารีภายใน)

const LINE_API = "https://api.line.me/v2/bot";

function serviceHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

/** เรียก Supabase ด้วยสิทธิ์ service role (เฉพาะฝั่งเซิร์ฟเวอร์เท่านั้น) */
async function supabaseRpc(fn, args) {
  // รับได้ทั้งสองชื่อ: ตอน build ฝั่งเว็บใช้ EXPO_PUBLIC_SUPABASE_URL
  // แต่บางคนตั้งฝั่งเซิร์ฟเวอร์เป็น SUPABASE_URL เฉย ๆ — เอาอันไหนมีก็ใช้อันนั้น
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const response = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: serviceHeaders(),
    body: JSON.stringify(args || {}),
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  return { ok: response.ok, status: response.status, data };
}

/**
 * ส่งข้อความหาผู้ใช้คนหนึ่ง (push) — กินโควตาข้อความของ LINE OA
 * แพ็กเกจฟรีในไทยส่งได้ราว 300 ข้อความ/เดือน และนับต่อผู้รับ
 * จึงใช้เฉพาะเรื่องด่วนกับสรุปรายวันเท่านั้น
 */
async function pushMessage(to, messages) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return { ok: false, error: "ไม่ได้ตั้ง LINE_CHANNEL_ACCESS_TOKEN" };
  const response = await fetch(`${LINE_API}/message/push`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ to, messages }),
  });
  if (response.ok) return { ok: true };
  const body = await response.text();
  return { ok: false, error: `LINE ปฏิเสธ (${response.status}): ${body.slice(0, 200)}` };
}

/**
 * ตอบกลับข้อความที่ผู้ใช้ทักมา — ไม่นับโควตา ส่งได้ไม่จำกัด
 * ใช้กับปุ่ม "ดูอัปเดตของฉัน" ใน Rich Menu เพื่อให้ผู้ใช้ดึงข่าวเองได้ฟรี
 * (replyToken ใช้ได้ครั้งเดียวและหมดอายุเร็ว ต้องตอบทันที)
 */
async function replyMessage(replyToken, messages) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return { ok: false, error: "ไม่ได้ตั้ง LINE_CHANNEL_ACCESS_TOKEN" };
  const response = await fetch(`${LINE_API}/message/reply`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ replyToken, messages }),
  });
  if (response.ok) return { ok: true };
  const body = await response.text();
  return { ok: false, error: `LINE ปฏิเสธ (${response.status}): ${body.slice(0, 200)}` };
}

/**
 * แปลงการแจ้งเตือนหนึ่งรายการเป็นข้อความภาษาคน
 * ใช้สำนวนเดียวกับที่โชว์ในแอป (ดู app/src/api/notifications.ts)
 */
function describeNotification(type, payload) {
  const p = payload || {};
  const who = p.from_name || "เพื่อนคนหนึ่ง";
  const what = p.challenge_title || "";
  const text = p.text || "";

  switch (type) {
    case "CHEER":
      return `❤️ ${who} ส่งกำลังใจให้คุณ${what ? ` — ${what}` : ""}`;
    case "COMMENT":
      return `💬 ${who} แสดงความคิดเห็น${text ? `: ${text}` : ""}`;
    case "CHALLENGE_INVITE":
      return `🎯 ${who} ท้าคุณมาทำด้วยกัน${text || what ? ` — ${text || what}` : ""}`;
    case "CHALLENGE_INVITE_ACCEPTED":
      return `🔥 ${who} รับคำท้าของคุณแล้ว${what ? ` — ${what}` : ""}`;
    case "HELP_REPLY":
      return `🧭 ${who} ตอบคำถามของคุณแล้ว${text ? `: ${text}` : ""}`;
    case "PUSH_AGGREGATE":
      return `💪 ${who} ส่งแรงผลักดันมาให้คุณ${what ? ` — ${what}` : ""}`;
    case "RESCUE_TRIGGERED":
      return `🛟 Challenge ของคุณกำลังจะหลุด${what ? ` — ${what}` : ""}`;
    case "SUPPORTER_INVITE":
      return `📬 ${who} ชวนคุณเป็นผู้สนับสนุน${what ? ` — ${what}` : ""}`;
    case "SUPPORTER_ACCEPTED":
      return `👥 ${who} มาเป็นผู้สนับสนุนของคุณแล้ว${what ? ` — ${what}` : ""}`;
    case "MILESTONE":
      return `🏁 ผ่าน Milestone แล้ว${what ? ` — ${what}` : ""}`;
    case "GLOBAL_REWARD_UNLOCKED":
      return `🎁 ปลดล็อกรางวัลจาก Global Challenge แล้ว`;
    case "DARUMA_EYE_REMINDER":
      return `👁️ ดารุมะรอตาข้างที่สองจากคุณอยู่${what ? ` — ${what}` : ""}`;
    default:
      return "🔔 มีอัปเดตใหม่ในแอป";
  }
}

/** ลิงก์กลับเข้าแอป (ใส่ไว้ท้ายข้อความให้กดกลับมาได้ทันที) */
function appUrl() {
  return process.env.EXPO_PUBLIC_WEB_BASE_URL || "https://challenge-me-one.vercel.app";
}

/**
 * ประกอบข้อความแจ้งเตือนหลายรายการเป็น "ข้อความเดียว"
 * สำคัญเรื่องค่าใช้จ่าย: LINE นับโควตาต่อ "ครั้งที่ส่งต่อผู้รับ" ไม่ใช่ต่อบรรทัด
 * รวมหลายเรื่องไว้ในข้อความเดียวจึงถูกกว่าการยิงทีละเรื่องมาก
 */
function buildNotificationMessage(lines, heading) {
  const body = lines.map((l) => `• ${l}`).join("\n");
  return [
    {
      type: "text",
      text: `${heading}\n\n${body}\n\n👉 เปิดแอป: ${appUrl()}`,
    },
  ];
}

module.exports = {
  supabaseRpc,
  pushMessage,
  replyMessage,
  describeNotification,
  buildNotificationMessage,
  appUrl,
};

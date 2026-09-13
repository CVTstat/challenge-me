// Webhook ของ LINE — จุดที่ทำให้ "ผู้ใช้มาถามเอง" ได้ฟรีไม่จำกัด
//
// หัวใจเรื่องค่าใช้จ่าย: ข้อความที่เรา "ส่งไปหา" ผู้ใช้ (push) กินโควตา
// แต่ข้อความที่เรา "ตอบกลับ" เวลาผู้ใช้ทักมา (reply) ไม่นับโควตาเลย
// เราจึงใส่ปุ่ม "ดูอัปเดตของฉัน" ไว้ใน Rich Menu ให้ผู้ใช้กดดูเองได้ตลอด
// โดยไม่เสียโควตาแม้แต่ข้อความเดียว
//
// ความปลอดภัย: ต้องตรวจลายเซ็น X-Line-Signature ทุกครั้ง ไม่งั้นใครก็ยิง
// ข้อมูลปลอมเข้ามาที่ URL นี้ได้ (URL ของ webhook เป็นสาธารณะ)

const crypto = require("crypto");
const { supabaseRpc, replyMessage, describeNotification, appUrl } = require("./_shared");

/**
 * อ่าน body ดิบ ๆ ให้ได้ไบต์ตรงกับที่ LINE ส่งมา
 *
 * จำเป็นเพราะการตรวจลายเซ็นคำนวณจากข้อความต้นฉบับเป๊ะ ๆ ถ้าเอา object ที่
 * ถูกแปลงแล้วมา stringify ใหม่ ช่องว่างหรือลำดับคีย์อาจเพี้ยนจนลายเซ็นไม่ตรง
 * (บางสภาพแวดล้อมแปลง body ให้ก่อนถึงมือเรา จึงมีทางสำรองไว้ด้วย)
 */
function readRawBody(req) {
  return new Promise((resolve) => {
    if (typeof req.body === "string") return resolve(req.body);
    if (Buffer.isBuffer(req.body)) return resolve(req.body.toString("utf8"));
    if (!req.readable) {
      return resolve(req.body ? JSON.stringify(req.body) : "");
    }
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", () => resolve(""));
  });
}

function verifySignature(rawBody, signature) {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
  // เทียบแบบ timing-safe กันการเดาลายเซ็นทีละไบต์
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** ข้อความสรุปสถานะของผู้ใช้คนหนึ่ง — ใช้ตอบกลับแบบไม่กินโควตา */
async function buildDigestText(lineUserId) {
  const result = await supabaseRpc("line_user_digest", { p_line_user_id: lineUserId });
  const row = Array.isArray(result.data) ? result.data[0] : result.data;

  if (!result.ok || !row || !row.display_name) {
    return (
      "ยังไม่พบบัญชีที่ผูกกับ LINE นี้\n\n" +
      `เปิดแอปแล้วกดเข้าสู่ระบบด้วย LINE หนึ่งครั้ง แล้วกลับมากดใหม่ได้เลย\n👉 ${appUrl()}`
    );
  }

  const lines = [];
  lines.push(`สวัสดี ${row.display_name} 👋`);
  lines.push("");
  lines.push(`🍃 ใบไม้ที่ได้แล้ว: ${row.leaves ?? 0}`);
  lines.push(`🌱 กำลังพยายาม: ${row.growing ?? 0}`);

  const unread = Number(row.unread_count || 0);
  const recent = Array.isArray(row.recent) ? row.recent : [];
  if (unread > 0 && recent.length > 0) {
    lines.push("");
    lines.push(`🔔 ยังไม่ได้อ่าน ${unread} เรื่อง:`);
    for (const item of recent) {
      lines.push(`• ${describeNotification(item.type, item.payload)}`);
    }
  } else {
    lines.push("");
    lines.push("ตอนนี้ยังไม่มีเรื่องใหม่ — ไปลงมือทำต่อกันเลย 💪");
  }

  lines.push("");
  lines.push(`👉 เปิดแอป: ${appUrl()}`);
  return lines.join("\n");
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).send("method not allowed");
    return;
  }

  const rawBody = await readRawBody(req);
  const signature = req.headers["x-line-signature"];

  if (!verifySignature(rawBody, signature)) {
    // ตอบ 401 เฉย ๆ ไม่ต้องบอกรายละเอียดว่าพลาดตรงไหน
    res.status(401).send("invalid signature");
    return;
  }

  let payload = {};
  try {
    payload = JSON.parse(rawBody || "{}");
  } catch {
    payload = {};
  }

  const events = Array.isArray(payload.events) ? payload.events : [];

  // ตอบ 200 ให้ LINE ก่อนเสมอ แม้จะยังประมวลผลไม่เสร็จ
  // ถ้าตอบช้าหรือตอบ error LINE จะพยายามส่งซ้ำ และอาจปิด webhook ให้เอง
  res.status(200).send("ok");

  for (const event of events) {
    const lineUserId = event.source && event.source.userId;
    if (!lineUserId || !event.replyToken) continue;

    try {
      if (event.type === "follow") {
        await replyMessage(event.replyToken, [
          {
            type: "text",
            text:
              "ยินดีต้อนรับสู่ Challenge Me 🌱\n\n" +
              "เปลี่ยนสิ่งที่อยากทำ ให้กลายเป็นสิ่งที่ทำสำเร็จ\n\n" +
              `กดเปิดแอปแล้วเข้าสู่ระบบด้วย LINE หนึ่งครั้ง เพื่อรับการแจ้งเตือนที่นี่\n👉 ${appUrl()}`,
          },
        ]);
        continue;
      }

      // ข้อความอะไรก็ตามที่ทักมา (รวมถึงปุ่มใน Rich Menu ที่ตั้งเป็นส่งข้อความ)
      // ให้ตอบสรุปสถานะกลับไป — ฟรี ไม่กินโควตา
      if (event.type === "message" || event.type === "postback") {
        const text = await buildDigestText(lineUserId);
        await replyMessage(event.replyToken, [{ type: "text", text }]);
      }
    } catch {
      // ห้ามให้ event เดียวพังแล้วลากทั้งชุดล่ม — ข้ามไปทำอันถัดไป
    }
  }
};

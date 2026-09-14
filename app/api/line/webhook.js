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

function signatureMatches(secret, body, signature) {
  const expected = crypto.createHmac("sha256", secret).update(body).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * ตรวจลายเซ็นจาก LINE
 *
 * ลองเทียบกับ body หลายรูปแบบ เพราะบางสภาพแวดล้อมแปลง JSON ให้เรียบร้อยแล้ว
 * ก่อนถึงมือเรา ทำให้อ่านไบต์ต้นฉบับไม่ได้ ต้องประกอบกลับเอง ซึ่งอาจได้
 * ช่องว่างหรือลำดับคีย์ไม่ตรงเป๊ะ — ถ้าเทียบแบบเดียวแล้วพลาด จะกลายเป็น
 * ปฏิเสธข้อความจริงทิ้งทั้งหมดโดยไม่มีใครรู้สาเหตุ
 *
 * ความปลอดภัยไม่ลดลง เพราะทุกแบบยังต้องเซ็นด้วย channel secret ตัวจริงเหมือนเดิม
 */
function verifySignature(candidates, signature) {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret || !signature) return false;
  return candidates.some((body) => {
    if (typeof body !== "string" || body.length === 0) return false;
    try {
      return signatureMatches(secret, body, signature);
    } catch {
      return false;
    }
  });
}

/** รูปแบบ body ที่เป็นไปได้ทั้งหมด เอาไว้ลองเทียบลายเซ็น */
function bodyCandidates(req, raw) {
  const list = [raw];
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    try {
      list.push(JSON.stringify(req.body));
    } catch {
      /* ข้ามไป */
    }
  }
  return list.filter(Boolean);
}

/**
 * บันทึกผลการตอบกลับลง log
 *
 * เหตุผล: ถ้า LINE ปฏิเสธ (เช่น access token ผิด หรือ replyToken หมดอายุ)
 * ผู้ใช้จะเห็นแค่ "กดแล้วเงียบ" เหมือนกันหมด แยกไม่ออกว่าพังตรงไหน
 * มี log ไว้ เปิด Vercel → Logs แล้วรู้สาเหตุได้ทันที
 */
function logReply(result) {
  if (result && result.ok) return;
  console.error("[line-webhook] ตอบกลับไม่สำเร็จ:", result && result.error);
}

/** ข้อความสรุปสถานะของผู้ใช้คนหนึ่ง — ใช้ตอบกลับแบบไม่กินโควตา */
async function buildDigestText(lineUserId) {
  const result = await supabaseRpc("line_user_digest", { p_line_user_id: lineUserId });
  const row = Array.isArray(result.data) ? result.data[0] : result.data;

  // 404 จาก PostgREST = ยังไม่มีฟังก์ชันนี้ในฐานข้อมูล แปลว่ายังไม่ได้รัน
  // migration 0012 — คนละเรื่องกับ "ผู้ใช้ยังไม่ได้ผูกบัญชี" ต้องบอกให้ต่างกัน
  // ไม่งั้นไล่หาสาเหตุผิดทาง
  if (result.status === 404) {
    console.error("[line-webhook] ไม่พบฟังก์ชัน line_user_digest — ยังไม่ได้รัน migration 0012");
    return `ระบบยังตั้งค่าไม่เสร็จ ลองใหม่อีกครั้งภายหลังนะ\n👉 ${appUrl()}`;
  }

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
  // โหมดตรวจสุขภาพ: เปิด .../api/line/webhook?check=1 ในเบราว์เซอร์แล้วจะบอกว่า
  // ตั้งค่าตัวแปรครบหรือยัง — ตอบเป็น true/false เท่านั้น ไม่เผยค่าจริงออกไป
  // (URL นี้เป็นสาธารณะ ใครเปิดก็ได้ จึงห้ามแสดงค่า secret เด็ดขาด)
  if (req.method === "GET" && req.query && req.query.check) {
    res.status(200).json({
      ok: true,
      secretConfigured: Boolean(process.env.LINE_CHANNEL_SECRET),
      tokenConfigured: Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN),
      supabaseUrlConfigured: Boolean(process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL),
      supabaseKeyConfigured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      appUrlConfigured: Boolean(appUrl()),
    });
    return;
  }

  if (req.method !== "POST") {
    res.status(405).send("method not allowed");
    return;
  }

  const rawBody = await readRawBody(req);
  const signature = req.headers["x-line-signature"];

  if (!verifySignature(bodyCandidates(req, rawBody), signature)) {
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

  // สำคัญมาก: ต้องตอบกลับ LINE ให้เสร็จ "ก่อน" ที่จะปิด response
  //
  // เดิมโค้ดตอบ 200 ให้ LINE ก่อนแล้วค่อยไปทำงานต่อ ซึ่งเป็นวิธีที่ใช้ได้บน
  // เซิร์ฟเวอร์ที่รันค้างไว้ตลอด แต่บน Vercel ฟังก์ชันเป็นแบบ serverless —
  // พอส่ง response ออกไปแล้ว ระบบอาจ "แช่แข็ง" ฟังก์ชันทันที งานที่ค้างอยู่
  // (การยิงข้อความตอบกลับไปหา LINE) จึงอาจไม่ถูกทำเลย
  // อาการที่ผู้ใช้เห็นคือ "กดปุ่มแล้วเงียบ" ทั้งที่ไม่มี error ที่ไหนเลย
  //
  // ทำให้เสร็จก่อนค่อยตอบ 200 ใช้เวลาไม่ถึงวินาที ยังทันเวลาที่ LINE รอ
  for (const event of events) {
    const lineUserId = event.source && event.source.userId;
    if (!lineUserId || !event.replyToken) continue;

    try {
      if (event.type === "follow") {
        logReply(await replyMessage(event.replyToken, [
          {
            type: "text",
            text:
              "ยินดีต้อนรับสู่ Challenge Me 🌱\n\n" +
              "เปลี่ยนสิ่งที่อยากทำ ให้กลายเป็นสิ่งที่ทำสำเร็จ\n\n" +
              `กดเปิดแอปแล้วเข้าสู่ระบบด้วย LINE หนึ่งครั้ง เพื่อรับการแจ้งเตือนที่นี่\n👉 ${appUrl()}`,
          },
        ]));
        continue;
      }

      // ข้อความอะไรก็ตามที่ทักมา (รวมถึงปุ่มใน Rich Menu ที่ตั้งเป็นส่งข้อความ)
      // ให้ตอบสรุปสถานะกลับไป — ฟรี ไม่กินโควตา
      if (event.type === "message" || event.type === "postback") {
        const text = await buildDigestText(lineUserId);
        logReply(await replyMessage(event.replyToken, [{ type: "text", text }]));
      }
    } catch (error) {
      // ห้ามให้ event เดียวพังแล้วลากทั้งชุดล่ม — ข้ามไปทำอันถัดไป
      // แต่ต้องทิ้งร่องรอยไว้ใน Vercel Logs ไม่งั้นเวลาเงียบจะหาสาเหตุไม่เจอ
      console.error("[line-webhook] จัดการ event ไม่สำเร็จ:", error && error.message);
    }
  }

  // ตอบ 200 เสมอ ถึงจะมี event ไหนพลาดไปก็ตาม
  // ถ้าตอบ error กลับไป LINE จะส่งซ้ำเรื่อย ๆ และอาจปิด webhook ให้เอง
  res.status(200).send("ok");
};

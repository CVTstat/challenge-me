// สรุปรายวัน — รวบเรื่องที่ "ไม่ด่วน" ที่ค้างอยู่ ส่งเป็นข้อความเดียวต่อคนต่อวัน
//
// ทำไมต้องรวบ: LINE OA แพ็กเกจฟรีในไทยส่งได้ราว 300 ข้อความ/เดือน และนับต่อ
// ผู้รับ ถ้าเตือนทุกครั้งที่มีคนกดให้กำลังใจ ผู้ใช้ 20 คนก็ใช้โควตาหมดภายใน
// สัปดาห์เดียว การรวบเป็นวันละครั้งทำให้คุมค่าใช้จ่ายได้และไม่รบกวนผู้ใช้ด้วย
//
// เรียกด้วย Cron ของ Vercel วันละครั้ง (ดู vercel.json) หรือเรียกมือ:
//   /api/line/digest?key=<LINE_TASK_SECRET>

const {
  supabaseRpc,
  pushMessage,
  describeNotification,
  buildNotificationMessage,
} = require("./_shared");

function json(res, status, body) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.status(status).send(JSON.stringify(body));
}

function authorized(req) {
  // รับได้ทั้งคีย์ของเราเองและ CRON_SECRET ที่ Vercel Cron ส่งมาให้
  const secrets = [process.env.LINE_TASK_SECRET, process.env.CRON_SECRET].filter(Boolean);
  if (secrets.length === 0) return false;
  const fromQuery = req.query && req.query.key;
  const header = req.headers && req.headers.authorization;
  return secrets.some((s) => fromQuery === s || header === `Bearer ${s}`);
}

// เกินจำนวนนี้จะสรุปเป็น "และอีก N เรื่อง" แทนการไล่ทีละบรรทัด
// (ข้อความ LINE ยาวเกินไปจะถูกตัด และอ่านยากด้วย)
const MAX_LINES = 6;

module.exports = async function handler(req, res) {
  if (!authorized(req)) return json(res, 401, { error: "unauthorized" });

  // false = เอาทุกอย่างที่ยังไม่ได้ส่ง (รวมเรื่องด่วนที่ตกค้างด้วย เผื่อรอบ
  // ส่งด่วนพลาดไป จะได้ไม่หายไปเฉย ๆ)
  const pending = await supabaseRpc("notifications_pending_delivery", { p_urgent_only: false });
  if (!pending.ok) {
    return json(res, 500, { error: "อ่านรายการที่รอส่งไม่สำเร็จ", detail: pending.data });
  }

  const rows = Array.isArray(pending.data) ? pending.data : [];
  if (rows.length === 0) return json(res, 200, { sent: 0, message: "ไม่มีอะไรต้องสรุปวันนี้" });

  const byUser = new Map();
  for (const row of rows) {
    if (!row.line_user_id) continue;
    const bucket = byUser.get(row.line_user_id) || { ids: [], lines: [] };
    bucket.ids.push(row.id);
    bucket.lines.push(describeNotification(row.type, row.payload));
    byUser.set(row.line_user_id, bucket);
  }

  let sent = 0;
  const delivered = [];
  const failures = [];

  for (const [lineUserId, bucket] of byUser) {
    const total = bucket.lines.length;
    const shown = bucket.lines.slice(0, MAX_LINES);
    if (total > MAX_LINES) shown.push(`และอีก ${total - MAX_LINES} เรื่อง`);

    const heading = `🌱 สรุปของคุณวันนี้ (${total} เรื่อง)`;
    const result = await pushMessage(lineUserId, buildNotificationMessage(shown, heading));
    if (result.ok) {
      sent += 1;
      delivered.push(...bucket.ids);
    } else {
      failures.push({ lineUserId, error: result.error });
    }
  }

  if (delivered.length > 0) {
    await supabaseRpc("mark_notifications_delivered", { p_ids: delivered });
  }

  return json(res, 200, { sent, notifications: delivered.length, failures });
};

// ส่งการแจ้งเตือน "เรื่องด่วน" ออกทาง LINE
//
// เรียกได้ 2 ทาง:
//   • ตั้ง Cron ของ Vercel ให้ยิงทุก ๆ กี่นาที (ดู vercel.json)
//   • เรียกมือเพื่อทดสอบ: /api/line/notify?key=<LINE_TASK_SECRET>
//
// "ด่วน" = เรื่องที่ต้องให้คนลงมือทำอะไร ถ้าบอกช้าก็หมดความหมาย
// (มีคนท้าเรา / มีคนตอบคำถามเรา / มีคนส่งแรงผลักดัน / Challenge กำลังจะหลุด)
// เรื่องอื่นรอไปรวมกับสรุปรายวันใน digest.js เพื่อประหยัดโควตาข้อความ
//
// กันส่งซ้ำ: ทุกแถวที่ส่งสำเร็จจะถูกประทับ delivered_at ผ่าน
// mark_notifications_delivered ถ้าส่งไม่สำเร็จจะไม่ประทับ รอบหน้าจึงลองใหม่เอง

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

/** กันคนนอกยิง endpoint นี้เล่นจนโควตาข้อความหมด */
function authorized(req) {
  // รับได้ทั้งคีย์ของเราเองและ CRON_SECRET ที่ Vercel Cron ส่งมาให้
  // (ตั้งค่าไหนก็ได้ หรือจะตั้งให้ค่าเดียวกันทั้งสองตัวก็ได้)
  const secrets = [process.env.LINE_TASK_SECRET, process.env.CRON_SECRET].filter(Boolean);
  if (secrets.length === 0) return false;
  const fromQuery = req.query && req.query.key;
  const header = req.headers && req.headers.authorization;
  return secrets.some((s) => fromQuery === s || header === `Bearer ${s}`);
}

module.exports = async function handler(req, res) {
  if (!authorized(req)) return json(res, 401, { error: "unauthorized" });

  const pending = await supabaseRpc("notifications_pending_delivery", { p_urgent_only: true });
  if (!pending.ok) {
    return json(res, 500, { error: "อ่านรายการที่รอส่งไม่สำเร็จ", detail: pending.data });
  }

  const rows = Array.isArray(pending.data) ? pending.data : [];
  if (rows.length === 0) return json(res, 200, { sent: 0, message: "ไม่มีเรื่องด่วนที่ต้องส่ง" });

  // รวมตามผู้รับ — คนหนึ่งคนได้ข้อความเดียว ถึงจะมีหลายเรื่องก็ตาม
  // (LINE นับโควตาต่อครั้งที่ส่ง ไม่ใช่ต่อเรื่อง)
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
    const heading = bucket.lines.length === 1 ? "🔔 มีเรื่องถึงคุณ" : `🔔 มี ${bucket.lines.length} เรื่องถึงคุณ`;
    const result = await pushMessage(lineUserId, buildNotificationMessage(bucket.lines, heading));
    if (result.ok) {
      sent += 1;
      delivered.push(...bucket.ids);
    } else {
      // ส่งไม่สำเร็จ (เช่นผู้ใช้บล็อก OA หรือโควตาหมด) — ไม่ประทับว่าส่งแล้ว
      // รอบหน้าจะลองใหม่ ไม่ทำให้การแจ้งเตือนหายไปเงียบ ๆ
      failures.push({ lineUserId, error: result.error });
    }
  }

  if (delivered.length > 0) {
    await supabaseRpc("mark_notifications_delivered", { p_ids: delivered });
  }

  return json(res, 200, { sent, notifications: delivered.length, failures });
};

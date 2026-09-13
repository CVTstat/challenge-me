// ตั้งค่า Rich Menu ของ LINE OA ให้อัตโนมัติ
//
// Rich Menu คือแถบเมนูที่ปักอยู่ล่างหน้าแชทตลอดเวลา — ทำหน้าที่เหมือน
// "ไอคอนแอป" ให้ผู้ใช้กดกลับเข้ามาได้ตลอด ซึ่งเป็นปัญหาใหญ่ของเว็บแอป
// (ปิดแท็บแล้วแทบไม่มีทางกลับมา)
//
// วิธีใช้ (ทำครั้งเดียว หลัง deploy):
//   1. เตรียมรูปเมนูขนาด 2500 x 843 px แล้วอัปโหลดไว้ที่ไหนสักที่ที่เปิดดูได้
//      หรือจะอัปโหลดผ่านหน้าเว็บ LINE Official Account Manager ก็ได้
//   2. เรียก /api/line/richmenu?key=<LINE_TASK_SECRET>  (POST หรือ GET ก็ได้)
//      → จะสร้างเมนู 2 ช่องและตั้งเป็นเมนูเริ่มต้นให้ทุกคน
//   3. อัปโหลดรูปเมนูที่ LINE Official Account Manager (Rich menu) ทับอีกที
//      เพราะการอัปโหลดรูปต้องส่งไฟล์ไบนารี ซึ่งทำผ่านหน้าเว็บง่ายกว่ามาก
//
// ช่องซ้าย  = เปิดแอป (LIFF) — ทางเข้าแอปหลัก
// ช่องขวา   = ส่งข้อความ "ดูอัปเดตของฉัน" → บอทตอบสรุปกลับ (ฟรี ไม่กินโควตา)

const LINE_API = "https://api.line.me/v2/bot";

function json(res, status, body) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.status(status).send(JSON.stringify(body));
}

function authorized(req) {
  const secret = process.env.LINE_TASK_SECRET;
  if (!secret) return false;
  const fromQuery = req.query && req.query.key;
  const header = req.headers && req.headers.authorization;
  return fromQuery === secret || header === `Bearer ${secret}`;
}

module.exports = async function handler(req, res) {
  if (!authorized(req)) return json(res, 401, { error: "unauthorized" });

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const liffId = process.env.LIFF_ID || process.env.EXPO_PUBLIC_LIFF_ID;
  if (!token) return json(res, 500, { error: "ไม่ได้ตั้ง LINE_CHANNEL_ACCESS_TOKEN" });
  if (!liffId) return json(res, 500, { error: "ไม่ได้ตั้ง LIFF_ID" });

  const richMenu = {
    size: { width: 2500, height: 843 },
    selected: true,
    name: "Challenge Me main menu",
    chatBarText: "เมนู Challenge Me",
    areas: [
      {
        bounds: { x: 0, y: 0, width: 1250, height: 843 },
        action: { type: "uri", label: "เปิดแอป", uri: `https://liff.line.me/${liffId}` },
      },
      {
        bounds: { x: 1250, y: 0, width: 1250, height: 843 },
        // ตั้งเป็น "ส่งข้อความ" ไม่ใช่ postback เพื่อให้ได้ replyToken
        // ซึ่งทำให้ตอบกลับได้ฟรี ไม่กินโควตาข้อความ
        action: { type: "message", label: "ดูอัปเดตของฉัน", text: "ดูอัปเดตของฉัน" },
      },
    ],
  };

  try {
    const created = await fetch(`${LINE_API}/richmenu`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(richMenu),
    });
    const createdBody = await created.json();
    if (!created.ok || !createdBody.richMenuId) {
      return json(res, 502, { error: "สร้าง Rich Menu ไม่สำเร็จ", detail: createdBody });
    }

    return json(res, 200, {
      richMenuId: createdBody.richMenuId,
      next:
        "สร้างเมนูแล้ว — ขั้นต่อไปให้อัปโหลดรูปขนาด 2500x843 px ให้เมนูนี้ " +
        "(ทำที่ LINE Official Account Manager > Rich menu ได้เลย) " +
        "แล้วตั้งเป็นเมนูเริ่มต้น",
    });
  } catch (e) {
    return json(res, 500, { error: "ติดต่อ LINE ไม่ได้" });
  }
};

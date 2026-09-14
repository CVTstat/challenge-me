// Vercel Serverless Function — เสิร์ฟหน้า Landing ของลิงก์ "ท้าเพื่อน" แบบ
// server-rendered ล้วน ๆ (ไม่พึ่ง JS ฝั่ง client) เพื่อให้ Facebook/LINE/ฯลฯ
// ที่มา crawl ลิงก์นี้ตอนโพสต์ เห็น <meta property="og:*"> ที่ถูกต้อง และ
// โชว์การ์ดพรีวิวสวย ๆ (รูป/ชื่อ Challenge จริง) แทนที่จะเห็นหน้าเปล่า ๆ ของ
// Single Page App ที่ render ด้วย JavaScript (ซึ่ง crawler ส่วนใหญ่มองไม่เห็น)
//
// รับ path: /invite/:token  (ดู vercel.json rewrite -> /api/invite/:token)
// คนจริงที่เห็นหน้านี้จะกดปุ่มแล้วเข้าแอปตัวจริงที่ /?invite=:token ต่อ

// ────────────────────────────────────────────────────────────────────────────
// เวอร์ชันของรูปปก (og:image) — สำคัญมาก อย่าตัดออก
//
// ปัญหาที่เจอจริง: ตอนเปลี่ยนรูปปกจากลายเดิมเป็นรูปดารุมะ โค้ดกับข้อความ
// อัปเดตขึ้นเว็บเรียบร้อย แต่ Facebook ยังโชว์รูป "เดิม" อยู่ ถึงจะกดสเครปใหม่
// ก็ไม่เปลี่ยน สาเหตุคือ URL ของรูปเป็น /api/og-cover เฉย ๆ ไม่เคยเปลี่ยนเลย
// และตัวไฟล์ถูกส่งมาพร้อม header "immutable" (บอกว่าห้ามโหลดซ้ำ) ทั้ง CDN ของ
// Vercel และตัวเก็บรูปของ Facebook จึงหยิบไฟล์เก่าที่แคชไว้มาใช้ต่อไปเรื่อย ๆ
//
// ทางแก้: ผูกลายนิ้วมือของไฟล์รูป (hash) ไว้ท้าย URL — พอเปลี่ยนรูปเมื่อไหร่
// URL จะเปลี่ยนตามเอง แคชเก่าจึงใช้ไม่ได้ ต้องไปโหลดรูปใหม่มาเสมอ
// (ถ้าอ่านไฟล์ไม่ได้ด้วยเหตุใดก็ตาม จะใช้ค่าคงที่สำรองแทน ไม่ทำให้หน้าพัง)
// ────────────────────────────────────────────────────────────────────────────
let OG_IMAGE_VERSION = "daruma1";
try {
  const buf = require("fs").readFileSync(require("path").join(__dirname, "..", "_assets", "og-cover.png"));
  OG_IMAGE_VERSION = require("crypto").createHash("md5").update(buf).digest("hex").slice(0, 10);
} catch {
  // ใช้ค่าคงที่สำรอง — ก็ยังต่างจาก URL เดิมที่ไม่มีเวอร์ชันเลย จึงยังล้างแคชได้
}

/**
 * เรียก API แบบมีเวลาหมดอายุ
 *
 * ทำไมต้องมี: หน้านี้คือหน้าแรกที่คนกดลิงก์คำท้าจะเห็น ถ้าปลายทางช้าหรือไม่ตอบ
 * (เช่น ฐานข้อมูลเพิ่งตื่นจากโหมดพัก หรือเน็ตสะดุด) โค้ดเดิมจะรอไปเรื่อย ๆ
 * จนชนเพดานเวลาของ Vercel แล้วขึ้นหน้า "504 GATEWAY_TIMEOUT" ให้คนเห็น
 * ซึ่งแปลว่าลิงก์ที่เราแจกไปดูเหมือนพังทั้งที่ทุกอย่างปกติดี
 *
 * ยอมรอแค่ 4 วินาที เกินนั้นถือว่าไม่ได้ข้อมูล แล้วไปแสดงหน้าสำรองแทน
 * (ดีกว่าปล่อยให้คนเจอหน้า error ของ Vercel ซึ่งกดต่อไม่ได้เลย)
 */
async function fetchWithTimeout(url, options, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

module.exports = async function handler(req, res) {
  const token = req.query?.token || (req.url || "").split("/").pop();
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  const siteOrigin = `https://${req.headers.host}`;
  const pageUrl = `${siteOrigin}/invite/${encodeURIComponent(token || "")}`;
  const appUrl = `${siteOrigin}/?invite=${encodeURIComponent(token || "")}`;

  let preview = null;
  let fetchError = false;

  if (supabaseUrl && supabaseAnonKey && token) {
    try {
      const r = await fetchWithTimeout(
        `${supabaseUrl}/rest/v1/rpc/get_invite_preview`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({ p_token: token }),
        },
        4000
      );
      if (r.ok) {
        const rows = await r.json();
        preview = Array.isArray(rows) ? rows[0] ?? null : null;
      } else {
        fetchError = true;
      }
    } catch {
      fetchError = true;
    }
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300");

  // ดึงข้อมูลคำท้าไม่ได้ (ช้า/ล่ม) — แต่ token ยังอยู่ใน URL ครบ ปุ่มเข้าแอป
  // จึงยังใช้ได้ตามปกติ ส่งหน้าที่กดต่อได้ไปให้ดีกว่าปล่อยให้เจอหน้า error
  // (ไม่ให้ CDN แคชไว้ เพราะรอบหน้าอาจดึงข้อมูลได้แล้ว)
  if (!preview && fetchError) {
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(`<!doctype html>
<html lang="th"><head><meta charset="utf-8" />
<title>คำท้าจากเพื่อน — Challenge Me</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Challenge Me" />
<meta property="og:title" content="🎯 มีคนท้าคุณ — Challenge Me" />
<meta property="og:image" content="${escapeHtml(`${siteOrigin}/api/og-cover?v=${OG_IMAGE_VERSION}`)}" /></head>
<body style="font-family:-apple-system,system-ui,sans-serif;text-align:center;padding:56px 24px;background:#fdf8f1;color:#222;">
<h1 style="font-size:22px;">มีคนท้าคุณอยู่ 🎯</h1>
<p style="color:#555;">เปิดแอปเพื่อดูรายละเอียดคำท้าได้เลย</p>
<a href="${escapeHtml(appUrl)}" style="display:block;max-width:360px;margin:28px auto 0;background:#d61f3f;color:#fff;text-decoration:none;font-weight:700;padding:14px;border-radius:8px;">🎯 รับคำท้า — เปิด Challenge Me</a>
</body></html>`);
    return;
  }

  if (!preview) {
    res.status(404).send(`<!doctype html>
<html lang="th"><head><meta charset="utf-8" />
<title>ไม่พบคำท้านี้ — Challenge Me</title>
<meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="font-family:sans-serif;text-align:center;padding:60px 20px;background:#fdf8f1;color:#222;">
<h1>ลิงก์คำท้านี้ไม่พร้อมใช้งานแล้ว</h1>
<p><a href="${escapeHtml(siteOrigin)}" style="color:#d61f3f;font-weight:700;">ไปที่ Challenge Me</a></p>
</body></html>`);
    return;
  }

  const title = escapeHtml(preview.title);
  const inviter = escapeHtml(preview.inviter_display_name);
  const goal = escapeHtml(preview.goal_description);
  const category = preview.category ? escapeHtml(preview.category) : null;
  const reward = preview.reward_text ? escapeHtml(preview.reward_text) : null;
  const ogImageUrl = `${siteOrigin}/api/og-cover?v=${OG_IMAGE_VERSION}`;

  // ทำ og:title / og:description ให้ดูน่าสนใจ + มีรายละเอียดครบ (หมวด/เป้าหมาย/
  // รางวัล) เพราะอันนี้คือสิ่งที่ขึ้นจริงตอนแชร์ลง Facebook/LINE ฯลฯ — ยิ่งมี
  // รายละเอียดเยอะและมี call-to-action ชัด ยิ่งดึงดูดให้คนกดเข้ามาดู
  //
  // หมายเหตุ (แก้บั๊ก): ห้ามใส่เครื่องหมายคำพูด " ในข้อความ og:title/og:description
  // ตรง ๆ — ตัว widget พรีวิวตอนสร้างโพสต์ของ Facebook (ก่อนกดโพสต์จริง) มี
  // บั๊กที่ทำให้ข้อความขาดหายไปทันทีที่เจอเครื่องหมาย " ตัวแรก (ตัดข้อความทั้งหมด
  // หลังจากนั้นทิ้งไปเลย) เคยลองแล้วเจอปัญหานี้จริง จึงเลี่ยงไม่ใช้เครื่องหมาย
  // คำพูดในข้อความเหล่านี้อีกเลย
  const ogTitle = `🎯 ${inviter} ท้าคุณ — ${title}`;
  const descParts = [];
  if (category) descParts.push(`📂 ${category}`);
  descParts.push(`🎯 เป้าหมาย: ${goal}`);
  if (reward) descParts.push(`🎁 รางวัล: ${reward}`);
  descParts.push(`มีดารุมะรอคุณมาเติมตาให้ครบอยู่ — ทำสำเร็จเมื่อไหร่ ต้นไม้ของคุณได้ใบไม้เพิ่ม 1 ใบ 🍃`);
  const ogDescription = descParts.join("  ·  ");

  res.status(200).send(`<!doctype html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${ogTitle} — Challenge Me</title>
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Challenge Me" />
  <meta property="og:title" content="${ogTitle}" />
  <meta property="og:description" content="${escapeHtml(ogDescription)}" />
  <meta property="og:url" content="${escapeHtml(pageUrl)}" />
  <meta property="og:image" content="${escapeHtml(ogImageUrl)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="Challenge Me — มีดารุมะรอคุณมาเติมตาให้ครบ" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${ogTitle}" />
  <meta name="twitter:description" content="${escapeHtml(ogDescription)}" />
  <meta name="twitter:image" content="${escapeHtml(ogImageUrl)}" />
  <style>
    body { font-family: -apple-system, system-ui, sans-serif; background: #fdf8f1; color: #222; margin: 0; }
    .card { max-width: 480px; margin: 48px auto; background: white; border-radius: 16px; overflow: hidden;
      box-shadow: 0 2px 16px rgba(0,0,0,0.08); text-align: center; }
    .cover { width: 100%; display: block; }
    .content { padding: 28px 24px 32px; }
    .badge { color: #d61f3f; font-weight: 700; font-size: 14px; }
    .category { display: inline-block; margin-top: 8px; background: #fdecef; color: #d61f3f; font-size: 12px;
      font-weight: 700; padding: 4px 10px; border-radius: 999px; }
    h1 { font-size: 22px; margin: 12px 0 8px; }
    p.goal { color: #555; font-size: 15px; }
    p.reward { color: #b45309; font-size: 14px; }
    a.cta { display: block; margin-top: 24px; background: #d61f3f; color: white; text-decoration: none;
      font-weight: 700; padding: 14px; border-radius: 8px; }
    a.skip { display: block; margin-top: 12px; color: #888; text-decoration: none; font-size: 13px; }
    p.leafnote { margin-top: 16px; color: #6b5a4e; font-size: 13px; background: #fdf3ee;
      border-radius: 8px; padding: 10px 12px; }
  </style>
</head>
<body>
  <div class="card">
    <img class="cover" src="${escapeHtml(ogImageUrl)}" alt="Challenge Me" />
    <div class="content">
      <div class="badge">🎯 คำท้าจาก ${inviter}</div>
      ${category ? `<div><span class="category">${category}</span></div>` : ""}
      <h1>${title}</h1>
      <p class="goal">${goal}</p>
      ${reward ? `<p class="reward">🎁 รางวัล: ${reward}</p>` : ""}
      <p class="leafnote">รับคำท้าแล้วจะได้ดารุมะของคุณเอง — เติมตาข้างแรกตอนให้คำมั่น เติมข้างที่สองตอนทำสำเร็จ แล้วต้นไม้ของคุณจะได้ใบไม้เพิ่ม 1 ใบ 🍃</p>
      <a class="cta" href="${escapeHtml(appUrl)}">🎯 รับคำท้า — เปิด Challenge Me</a>
      <a class="skip" href="${escapeHtml(siteOrigin)}">ไปที่หน้าแรกแทน</a>
    </div>
  </div>
</body>
</html>`);
};

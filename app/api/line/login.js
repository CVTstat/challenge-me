// เข้าสู่ระบบด้วย LINE — ฝั่งเซิร์ฟเวอร์ (Vercel Serverless Function)
//
// รับ ID token จากแอป → ตรวจกับเซิร์ฟเวอร์ของ LINE → ผูก/สร้างบัญชี Supabase
// → คืน token สำหรับแลกเป็น session
//
// ═══════════════════════════════════════════════════════════════════════════
// ความปลอดภัย — จุดที่ห้ามพลาดเด็ดขาด
//
// 1. ห้ามเชื่อ LINE user id ที่ส่งมาจากฝั่งแอปเป็นอันขาด ใครก็พิมพ์ id ของ
//    คนอื่นส่งมาได้ จึงต้องรับมาเป็น "ID token" ที่ LINE เซ็นไว้ แล้วเอาไป
//    ตรวจกับ API ของ LINE ทุกครั้ง (ขั้นตอนที่ 1 ด้านล่าง) — ตัวตนที่เชื่อได้
//    มาจากคำตอบของ LINE เท่านั้น
//
// 2. SUPABASE_SERVICE_ROLE_KEY อยู่ที่นี่ได้เพราะโค้ดนี้รันบนเซิร์ฟเวอร์
//    ห้ามใส่ในแอป (ตัวแปรที่ขึ้นต้นด้วย EXPO_PUBLIC_ จะถูกฝังลงในไฟล์ที่
//    ผู้ใช้โหลดไปทั้งหมด) คีย์นี้ข้าม RLS ได้ทุกตาราง หลุดแล้วคือจบ
// ═══════════════════════════════════════════════════════════════════════════

const LINE_VERIFY_URL = "https://api.line.me/oauth2/v2.1/verify";

// โดเมนสมมติสำหรับอีเมลของบัญชีที่สมัครผ่าน LINE
// (Supabase ต้องมีอีเมลเป็นตัวระบุบัญชี แต่ LINE ไม่ได้ให้อีเมลมาเสมอ —
//  ให้อีเมลก็ต่อเมื่อขอ scope email และผู้ใช้ยินยอม)
const LINE_EMAIL_DOMAIN = process.env.LINE_EMAIL_DOMAIN || "line.challenge-me.app";

function json(res, status, body) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.status(status).send(JSON.stringify(body));
}

async function supabaseAdmin(path, options = {}) {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const response = await fetch(`${url}${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }
  return { ok: response.ok, status: response.status, data: parsed, raw: text };
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, { error: "method not allowed" });
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const lineChannelId = process.env.LINE_LOGIN_CHANNEL_ID;

  if (!supabaseUrl || !serviceKey || !lineChannelId) {
    return json(res, 500, {
      error:
        "เซิร์ฟเวอร์ยังตั้งค่าไม่ครบ — ต้องมี EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY และ LINE_LOGIN_CHANNEL_ID",
    });
  }

  // รับ body ทั้งแบบที่ Vercel แปลงให้แล้วและแบบ string ดิบ
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  const idToken = body && body.id_token;
  if (!idToken) return json(res, 400, { error: "ไม่มี id_token" });

  // ── 1. ตรวจ ID token กับ LINE ──────────────────────────────────────────
  let lineProfile;
  try {
    const verifyRes = await fetch(LINE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ id_token: idToken, client_id: lineChannelId }).toString(),
    });
    lineProfile = await verifyRes.json();
    if (!verifyRes.ok || !lineProfile || !lineProfile.sub) {
      return json(res, 401, { error: "ยืนยันตัวตนกับ LINE ไม่สำเร็จ" });
    }
  } catch {
    return json(res, 502, { error: "ติดต่อเซิร์ฟเวอร์ LINE ไม่ได้" });
  }

  const lineUserId = lineProfile.sub;
  const displayName = (lineProfile.name || "").trim() || "เพื่อนใหม่";
  const pictureUrl = lineProfile.picture || null;
  // ใช้อีเมลจริงจาก LINE ถ้าได้มา ไม่งั้นสร้างอีเมลประจำตัวจาก LINE user id
  // (ต้องคงที่ เพราะใช้เป็นตัวจับคู่บัญชีเดิมทุกครั้งที่ล็อกอินซ้ำ)
  const email = lineProfile.email || `line_${lineUserId}@${LINE_EMAIL_DOMAIN}`;

  try {
    // ── 2. หาโปรไฟล์ที่ผูก LINE id นี้ไว้แล้วหรือยัง ─────────────────────
    const existing = await supabaseAdmin(
      `/rest/v1/profiles?select=id,display_name&line_user_id=eq.${encodeURIComponent(lineUserId)}&limit=1`
    );
    let userId = existing.ok && Array.isArray(existing.data) && existing.data[0] ? existing.data[0].id : null;

    // ── 3. ยังไม่เคยผูก → สร้างบัญชีใหม่ (หรือหาบัญชีเดิมจากอีเมล) ───────
    if (!userId) {
      const created = await supabaseAdmin("/auth/v1/admin/users", {
        method: "POST",
        body: JSON.stringify({
          email,
          email_confirm: true, // ไม่ต้องส่งอีเมลยืนยัน เพราะยืนยันตัวตนด้วย LINE แล้ว
          user_metadata: { display_name: displayName, line_user_id: lineUserId },
        }),
      });

      if (created.ok && created.data && created.data.id) {
        userId = created.data.id;
      } else {
        // มีบัญชีอีเมลนี้อยู่แล้ว (เช่นเคยล็อกอินด้วย LINE มาก่อนแต่ยังไม่ได้
        // ผูก หรือกดล็อกอินซ้อนกันสองแท็บ) — ไปหาบัญชีเดิมมาใช้แทน
        const found = await supabaseAdmin(
          `/auth/v1/admin/users?filter=${encodeURIComponent(email)}`
        );
        const list = found.data && (found.data.users || found.data);
        if (Array.isArray(list)) {
          const match = list.find((u) => u && u.email === email);
          if (match) userId = match.id;
        }
        if (!userId) {
          return json(res, 500, { error: "สร้างบัญชีไม่สำเร็จ" });
        }
      }
    }

    // ── 4. อัปเดตโปรไฟล์ให้ผูกกับ LINE ─────────────────────────────────
    // service role เขียน line_user_id ได้ (trigger กันเฉพาะการแก้จากฝั่งผู้ใช้)
    // ชื่อที่แสดง: เซ็ตให้เฉพาะตอนยังไม่มีชื่อจริง ๆ เพื่อไม่ให้ทับชื่อที่
    // ผู้ใช้ตั้งเองไว้ทุกครั้งที่ล็อกอินใหม่
    const profileNow = await supabaseAdmin(
      `/rest/v1/profiles?select=display_name,line_user_id&id=eq.${userId}&limit=1`
    );
    const current = profileNow.ok && Array.isArray(profileNow.data) ? profileNow.data[0] : null;
    const patch = { line_user_id: lineUserId, line_picture_url: pictureUrl };
    if (!current || !current.display_name || current.display_name === "สมาชิกใหม่") {
      patch.display_name = displayName;
    }

    await supabaseAdmin(`/rest/v1/profiles?id=eq.${userId}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(patch),
    });

    // ── 5. ออก token ให้แอปเอาไปแลกเป็น session ──────────────────────────
    const link = await supabaseAdmin("/auth/v1/admin/generate_link", {
      method: "POST",
      body: JSON.stringify({ type: "magiclink", email }),
    });

    const hashedToken =
      link.data &&
      (link.data.hashed_token ||
        (link.data.properties && link.data.properties.hashed_token));

    if (!link.ok || !hashedToken) {
      return json(res, 500, { error: "ออก token เข้าสู่ระบบไม่สำเร็จ" });
    }

    return json(res, 200, { token_hash: hashedToken, display_name: patch.display_name || (current && current.display_name) });
  } catch (e) {
    return json(res, 500, { error: "เกิดข้อผิดพลาดระหว่างเข้าสู่ระบบ" });
  }
};

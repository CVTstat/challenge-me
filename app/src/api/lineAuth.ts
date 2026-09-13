// เข้าสู่ระบบด้วย LINE (ฝั่งแอป)
//
// ขั้นตอน:
//   1. ขอ ID token จาก LIFF (LINE เป็นคนเซ็นให้ ปลอมไม่ได้)
//   2. ส่งไปให้ /api/line/login ของเราตรวจกับเซิร์ฟเวอร์ LINE อีกที
//   3. เซิร์ฟเวอร์คืน token_hash กลับมา แล้วเราเอาไปแลกเป็น session ของ Supabase
//
// ข้อสำคัญด้านความปลอดภัย: ฝั่งนี้ไม่มีทางรู้หรือส่ง service role key เลย
// ทุกอย่างที่ต้องใช้สิทธิ์สูงเกิดขึ้นบนเซิร์ฟเวอร์ทั้งหมด

import { supabase } from "@/lib/supabase";
import { getLineIdToken } from "@/lib/liff";
import { getWebBaseUrl } from "@/lib/config";

export interface LineSignInResult {
  ok: boolean;
  error: string | null;
  /** true = ยังไม่ได้ล็อกอิน LINE ต้องให้ผู้ใช้กดล็อกอินก่อน */
  needsLineLogin?: boolean;
}

export async function signInWithLine(): Promise<LineSignInResult> {
  const idToken = await getLineIdToken();
  if (!idToken) return { ok: false, error: null, needsLineLogin: true };

  let response: Response;
  try {
    response = await fetch(`${getWebBaseUrl()}/api/line/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_token: idToken }),
    });
  } catch {
    return { ok: false, error: "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ลองใหม่อีกครั้ง" };
  }

  const data = (await response.json().catch(() => ({}))) as { token_hash?: string; error?: string };
  if (!response.ok || !data.token_hash) {
    return { ok: false, error: data.error ?? "เข้าสู่ระบบด้วย LINE ไม่สำเร็จ" };
  }

  // แลก token ที่เซิร์ฟเวอร์ออกให้ เป็น session จริงของ Supabase
  const { error } = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: "email" });
  if (error) return { ok: false, error: error.message };

  return { ok: true, error: null };
}

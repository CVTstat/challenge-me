// เชื่อมแอปกับ LINE ผ่าน LIFF (LINE Front-end Framework)
//
// ทำไมต้องใช้ LIFF ไม่ใช่แค่เอา URL ไปแปะใน Rich Menu เฉย ๆ:
// การจะส่งข้อความแจ้งเตือนทาง LINE หาใครสักคนได้ ต้องรู้ LINE user id ของเขา
// ซึ่งจะได้มาก็ต่อเมื่อเปิดแอปแบบ LIFF เท่านั้น ถ้าแปะ URL ธรรมดาจะได้แค่
// "ทางเข้าแอป" แต่แจ้งเตือนรายคนไม่ได้เลย
//
// ความปลอดภัย: ฝั่งนี้ไม่เคยส่ง "user id" ไปให้เซิร์ฟเวอร์ตรง ๆ (ปลอมได้ง่าย)
// แต่ส่ง ID token ที่ LINE เซ็นมาให้ แล้วให้เซิร์ฟเวอร์ไปตรวจกับ LINE อีกที
// (ดู app/api/line/login.js)

import { Platform } from "react-native";

const LIFF_SDK_URL = "https://static.line-scdn.net/liff/edge/2/sdk.js";
const LIFF_ID = process.env.EXPO_PUBLIC_LIFF_ID ?? "";

// ไอดีของบัญชีทางการ (LINE OA) เช่น "@123abcde" — ใช้สร้างลิงก์ "แอดเพื่อน"
// ปลอดภัยที่จะขึ้นต้นด้วย EXPO_PUBLIC_ เพราะไอดีนี้เป็นข้อมูลสาธารณะอยู่แล้ว
// (ใครก็เห็นได้จากลิงก์แอดเพื่อนที่เราแจก) ไม่ใช่ความลับแบบ token หรือ secret
const LINE_OA_ID = process.env.EXPO_PUBLIC_LINE_OA_ID ?? "";

/** ตั้งค่า LIFF ไว้หรือยัง — ถ้ายัง ปุ่ม LINE จะถูกซ่อนไปเลย */
export function isLineConfigured(): boolean {
  return Platform.OS === "web" && LIFF_ID.trim().length > 0;
}

type LiffSdk = {
  init: (config: { liffId: string }) => Promise<void>;
  isLoggedIn: () => boolean;
  login: (options?: { redirectUri?: string }) => void;
  logout: () => void;
  getIDToken: () => string | null;
  isInClient: () => boolean;
  getFriendship?: () => Promise<{ friendFlag: boolean }>;
  shareTargetPicker?: (messages: unknown[]) => Promise<unknown>;
};

declare global {
  interface Window {
    liff?: LiffSdk;
  }
}

let initPromise: Promise<LiffSdk | null> | null = null;

function loadSdk(): Promise<LiffSdk | null> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") return resolve(null);
    if (window.liff) return resolve(window.liff);

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${LIFF_SDK_URL}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(window.liff ?? null));
      existing.addEventListener("error", () => resolve(null));
      return;
    }

    const script = document.createElement("script");
    script.src = LIFF_SDK_URL;
    script.async = true;
    script.onload = () => resolve(window.liff ?? null);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
}

/**
 * เตรียม LIFF ให้พร้อมใช้ (โหลด SDK + init) — เรียกซ้ำได้ ทำจริงแค่ครั้งเดียว
 * คืน null ถ้าใช้ไม่ได้ (ไม่ได้ตั้งค่า / ไม่ใช่เว็บ / โหลด SDK ไม่สำเร็จ)
 */
export function getLiff(): Promise<LiffSdk | null> {
  if (!isLineConfigured()) return Promise.resolve(null);
  if (!initPromise) {
    initPromise = (async () => {
      const sdk = await loadSdk();
      if (!sdk) return null;
      try {
        await sdk.init({ liffId: LIFF_ID });
        return sdk;
      } catch {
        // init พังได้ถ้า LIFF ID ผิดหรือโดเมนไม่ตรงกับที่ลงทะเบียนไว้
        return null;
      }
    })();
  }
  return initPromise;
}

/** อยู่บนมือถือไหม — ใช้ตัดสินว่าจะ "กระโดดเข้าแอป LINE" ได้หรือเปล่า */
function isMobileWeb(): boolean {
  if (Platform.OS !== "web" || typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
}

/** ดึง token คำท้าจาก URL ปัจจุบัน (รองรับทั้งแบบ path และแบบ query) */
function currentInviteToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const url = new URL(window.location.href);
    const fromQuery = url.searchParams.get("invite");
    if (fromQuery) return fromQuery;
    const match = url.pathname.match(/invite\/([A-Za-z0-9-]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/** เปิดอยู่ข้างในแอป LINE ไหม — ดูจาก User-Agent เพื่อให้ตอบได้ทันทีแบบไม่ต้องรอ */
function inLineAppSync(): boolean {
  if (Platform.OS !== "web" || typeof navigator === "undefined") return false;
  return /\bLine\//i.test(navigator.userAgent || "");
}

/**
 * ลิงก์ที่สั่งให้มือถือ "เปิดแอป LINE" แล้วโหลดหน้าเราข้างในนั้น
 *
 * ทำไมต้องมี: เวลาคนกดลิงก์จากในแอป Facebook แล้วกดปุ่มเข้าสู่ระบบด้วย LINE
 * วิธีปกติจะพาไปหน้า access.line.me ที่ต้องพิมพ์อีเมล+รหัสผ่าน LINE ซึ่งแทบ
 * ไม่มีใครจำได้ (คนส่วนใหญ่ล็อกอิน LINE ค้างไว้ในแอปมือถืออยู่แล้ว ไม่เคย
 * ต้องใช้รหัสผ่าน) สุดท้ายต้องกด "Log-in with LINE app" อีกต่อหนึ่งกว่าจะเข้าได้
 * ลิงก์นี้ข้ามทั้งหมดนั้นไปเลย เพราะในแอป LINE ผู้ใช้ล็อกอินอยู่แล้ว
 *
 * *** สำคัญมาก: ต้องเอาไปใส่เป็น href ของลิงก์จริง ห้ามสั่ง redirect ด้วย
 * JavaScript ***
 * เบราว์เซอร์บนมือถือยอมให้เว็บเปิดแอปอื่นได้เฉพาะตอนที่ผู้ใช้กด "ลิงก์จริง"
 * เท่านั้น ถ้าเขียนเป็น onPress แล้วสั่ง window.location เอง เบราว์เซอร์จะ
 * บล็อกทิ้งเงียบ ๆ ไม่มี error ไม่มีอะไรเกิดขึ้น (อาการ: กดปุ่มแล้วหมุนติ้ว ๆ
 * แล้วกลับมาหน้าเดิม) — เคยพลาดมาแล้วทั้งแบบมี await คั่นและแบบสั่งตรง ๆ
 *
 * คืน null เมื่อไม่ควรใช้ทางนี้ (เปิดบนคอม / อยู่ในแอป LINE อยู่แล้ว / ยังไม่ตั้งค่า)
 */
export function getLineAppUrl(): string | null {
  if (!isLineConfigured() || typeof window === "undefined") return null;
  // บนคอมไม่มีแอป LINE ให้เปิด — ใช้วิธีล็อกอินผ่านเว็บตามเดิมดีกว่า
  if (!isMobileWeb()) return null;
  // อยู่ใน LINE อยู่แล้ว ไม่ต้องกระโดดไปไหน
  if (inLineAppSync()) return null;

  const token = currentInviteToken();
  return `https://liff.line.me/${LIFF_ID}${token ? `?invite=${encodeURIComponent(token)}` : ""}`;
}

/** เปิดหน้าให้ผู้ใช้ล็อกอิน LINE (จะ redirect ออกจากหน้าปัจจุบัน) */
export async function startLineLogin() {
  const liff = await getLiff();
  if (!liff) return false;
  if (!liff.isLoggedIn()) {
    // ระบุ redirectUri ให้ชัด เพื่อให้กลับมาที่ "หน้าเดิม" พร้อม token คำท้า
    // ที่ติดมาใน URL (เช่น /invite/abc123) ถ้าปล่อยว่างแล้วกลับมาหน้าแรกเฉย ๆ
    // คนที่กดลิงก์คำท้ามาจะเสียคำท้าไปกลางทางโดยไม่รู้ตัว
    const redirectUri =
      typeof window !== "undefined" && window.location ? window.location.href : undefined;
    liff.login(redirectUri ? { redirectUri } : undefined);
    return true;
  }
  return true;
}

/**
 * ดึง ID token ของผู้ใช้ที่ล็อกอิน LINE อยู่ (เอาไปให้เซิร์ฟเวอร์ตรวจ)
 * คืน null ถ้ายังไม่ได้ล็อกอิน
 */
export async function getLineIdToken(): Promise<string | null> {
  const liff = await getLiff();
  if (!liff || !liff.isLoggedIn()) return null;
  return liff.getIDToken();
}

/** เปิดอยู่ข้างในแอป LINE หรือเปล่า (เข้ามาจาก Rich Menu) */
export async function isInsideLineApp(): Promise<boolean> {
  const liff = await getLiff();
  return !!liff && liff.isInClient();
}

/**
 * แชร์ผ่านตัวเลือกเพื่อนของ LINE — ใช้ได้เฉพาะตอนเปิดในแอป LINE
 * ดีกว่าปุ่มแชร์ของเบราว์เซอร์ตรงที่เลือกส่งให้เพื่อนใน LINE ได้ตรง ๆ
 * คืน false ถ้าใช้ไม่ได้ (ให้ผู้เรียกไปใช้วิธีแชร์ปกติแทน)
 */
export async function shareViaLine(text: string): Promise<boolean> {
  const liff = await getLiff();
  if (!liff || !liff.isInClient() || !liff.shareTargetPicker) return false;
  try {
    await liff.shareTargetPicker([{ type: "text", text }]);
    return true;
  } catch {
    return false;
  }
}

/** ลิงก์แอดเพื่อนกับ LINE OA ของเรา — คืน null ถ้ายังไม่ได้ตั้งค่าไอดี OA */
export function getAddFriendUrl(): string | null {
  const id = LINE_OA_ID.trim();
  if (!id) return null;
  return `https://line.me/R/ti/p/${encodeURIComponent(id.startsWith("@") ? id : `@${id}`)}`;
}

/**
 * ผู้ใช้แอดเพื่อนกับ LINE OA ของเราหรือยัง
 *
 * ทำไมสำคัญ: ถ้าเขาไม่ได้เป็นเพื่อนกับ OA เราจะส่งข้อความหาเขาไม่ได้เลย
 * แปลว่าพอเขาปิดแอปไป ก็ไม่มีทางเรียกกลับมาได้อีก — คนที่ตั้งใจจะทำอะไรสักอย่าง
 * แล้วไม่มีใครเตือน ส่วนใหญ่ก็หายไปเงียบ ๆ
 *
 * คืนค่า:
 *   true  = เป็นเพื่อนแล้ว
 *   false = ยังไม่ได้แอด
 *   null  = ตอบไม่ได้ (ไม่ได้เปิดผ่าน LINE / ยังไม่ล็อกอิน / LIFF ยังไม่ได้ผูกกับ OA)
 *           กรณีนี้ห้ามกั้นผู้ใช้ ไม่งั้นคนที่เข้าด้วยอีเมลปกติจะเข้าแอปไม่ได้เลย
 */
export async function getLineFriendship(): Promise<boolean | null> {
  const liff = await getLiff();
  if (!liff || !liff.getFriendship || !liff.isLoggedIn()) return null;
  try {
    const result = await liff.getFriendship();
    return !!result?.friendFlag;
  } catch {
    // เกิดได้ถ้า LIFF channel ยังไม่ได้ผูกกับ LINE OA ในหน้า LINE Developers
    return null;
  }
}

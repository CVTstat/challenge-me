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

/** เปิดหน้าให้ผู้ใช้ล็อกอิน LINE (จะ redirect ออกจากหน้าปัจจุบัน) */
export async function startLineLogin() {
  const liff = await getLiff();
  if (!liff) return false;
  if (!liff.isLoggedIn()) {
    liff.login();
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

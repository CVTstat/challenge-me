import { Platform } from "react-native";

/**
 * URL ฐานของเว็บแอปที่ deploy จริง (เช่น https://challenge-me.vercel.app)
 * ใช้ประกอบลิงก์ "ท้าเพื่อน" ที่แชร์ออกไปนอกแอปได้ (Facebook/Messenger/ฯลฯ)
 *
 * - บนเว็บ: ใช้ origin ปัจจุบันเสมอ (ไม่ต้องตั้งค่าอะไรเพิ่ม)
 * - บนมือถือ (Expo Go / build จริง): ต้องตั้ง EXPO_PUBLIC_WEB_BASE_URL ใน .env
 *   ให้ชี้ไปที่โดเมนเว็บที่ deploy ไว้ ไม่งั้นลิงก์ที่สร้างจะใช้ค่า placeholder
 */
export function getWebBaseUrl(): string {
  if (Platform.OS === "web" && typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  const configured = process.env.EXPO_PUBLIC_WEB_BASE_URL;
  return configured && configured.trim() ? configured.trim() : "https://your-app.vercel.app";
}

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Platform, Linking } from "react-native";

interface PendingInviteContextValue {
  token: string | null;
  clear: () => void;
}

const PendingInviteContext = createContext<PendingInviteContextValue>({ token: null, clear: () => {} });

// รองรับ 2 รูปแบบ:
//  - เว็บ: https://<domain>/invite/<token>  (แปลง path เป็น query ?invite=
//    ผ่าน rewrite ฝั่ง Vercel — ดู vercel.json) หรือ ?invite=<token> ตรง ๆ
//  - มือถือ (deep link): challengeme://invite/<token>
//  - เปิดผ่านแอป LINE (LIFF): LINE อาจยัด query เดิมไว้ในพารามิเตอร์ชื่อ
//    liff.state เช่น ?liff.state=%3Finvite%3D<token> แทนที่จะส่ง ?invite= มาตรง ๆ
//    ถ้าไม่แกะตรงนี้ คนที่กดลิงก์คำท้าจาก Facebook แล้วเด้งเข้าแอป LINE
//    จะเข้ามาถึงแอปแต่คำท้าหายไประหว่างทาง
function extractTokenFromUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const asUrl = new URL(url, Platform.OS === "web" && typeof window !== "undefined" ? window.location.origin : "challengeme://app");

    const fromQuery = asUrl.searchParams.get("invite");
    if (fromQuery) return fromQuery;

    const liffState = asUrl.searchParams.get("liff.state");
    if (liffState) {
      // liff.state เก็บ "ส่วนท้ายของ URL เดิม" ไว้ เช่น "?invite=abc" หรือ "/invite/abc"
      const fromState = extractTokenFromUrl(`challengeme://app${liffState.startsWith("?") ? "/" : ""}${liffState}`);
      if (fromState) return fromState;
    }

    // ต้องรวม host เข้ามาด้วย เพราะ deep link แบบ challengeme://invite/<token>
    // จะถูกแยกเป็น host="invite" กับ pathname="/<token>" ถ้าดูแค่ pathname จะหาไม่เจอ
    const match = `${asUrl.host}${asUrl.pathname}`.match(/invite\/([A-Za-z0-9-]+)/);
    return match ? match[1] : null;
  } catch {
    const match = url.match(/invite\/([A-Za-z0-9-]+)/);
    return match ? match[1] : null;
  }
}

export function PendingInviteProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") {
        setToken(extractTokenFromUrl(window.location.href));
      }
      return;
    }

    Linking.getInitialURL().then((url) => setToken((prev) => prev ?? extractTokenFromUrl(url)));
    const sub = Linking.addEventListener("url", ({ url }) => setToken(extractTokenFromUrl(url)));
    return () => sub.remove();
  }, []);

  const clear = useCallback(() => {
    setToken(null);
    if (Platform.OS === "web" && typeof window !== "undefined" && window.history?.replaceState) {
      try {
        const u = new URL(window.location.href);
        u.searchParams.delete("invite");
        window.history.replaceState({}, "", u.pathname === "/" ? "/" : u.toString());
      } catch {
        // เพิกเฉยได้ — ไม่ใช่ error ที่กระทบการใช้งานหลัก
      }
    }
  }, []);

  return <PendingInviteContext.Provider value={{ token, clear }}>{children}</PendingInviteContext.Provider>;
}

export function usePendingInvite() {
  return useContext(PendingInviteContext);
}

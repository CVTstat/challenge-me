import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      async signInWithEmail(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error?.message ?? null };
      },
      async signUpWithEmail(email, password, displayName) {
        // Flow 1 (USER-FLOWS.md): สมัครสำเร็จ -> สร้าง profiles row ทันที
        // (FR1.1–FR1.2 ใน FEATURE-REQUIREMENTS.md)
        //
        // หมายเหตุ: ตัว trigger public.handle_new_user() (migration 0005) ที่ฝั่ง
        // DB จะสร้างแถวใน profiles ให้อัตโนมัติอยู่แล้วทุกครั้งที่มี user ใหม่ใน
        // auth.users — ไม่ว่าจะเปิด/ปิด "Confirm email" ก็ตาม (ทำงานที่ระดับ DB
        // ไม่ต้องพึ่ง session ของฝั่ง client เลย) ที่ยัง insert เองซ้ำด้านล่างนี้
        // เป็นแค่ best-effort เผื่อโปรเจกต์ยังไม่ได้รัน migration 0005 — ถ้า insert
        // ซ้ำ/ไม่ผ่านเพราะยังไม่มี session (ต้องยืนยันอีเมลก่อน) ก็ไม่ถือเป็น error
        // block การสมัคร เพราะ trigger จัดการให้แล้วอยู่ดี
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName } },
        });
        if (error) return { error: error.message };
        const userId = data.user?.id;
        if (userId) {
          await supabase.from("profiles").insert({ id: userId, display_name: displayName });
        }
        return { error: null };
      },
      async signOut() {
        await supabase.auth.signOut();
      },
    }),
    [session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth ต้องใช้ภายใน <AuthProvider>");
  return ctx;
}

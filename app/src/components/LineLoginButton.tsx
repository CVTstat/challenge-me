import React, { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

import { showAlert } from "@/lib/alert";
import { getLineAppUrl, isLineConfigured, startLineLogin } from "@/lib/liff";
import { signInWithLine } from "@/api/lineAuth";
import { colors, font, radius, shadow, spacing } from "@/theme";

/**
 * ปุ่ม "เข้าสู่ระบบด้วย LINE" แบบใช้ซ้ำได้
 *
 * ทำไมต้องแยกออกมาเป็นคอมโพเนนต์: ตอนแรกปุ่มนี้อยู่แต่ในหน้า Login อย่างเดียว
 * พอมีคนกดลิงก์คำท้าที่แชร์ไป เขาจะถูกพาไปหน้า "สมัครสมาชิก" ซึ่งไม่มีปุ่มนี้
 * เลยเห็นแต่ช่องอีเมล/รหัสผ่าน — คนที่เพิ่งรู้จักแอปครั้งแรกเจอแบบนี้ส่วนใหญ่
 * จะปิดทิ้ง มีปุ่มเดียวที่ใช้ได้ทุกหน้าจึงตัดปัญหานี้ทิ้งไปทั้งชุด
 *
 * ปุ่มนี้มีสองร่าง:
 *   • บนมือถือ → เป็น "ลิงก์จริง" (แท็ก a) ที่ชี้ไป liff.line.me เพื่อเปิดแอป LINE
 *   • บนคอม / อยู่ในแอป LINE อยู่แล้ว → เป็นปุ่มธรรมดาที่ล็อกอินผ่านเว็บ
 * เหตุผลของร่างแรกอยู่ในคอมเมนต์ของ getLineAppUrl() — สรุปสั้น ๆ คือเบราว์เซอร์
 * มือถือเปิดแอปอื่นให้เฉพาะตอนกดลิงก์จริงเท่านั้น สั่งด้วย JavaScript ไม่ได้
 */

/** อยู่ในเบราว์เซอร์ที่ฝังมาในแอปอื่น (Facebook / IG) หรือเปล่า */
function inEmbeddedBrowser(): boolean {
  if (Platform.OS !== "web" || typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/\bLine\//i.test(ua)) return false; // ในแอป LINE เองไม่มีปัญหา
  return /FBAN|FBAV|FB_IAB|Instagram|Messenger/i.test(ua);
}

type Props = {
  label?: string;
  /** ลองเข้าสู่ระบบให้เงียบ ๆ ตอนเปิดหน้า (คนที่มาจาก Rich Menu จะเข้าได้เลย) */
  autoTry?: boolean;
  style?: StyleProp<ViewStyle>;
};

export default function LineLoginButton({ label = "เข้าสู่ระบบด้วย LINE", autoTry = true, style }: Props) {
  const available = isLineConfigured();
  const [busy, setBusy] = useState(false);

  async function attempt(silent: boolean) {
    if (!available) return;
    setBusy(true);
    const result = await signInWithLine();
    setBusy(false);

    if (result.ok) return;
    if (result.needsLineLogin) {
      // ยังไม่ได้ล็อกอิน LINE — พาไปหน้าล็อกอินผ่านเว็บ
      // (ทางมือถือไม่มาถึงตรงนี้ เพราะปุ่มเป็นลิงก์ไปแอป LINE ตั้งแต่แรกแล้ว)
      // ตอนลองเงียบ ๆ ห้าม redirect ไม่งั้นคนที่อยากใช้อีเมลจะโดนลากไปด้วย
      if (!silent) await startLineLogin();
      return;
    }
    if (result.error && !silent) showAlert("เข้าสู่ระบบด้วย LINE ไม่สำเร็จ", result.error);
  }

  useEffect(() => {
    if (available && autoTry) attempt(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [available, autoTry]);

  if (!available) return null;

  // ในแอป Facebook การเปิดแอปอื่นจะมีกล่องถามยืนยันก่อนเสมอ
  // บอกไว้ล่วงหน้าว่ากล่องนี้ปกติ ไม่ใช่ error — ไม่งั้นหลายคนจะกด Cancel
  const hint = inEmbeddedBrowser() ? (
    <Text style={styles.hint}>
      ถ้ามีกล่องถามว่าจะเปิดแอปข้างนอกไหม ให้กด &quot;Open&quot; เพื่อเข้าผ่านแอป LINE
    </Text>
  ) : null;

  const lineAppUrl = getLineAppUrl();

  if (lineAppUrl) {
    // react-native-web แปลง View ที่มี href ให้เป็นแท็ก <a> จริง ๆ
    // (RN ฝั่ง native ไม่รู้จัก prop นี้ จึงต้อง cast — และเส้นทางนี้เป็นของเว็บเท่านั้น)
    const linkProps = { href: lineAppUrl } as unknown as Record<string, unknown>;
    return (
      <View style={style}>
        <View {...linkProps} style={[styles.button, styles.link]}>
          <Text style={styles.buttonText}>{label}</Text>
        </View>
        {hint}
      </View>
    );
  }

  return (
    <View style={style}>
      <Pressable
        style={({ pressed }) => [styles.button, pressed && { opacity: 0.9 }]}
        onPress={() => attempt(false)}
        disabled={busy}
      >
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{label}</Text>}
      </Pressable>
      {hint}
    </View>
  );
}

export function LineOrDivider() {
  if (!isLineConfigured()) return null;
  return (
    <View style={styles.dividerRow}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerText}>หรือใช้อีเมล</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

const styles = StyleSheet.create({
  // #06C755 คือสีเขียวประจำแบรนด์ของ LINE — ใช้สีนี้เพื่อให้คนจำปุ่มได้ทันที
  button: {
    backgroundColor: "#06C755",
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    ...shadow.card,
  },
  // ตอนเป็นแท็ก <a> เบราว์เซอร์จะขีดเส้นใต้และใส่สีลิงก์ให้เอง ต้องล้างทิ้ง
  link: { textDecorationLine: "none" },
  buttonText: { color: "#ffffff", fontWeight: "700", fontSize: font.body },
  hint: { marginTop: spacing.xs, fontSize: font.tiny, color: colors.textMuted, textAlign: "center", lineHeight: 16 },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginVertical: spacing.xs },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontSize: font.tiny, color: colors.textFaint },
});

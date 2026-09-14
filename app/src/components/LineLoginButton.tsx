import React, { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

import { showAlert } from "@/lib/alert";
import { isLineConfigured, jumpToLineApp, startLineLogin } from "@/lib/liff";
import { signInWithLine } from "@/api/lineAuth";
import { colors, font, radius, shadow, spacing } from "@/theme";

/**
 * ปุ่ม "เข้าสู่ระบบด้วย LINE" แบบใช้ซ้ำได้
 *
 * ทำไมต้องแยกออกมาเป็นคอมโพเนนต์: ตอนแรกปุ่มนี้อยู่แต่ในหน้า Login อย่างเดียว
 * พอมีคนกดลิงก์คำท้าที่แชร์ไป เขาจะถูกพาไปหน้า "สมัครสมาชิก" ซึ่งไม่มีปุ่มนี้
 * เลยเห็นแต่ช่องอีเมล/รหัสผ่าน — คนที่เพิ่งรู้จักแอปครั้งแรกเจอแบบนี้ส่วนใหญ่
 * จะปิดทิ้ง มีปุ่มเดียวที่ใช้ได้ทุกหน้าจึงตัดปัญหานี้ทิ้งไปทั้งชุด
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
      // (ทางมือถือจัดการไปแล้วตั้งแต่ handlePress ซึ่งกระโดดเข้าแอป LINE เลย
      //  มาถึงตรงนี้คือเปิดบนคอม หรือกระโดดไม่ได้)
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

  /**
   * จังหวะที่นิ้วแตะปุ่ม
   *
   * บนมือถือต้องสั่งเปิดแอป LINE "เดี๋ยวนั้นเลย" ห้ามมี await มาคั่นก่อน
   * เพราะเบราว์เซอร์อนุญาตให้เปิดแอปอื่นเฉพาะตอนที่ผู้ใช้เพิ่งกดเท่านั้น
   * (ดูคำอธิบายเต็มที่ jumpToLineApp ใน lib/liff.ts)
   */
  function handlePress() {
    if (jumpToLineApp()) return;
    attempt(false);
  }

  if (!available) return null;

  return (
    <View style={style}>
      <Pressable
        style={({ pressed }) => [styles.button, pressed && { opacity: 0.9 }]}
        onPress={handlePress}
        disabled={busy}
      >
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{label}</Text>}
      </Pressable>

      {/* ในแอป Facebook การเปิดแอปอื่นจะมีกล่องถามยืนยันก่อนเสมอ (iOS บังคับ)
          บอกไว้ล่วงหน้าว่ากล่องนี้ปกติ ไม่ใช่ error — ไม่งั้นหลายคนจะกด Cancel */}
      {inEmbeddedBrowser() && (
        <Text style={styles.hint}>
          ถ้ามีกล่องถามว่าจะเปิดแอปข้างนอกไหม ให้กด &quot;Open&quot; เพื่อเข้าผ่านแอป LINE
        </Text>
      )}
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
  buttonText: { color: "#ffffff", fontWeight: "700", fontSize: font.body },
  hint: { marginTop: spacing.xs, fontSize: font.tiny, color: colors.textMuted, textAlign: "center", lineHeight: 16 },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginVertical: spacing.xs },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontSize: font.tiny, color: colors.textFaint },
});

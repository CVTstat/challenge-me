import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { showAlert } from "@/lib/alert";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "@/navigation/RootNavigator";
import { useAuth } from "@/providers/AuthProvider";
import DarumaCanvas from "@/components/DarumaCanvas";
import { OutlineButton, PrimaryButton } from "@/components/ui";
import { isLineConfigured, startLineLogin } from "@/lib/liff";
import { signInWithLine } from "@/api/lineAuth";
import { colors, font, radius, shadow, spacing } from "@/theme";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

// Flow 1 (USER-FLOWS.md §1) — Register / Login
export default function LoginScreen({ navigation }: Props) {
  const { signInWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lineBusy, setLineBusy] = useState(false);
  const lineAvailable = isLineConfigured();

  async function handleLogin() {
    setSubmitting(true);
    const { error } = await signInWithEmail(email.trim(), password);
    setSubmitting(false);
    if (error) showAlert("เข้าสู่ระบบไม่สำเร็จ", error);
  }

  // เข้าสู่ระบบด้วย LINE
  //
  // มีสองจังหวะที่เรียกเข้ามา:
  //   • เปิดแอปจาก Rich Menu ของ LINE → ล็อกอิน LINE อยู่แล้ว เข้าได้เลย
  //     ไม่ต้องกดอะไร (useEffect ด้านล่างเป็นคนเรียก)
  //   • เปิดจากเบราว์เซอร์ปกติแล้วกดปุ่ม → พาไปหน้าล็อกอินของ LINE ก่อน
  //     พอกลับมา useEffect จะทำงานต่อให้เอง
  async function handleLineLogin(silent = false) {
    if (!lineAvailable) return;
    setLineBusy(true);
    const result = await signInWithLine();
    setLineBusy(false);

    if (result.ok) return;
    if (result.needsLineLogin) {
      if (!silent) await startLineLogin();
      return;
    }
    if (result.error && !silent) showAlert("เข้าสู่ระบบด้วย LINE ไม่สำเร็จ", result.error);
  }

  useEffect(() => {
    // เงียบ ๆ ไว้ก่อน — ถ้ายังไม่ได้ล็อกอิน LINE ก็ไม่ต้องเด้งอะไรรบกวน
    // ให้ผู้ใช้เลือกเองว่าจะใช้อีเมลหรือ LINE
    if (lineAvailable) handleLineLogin(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineAvailable]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      {/* โลโก้ + ชื่อแบรนด์ + สโลแกน */}
      <View style={styles.logoBadge}>
        <Text style={styles.logoGlyph}>🌱</Text>
      </View>
      <Text style={styles.brand}>Challenge Me</Text>
      <Text style={styles.tagline}>เล็ก ๆ ทุกวัน เปลี่ยนคุณได้</Text>

      {/* มาสคอตดารุมะ — ยังไม่มีตาสักข้าง เพราะการเดินทางเพิ่งจะเริ่ม */}
      <View style={styles.mascot}>
        <DarumaCanvas eyes={0} width={128} />
      </View>

      <Text style={styles.headline}>เปลี่ยนสิ่งที่อยากทำ{"\n"}ให้กลายเป็นสิ่งที่ทำสำเร็จ</Text>

      <View style={styles.form}>
        {/* เข้าด้วย LINE — ทางหลักของช่วงทดลอง เพราะไม่ต้องจำรหัสผ่าน
            และทำให้ส่งการแจ้งเตือนเข้า LINE ได้ */}
        {lineAvailable && (
          <>
            <Pressable
              style={({ pressed }) => [styles.lineButton, pressed && { opacity: 0.9 }]}
              onPress={() => handleLineLogin(false)}
              disabled={lineBusy}
            >
              {lineBusy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.lineButtonText}>เข้าสู่ระบบด้วย LINE</Text>
              )}
            </Pressable>
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>หรือใช้อีเมล</Text>
              <View style={styles.dividerLine} />
            </View>
          </>
        )}

        <TextInput
          style={styles.input}
          placeholder="อีเมล"
          placeholderTextColor={colors.textFaint}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="รหัสผ่าน"
          placeholderTextColor={colors.textFaint}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <PrimaryButton
          label={submitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          onPress={handleLogin}
          disabled={submitting}
          style={styles.loginButton}
        />
        <OutlineButton label="สมัครสมาชิก" onPress={() => navigation.navigate("Register")} />
      </View>

      <Pressable onPress={() => navigation.navigate("Register")}>
        <Text style={styles.footnote}>เล็ก ๆ ทุกวัน เปลี่ยนคุณได้</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  container: { flexGrow: 1, justifyContent: "center", alignItems: "center", padding: spacing.xl, paddingVertical: 40 },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    ...shadow.card,
  },
  logoGlyph: { fontSize: 32 },
  brand: { fontSize: 28, fontWeight: "800", color: colors.primaryDark, marginTop: spacing.md },
  tagline: { fontSize: font.small, color: colors.textMuted, marginTop: 2 },
  mascot: { marginTop: spacing.lg, marginBottom: spacing.sm },
  headline: {
    fontSize: font.h3,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
    lineHeight: 26,
    marginBottom: spacing.xl,
  },
  form: { alignSelf: "stretch", gap: spacing.md, maxWidth: 420, width: "100%", alignItems: "stretch" },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 14,
    fontSize: font.body,
    color: colors.text,
  },
  loginButton: { marginTop: spacing.xs },
  // #06C755 คือสีเขียวประจำแบรนด์ของ LINE — ใช้สีนี้เพื่อให้คนจำปุ่มได้ทันที
  lineButton: {
    backgroundColor: "#06C755",
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    ...shadow.card,
  },
  lineButtonText: { color: "#ffffff", fontWeight: "700", fontSize: font.body },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginVertical: spacing.xs },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontSize: font.tiny, color: colors.textFaint },
  footnote: { marginTop: spacing.xl, fontSize: font.tiny, color: colors.textFaint },
});

import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from "react-native";
import { showAlert } from "@/lib/alert";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "@/navigation/RootNavigator";
import { useAuth } from "@/providers/AuthProvider";
import DarumaCanvas from "@/components/DarumaCanvas";
import { OutlineButton, PrimaryButton } from "@/components/ui";
import LineLoginButton, { LineOrDivider } from "@/components/LineLoginButton";
import { colors, font, radius, shadow, spacing } from "@/theme";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

// Flow 1 (USER-FLOWS.md §1) — Register / Login
export default function LoginScreen({ navigation }: Props) {
  const { signInWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleLogin() {
    setSubmitting(true);
    const { error } = await signInWithEmail(email.trim(), password);
    setSubmitting(false);
    if (error) showAlert("เข้าสู่ระบบไม่สำเร็จ", error);
  }

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
        <LineLoginButton />
        <LineOrDivider />

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
  // ห้ามใส่ alignSelf: "stretch" ตรงนี้ — มันจะไปทับ alignItems: "center" ของ
  // กล่องแม่ ทำให้ฟอร์มถูกดันไปชิดขอบซ้ายเวลาเปิดบนจอกว้าง (ส่วนหัวอยู่กลาง
  // แต่ฟอร์มไปอยู่ซ้าย) ปล่อยให้ alignSelf เป็นค่าเริ่มต้นแล้วใช้ width + maxWidth
  // ฟอร์มจะกว้างเต็มที่บนมือถือ และอยู่กึ่งกลางเสมอบนจอใหญ่
  form: { gap: spacing.md, maxWidth: 420, width: "100%" },
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
  footnote: { marginTop: spacing.xl, fontSize: font.tiny, color: colors.textFaint },
});

import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from "react-native";
import { showAlert } from "@/lib/alert";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "@/navigation/RootNavigator";
import { useAuth } from "@/providers/AuthProvider";
import DarumaCanvas from "@/components/DarumaCanvas";
import { PrimaryButton } from "@/components/ui";
import { colors, font, radius, spacing } from "@/theme";

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

// Flow 1 (USER-FLOWS.md §1) — Register -> Basic Profile Setup
// (Expertise & Skills Setup แบบเต็ม อยู่ใน Me > Profile ทีหลัง ตาม Flow ที่ระบุว่าข้ามได้)
export default function RegisterScreen({ navigation }: Props) {
  const { signUpWithEmail } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleRegister() {
    if (!displayName.trim()) {
      showAlert("กรอกไม่ครบ", "ใส่ชื่อที่แสดงก่อนนะ");
      return;
    }
    setSubmitting(true);
    const { error } = await signUpWithEmail(email.trim(), password, displayName.trim());
    setSubmitting(false);
    if (error) {
      showAlert("สมัครไม่สำเร็จ", error);
    } else {
      showAlert("สำเร็จ", "ยืนยันอีเมล (ถ้าโปรเจกต์เปิด email confirmation) แล้วลองเข้าสู่ระบบได้เลย");
      navigation.navigate("Login");
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.mascot}>
        <DarumaCanvas eyes={0} width={96} />
      </View>
      <Text style={styles.title}>สร้างบัญชี Challenge Me</Text>
      <Text style={styles.subtitle}>ดารุมะของคุณรออยู่ — อีกไม่กี่ขั้นก็เริ่มได้เลย</Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="ชื่อที่แสดง"
          placeholderTextColor={colors.textFaint}
          value={displayName}
          onChangeText={setDisplayName}
        />
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
          placeholder="รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)"
          placeholderTextColor={colors.textFaint}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <PrimaryButton
          label={submitting ? "กำลังสมัคร..." : "สมัครสมาชิก"}
          onPress={handleRegister}
          disabled={submitting}
          style={{ marginTop: spacing.xs }}
        />
      </View>

      <Pressable onPress={() => navigation.navigate("Login")} hitSlop={8}>
        <Text style={styles.link}>มีบัญชีอยู่แล้ว? เข้าสู่ระบบ</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  container: { flexGrow: 1, justifyContent: "center", alignItems: "center", padding: spacing.xl, paddingVertical: 40 },
  mascot: { marginBottom: spacing.md },
  title: { fontSize: font.h2, fontWeight: "800", color: colors.text, textAlign: "center" },
  subtitle: { fontSize: font.small, color: colors.textMuted, marginTop: 4, marginBottom: spacing.xl },
  // เหตุผลเดียวกับหน้า Login — ห้ามใส่ alignSelf: "stretch" ไม่งั้นฟอร์มจะ
  // ไปชิดขอบซ้ายบนจอกว้าง
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
  link: { marginTop: spacing.xl, color: colors.primaryDark, fontWeight: "600", fontSize: font.small },
});

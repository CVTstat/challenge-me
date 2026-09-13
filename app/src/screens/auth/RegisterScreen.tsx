import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { showAlert } from "@/lib/alert";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "@/navigation/RootNavigator";
import { useAuth } from "@/providers/AuthProvider";

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
    <View style={styles.container}>
      <Text style={styles.title}>สร้างบัญชี Challenge Me</Text>

      <TextInput style={styles.input} placeholder="ชื่อที่แสดง" value={displayName} onChangeText={setDisplayName} />
      <TextInput
        style={styles.input}
        placeholder="อีเมล"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Pressable style={styles.primaryButton} onPress={handleRegister} disabled={submitting}>
        <Text style={styles.primaryButtonText}>{submitting ? "กำลังสมัคร..." : "สมัครสมาชิก"}</Text>
      </Pressable>

      <Pressable onPress={() => navigation.navigate("Login")}>
        <Text style={styles.link}>มีบัญชีอยู่แล้ว? เข้าสู่ระบบ</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  title: { fontSize: 24, fontWeight: "700", textAlign: "center", marginBottom: 16 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12, fontSize: 16 },
  primaryButton: { backgroundColor: "#e11d48", borderRadius: 8, padding: 14, marginTop: 8 },
  primaryButtonText: { color: "white", textAlign: "center", fontWeight: "600", fontSize: 16 },
  link: { textAlign: "center", marginTop: 16, color: "#e11d48" },
});

import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { showAlert } from "@/lib/alert";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "@/navigation/RootNavigator";
import { useAuth } from "@/providers/AuthProvider";

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
    <View style={styles.container}>
      <Text style={styles.title}>🔥 Challenge Me</Text>
      <Text style={styles.subtitle}>เปลี่ยนสิ่งที่อยากทำ ให้กลายเป็นสิ่งที่ทำสำเร็จ</Text>

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
        placeholder="รหัสผ่าน"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Pressable style={styles.primaryButton} onPress={handleLogin} disabled={submitting}>
        <Text style={styles.primaryButtonText}>{submitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}</Text>
      </Pressable>

      <Pressable onPress={() => navigation.navigate("Register")}>
        <Text style={styles.link}>ยังไม่มีบัญชี? สมัครสมาชิก</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  title: { fontSize: 32, fontWeight: "700", textAlign: "center" },
  subtitle: { textAlign: "center", color: "#666", marginBottom: 24 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12, fontSize: 16 },
  primaryButton: { backgroundColor: "#e11d48", borderRadius: 8, padding: 14, marginTop: 8 },
  primaryButtonText: { color: "white", textAlign: "center", fontWeight: "600", fontSize: 16 },
  link: { textAlign: "center", marginTop: 16, color: "#e11d48" },
});

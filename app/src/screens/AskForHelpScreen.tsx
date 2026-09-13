import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { showAlert } from "@/lib/alert";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import type { RootStackParamList } from "@/navigation/RootNavigator";

import { useAuth } from "@/providers/AuthProvider";
import { createHelpRequest } from "@/api/community";

type Props = { route: RouteProp<RootStackParamList, "AskForHelp"> };

// ฟีเจอร์ 18 (FEATURE-REQUIREMENTS.md ข้อ 18) — Ask for Help
// Flow 14 ใน USER-FLOWS.md — เปิดได้ตลอดเวลา ไม่ผูกกับสถานะ Challenge (FR18.1)
export default function AskForHelpScreen() {
  const { params } = useRoute<Props["route"]>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { session } = useAuth();

  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<"SUPPORTERS" | "COMMUNITY">("SUPPORTERS");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!session?.user) return;
    if (!body.trim()) {
      showAlert("กรอกคำถามก่อน", "อธิบายสิ่งที่คุณต้องการความช่วยเหลือ");
      return;
    }
    setSubmitting(true);
    const { helpRequest, error } = await createHelpRequest(params.challengeId, session.user.id, body.trim(), visibility);
    setSubmitting(false);

    if (error || !helpRequest) {
      showAlert("ส่งคำถามไม่สำเร็จ", error ?? "ลองใหม่อีกครั้ง");
      return;
    }

    navigation.replace("HelpRequestDetail", { helpRequestId: helpRequest.id });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>❤️ ขอความช่วยเหลือ</Text>
      <Text style={styles.subheading}>ไม่มีใครตัดสินคุณที่นี่ — ถามได้ทุกเรื่องที่ติดขัด</Text>

      <Text style={styles.label}>เล่าให้ฟังหน่อยว่าติดตรงไหน</Text>
      <TextInput
        style={styles.textArea}
        placeholder="เช่น วันนี้อยากจะเลิกล้มเลิกความตั้งใจ ทำยังไงดี..."
        value={body}
        onChangeText={setBody}
        multiline
        numberOfLines={5}
      />

      <Text style={styles.label}>ใครเห็นคำถามนี้ได้บ้าง</Text>
      <View style={styles.optionRow}>
        <Pressable
          style={[styles.optionChip, visibility === "SUPPORTERS" && styles.optionChipActive]}
          onPress={() => setVisibility("SUPPORTERS")}
        >
          <Text style={visibility === "SUPPORTERS" ? styles.optionTextActive : styles.optionText}>
            👥 Supporters ของฉันเท่านั้น
          </Text>
        </Pressable>
        <Pressable
          style={[styles.optionChip, visibility === "COMMUNITY" && styles.optionChipActive]}
          onPress={() => setVisibility("COMMUNITY")}
        >
          <Text style={visibility === "COMMUNITY" ? styles.optionTextActive : styles.optionText}>
            🌍 เปิดให้ Community ทั้งหมด
          </Text>
        </Pressable>
      </View>

      <Pressable style={styles.primaryButton} onPress={handleSubmit} disabled={submitting}>
        <Text style={styles.primaryButtonText}>{submitting ? "กำลังส่ง..." : "ส่งคำถาม"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  heading: { fontSize: 20, fontWeight: "700" },
  subheading: { color: "#6b7f70", marginTop: 4, marginBottom: 16 },
  label: { fontWeight: "600", marginTop: 12 },
  textArea: {
    borderWidth: 1,
    borderColor: "#e7ede8",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    marginTop: 4,
    minHeight: 120,
    textAlignVertical: "top",
  },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  optionChip: { borderWidth: 1, borderColor: "#e7ede8", borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 },
  optionChipActive: { backgroundColor: "#e8415a", borderColor: "#e8415a" },
  optionText: { color: "#1b2a20" },
  optionTextActive: { color: "white", fontWeight: "600" },
  primaryButton: { backgroundColor: "#e8415a", borderRadius: 8, padding: 14, marginTop: 24 },
  primaryButtonText: { color: "white", textAlign: "center", fontWeight: "600", fontSize: 16 },
});

import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootNavigator";

import { useAuth } from "@/providers/AuthProvider";
import { createPersonalChallenge } from "@/api/challenges";
import { createLifeChallenge } from "@/api/lifeChallenge";
import type { ChallengeType, MeasurementType } from "@/types/database";

const MEASUREMENT_OPTIONS: { value: MeasurementType; label: string }[] = [
  { value: "YES_NO", label: "Yes / No" },
  { value: "COUNT", label: "จำนวนครั้ง" },
  { value: "DISTANCE", label: "ระยะทาง" },
  { value: "TIME", label: "เวลา" },
  { value: "NUMBER", label: "ตัวเลข" },
];

// Flow 2 (Personal) / Flow 3 (Life) ใน USER-FLOWS.md — สลับโหมดด้วยปุ่มด้านบน
// (Personal ยังขาด: Privacy แบบ granular, Supporters invite ตอนสร้าง —
// ต่อยอดจาก createPersonalChallenge()/createLifeChallenge() ได้เลย)
export default function CreateChallengeScreen() {
  const { session } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [type, setType] = useState<ChallengeType>("PERSONAL");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [goalDescription, setGoalDescription] = useState("");
  const [measurementType, setMeasurementType] = useState<MeasurementType>("YES_NO");
  const [rewardText, setRewardText] = useState("");
  const [milestoneTitles, setMilestoneTitles] = useState<string[]>(["", ""]);
  const [submitting, setSubmitting] = useState(false);

  function updateMilestone(index: number, value: string) {
    setMilestoneTitles((prev) => prev.map((m, i) => (i === index ? value : m)));
  }

  function addMilestoneField() {
    setMilestoneTitles((prev) => [...prev, ""]);
  }

  function removeMilestoneField(index: number) {
    setMilestoneTitles((prev) => prev.filter((_, i) => i !== index));
  }

  function resetForm() {
    setTitle("");
    setCategory("");
    setGoalDescription("");
    setRewardText("");
    setMilestoneTitles(["", ""]);
  }

  async function handleSubmitPersonal() {
    if (!session?.user) return;
    const { challenge, error } = await createPersonalChallenge(session.user.id, {
      title: title.trim(),
      category: category.trim(),
      goalDescription: goalDescription.trim(),
      measurementType,
      rewardText: rewardText.trim() || undefined,
    });
    if (error || !challenge) {
      Alert.alert("สร้าง Challenge ไม่สำเร็จ", error ?? "ลองใหม่อีกครั้ง");
      return;
    }
    resetForm();
    // Flow 2 -> Flow 4: หลังสร้างเสร็จพาไปหน้า First-Eye Ritual
    navigation.navigate("ChallengeDetail", { challengeId: challenge.id });
  }

  async function handleSubmitLife() {
    if (!session?.user) return;
    const cleanMilestones = milestoneTitles.map((m) => m.trim()).filter((m) => m.length > 0);
    if (cleanMilestones.length === 0) {
      Alert.alert("ใส่ Milestone อย่างน้อย 1 รายการ", "Life Challenge ต้องมี Milestone อย่างน้อย 1 ขั้น");
      return;
    }
    const { challenge, error } = await createLifeChallenge(session.user.id, {
      title: title.trim(),
      category: category.trim(),
      goalDescription: goalDescription.trim(),
      milestoneTitles: cleanMilestones,
      rewardText: rewardText.trim() || undefined,
    });
    if (error || !challenge) {
      Alert.alert("สร้าง Life Challenge ไม่สำเร็จ", error ?? "ลองใหม่อีกครั้ง");
      return;
    }
    resetForm();
    navigation.navigate("ChallengeDetail", { challengeId: challenge.id });
  }

  async function handleSubmit() {
    if (!session?.user) return;
    if (!title.trim() || !category.trim() || !goalDescription.trim()) {
      Alert.alert("กรอกไม่ครบ", "ใส่ชื่อ Challenge, Category และเป้าหมายก่อนนะ");
      return;
    }
    setSubmitting(true);
    if (type === "PERSONAL") await handleSubmitPersonal();
    else await handleSubmitLife();
    setSubmitting(false);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>สร้าง Challenge ใหม่</Text>

      <View style={styles.optionRow}>
        <Pressable
          style={[styles.optionChip, type === "PERSONAL" && styles.optionChipActive]}
          onPress={() => setType("PERSONAL")}
        >
          <Text style={type === "PERSONAL" ? styles.optionTextActive : styles.optionText}>🎯 Personal Challenge</Text>
        </Pressable>
        <Pressable style={[styles.optionChip, type === "LIFE" && styles.optionChipActive]} onPress={() => setType("LIFE")}>
          <Text style={type === "LIFE" ? styles.optionTextActive : styles.optionText}>🧭 Life Challenge</Text>
        </Pressable>
      </View>

      <Text style={styles.label}>ชื่อ Challenge</Text>
      <TextInput
        style={styles.input}
        placeholder={type === "PERSONAL" ? "เช่น ไม่สูบบุหรี่ 30 วัน" : "เช่น เปลี่ยนอาชีพเป็นหมอ"}
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.label}>Category</Text>
      <TextInput style={styles.input} placeholder="เช่น health, career, finance" value={category} onChangeText={setCategory} />

      <Text style={styles.label}>เป้าหมาย</Text>
      <TextInput
        style={styles.input}
        placeholder="อธิบายเป้าหมายของคุณ"
        value={goalDescription}
        onChangeText={setGoalDescription}
        multiline
      />

      {type === "PERSONAL" ? (
        <>
          <Text style={styles.label}>วิธีวัดผล</Text>
          <View style={styles.optionRow}>
            {MEASUREMENT_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={[styles.optionChip, measurementType === opt.value && styles.optionChipActive]}
                onPress={() => setMeasurementType(opt.value)}
              >
                <Text style={measurementType === opt.value ? styles.optionTextActive : styles.optionText}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : (
        <>
          {/* FR5.1: Milestones เรียงตามลำดับ อย่างน้อย 1 รายการ */}
          <Text style={styles.label}>Milestones (เรียงตามลำดับ)</Text>
          {milestoneTitles.map((m, index) => (
            <View key={index} style={styles.milestoneRow}>
              <Text style={styles.milestoneIndex}>{index + 1}.</Text>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder={`Milestone ${index + 1}`}
                value={m}
                onChangeText={(value) => updateMilestone(index, value)}
              />
              {milestoneTitles.length > 1 && (
                <Pressable onPress={() => removeMilestoneField(index)}>
                  <Text style={styles.removeMilestone}>ลบ</Text>
                </Pressable>
              )}
            </View>
          ))}
          <Pressable style={styles.addMilestoneButton} onPress={addMilestoneField}>
            <Text style={styles.addMilestoneText}>+ เพิ่ม Milestone</Text>
          </Pressable>
        </>
      )}

      <Text style={styles.label}>Reward (ไม่บังคับ)</Text>
      <TextInput
        style={styles.input}
        placeholder="เช่น ลูกสาวให้หอม 1 ที ❤️"
        value={rewardText}
        onChangeText={setRewardText}
      />

      <Pressable style={styles.primaryButton} onPress={handleSubmit} disabled={submitting}>
        <Text style={styles.primaryButtonText}>{submitting ? "กำลังสร้าง..." : "สร้าง Challenge"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 8 },
  heading: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  label: { fontWeight: "600", marginTop: 12 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12, fontSize: 15 },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionChip: { borderWidth: 1, borderColor: "#ddd", borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 },
  optionChipActive: { backgroundColor: "#e11d48", borderColor: "#e11d48" },
  optionText: { color: "#333" },
  optionTextActive: { color: "white", fontWeight: "600" },
  milestoneRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  milestoneIndex: { fontWeight: "600", width: 20 },
  removeMilestone: { color: "#e11d48" },
  addMilestoneButton: { marginTop: 8 },
  addMilestoneText: { color: "#e11d48", fontWeight: "600" },
  primaryButton: { backgroundColor: "#e11d48", borderRadius: 8, padding: 14, marginTop: 24, marginBottom: 40 },
  primaryButtonText: { color: "white", textAlign: "center", fontWeight: "600", fontSize: 16 },
});

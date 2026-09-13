import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from "react-native";
import { showAlert } from "@/lib/alert";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootNavigator";

import { useAuth } from "@/providers/AuthProvider";
import { createPersonalChallenge } from "@/api/challenges";
import { inviteFriendToChallenge, searchUsersByName } from "@/api/invites";
import { createLifeChallenge } from "@/api/lifeChallenge";
import {
  defaultUnit,
  isAccumulative,
  targetHelper,
  targetLabel,
  targetPlaceholder,
} from "@/lib/measurement";
import type { ChallengeType, MeasurementType } from "@/types/database";

const MEASUREMENT_OPTIONS: { value: MeasurementType; label: string }[] = [
  { value: "YES_NO", label: "Yes / No" },
  { value: "COUNT", label: "จำนวนครั้ง" },
  { value: "DISTANCE", label: "ระยะทาง" },
  { value: "TIME", label: "เวลา" },
  { value: "NUMBER", label: "ตัวเลข" },
];

type FriendRow = { id: string; display_name: string; avatar_url: string | null };

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
  const [targetValue, setTargetValue] = useState("");
  const [measurementUnit, setMeasurementUnit] = useState(defaultUnit("YES_NO"));
  const [rewardText, setRewardText] = useState("");
  const [milestoneTitles, setMilestoneTitles] = useState<string[]>(["", ""]);
  // ท้าเพื่อนตั้งแต่ตอนสร้าง (ไม่บังคับ) — ค้นหาจากชื่อที่มีอยู่ในแพลตฟอร์ม
  const [friendQuery, setFriendQuery] = useState("");
  const [friendResults, setFriendResults] = useState<FriendRow[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<FriendRow[]>([]);
  const [inviteMessage, setInviteMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // เปลี่ยนวิธีวัดผลแล้วเดาหน่วยให้ใหม่ (ผู้ใช้แก้เองทีหลังได้) เพื่อให้
  // "วิธีวัดผล + เป้าหมาย + วิธี check-in" สอดคล้องกันเสมอ
  function handleChangeMeasurement(next: MeasurementType) {
    setMeasurementType(next);
    setMeasurementUnit(defaultUnit(next));
  }

  // ค้นหาเพื่อนที่มีบัญชีในแพลตฟอร์มอยู่แล้ว เพื่อท้าพร้อมกับตอนสร้าง Challenge
  async function handleSearchFriend(text: string) {
    setFriendQuery(text);
    if (!session?.user || !text.trim()) {
      setFriendResults([]);
      return;
    }
    const { users } = await searchUsersByName(text, session.user.id);
    setFriendResults(users as FriendRow[]);
  }

  function toggleFriend(friend: FriendRow) {
    setSelectedFriends((prev) =>
      prev.some((f) => f.id === friend.id) ? prev.filter((f) => f.id !== friend.id) : [...prev, friend]
    );
  }

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
    setTargetValue("");
    setMeasurementUnit(defaultUnit("YES_NO"));
    setMeasurementType("YES_NO");
    setRewardText("");
    setMilestoneTitles(["", ""]);
    setFriendQuery("");
    setFriendResults([]);
    setSelectedFriends([]);
    setInviteMessage("");
  }

  // แปลงค่าเป้าหมายที่พิมพ์มาเป็นตัวเลข (ต้องมากกว่า 0 ถึงจะใช้ได้)
  const parsedTarget = (() => {
    const n = Number(targetValue.trim());
    if (!Number.isFinite(n) || n <= 0) return null;
    // แบบ Yes/No นับเป็นจำนวนครั้ง (จำนวนเต็ม) ส่วนแบบสะสมมีทศนิยมได้ (10.5 กม.)
    return isAccumulative(measurementType) ? n : Math.floor(n);
  })();

  async function handleSubmitPersonal() {
    if (!session?.user) return;
    const { challenge, error } = await createPersonalChallenge(session.user.id, {
      title: title.trim(),
      category: category.trim(),
      goalDescription: goalDescription.trim(),
      measurementType,
      // เป้าหมาย = ต้อง check-in ให้ครบกี่ครั้งถึงจะเรียกว่าสำเร็จ — ค่านี้คือ
      // สิ่งที่ใช้ตัดสินว่าจะปลดล็อกปุ่ม "รับใบไม้" เมื่อไหร่
      targetValue: parsedTarget ?? undefined,
      measurementUnit: measurementUnit.trim() || undefined,
      rewardText: rewardText.trim() || undefined,
    });
    if (error || !challenge) {
      showAlert("สร้าง Challenge ไม่สำเร็จ", error ?? "ลองใหม่อีกครั้ง");
      return;
    }
    // ส่งคำท้าให้เพื่อนที่เลือกไว้ (ถ้ามี) — ต้องทำหลังสร้าง Challenge เสร็จ
    // เพราะคำท้าต้องผูกกับ Challenge ที่มีอยู่จริงแล้วเท่านั้น
    const invited = await sendInvitesTo(challenge.id);
    resetForm();
    if (invited > 0) {
      showAlert(`🎯 ส่งคำท้าให้ ${invited} คนแล้ว`, "เพื่อนจะเห็นคำท้านี้ในแท็บ Community");
    }
    // Flow 2 -> Flow 4: หลังสร้างเสร็จพาไปหน้า "เริ่มปลูก" (ต้องกดเองถึงจะเริ่มจริง)
    navigation.navigate("ChallengeDetail", { challengeId: challenge.id });
  }

  /** ส่งคำท้าให้ทุกคนที่เลือกไว้ คืนค่าจำนวนคนที่ส่งสำเร็จ */
  async function sendInvitesTo(challengeId: string): Promise<number> {
    if (selectedFriends.length === 0) return 0;
    const results = await Promise.all(
      selectedFriends.map((f) => inviteFriendToChallenge(challengeId, f.id, inviteMessage.trim() || undefined))
    );
    return results.filter((r) => !r.error).length;
  }

  async function handleSubmitLife() {
    if (!session?.user) return;
    const cleanMilestones = milestoneTitles.map((m) => m.trim()).filter((m) => m.length > 0);
    if (cleanMilestones.length === 0) {
      showAlert("ใส่ Milestone อย่างน้อย 1 รายการ", "Life Challenge ต้องมี Milestone อย่างน้อย 1 ขั้น");
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
      showAlert("สร้าง Life Challenge ไม่สำเร็จ", error ?? "ลองใหม่อีกครั้ง");
      return;
    }
    const invited = await sendInvitesTo(challenge.id);
    resetForm();
    if (invited > 0) {
      showAlert(`🎯 ส่งคำท้าให้ ${invited} คนแล้ว`, "เพื่อนจะเห็นคำท้านี้ในแท็บ Community");
    }
    navigation.navigate("ChallengeDetail", { challengeId: challenge.id });
  }

  async function handleSubmit() {
    if (!session?.user) return;
    if (!title.trim() || !category.trim() || !goalDescription.trim()) {
      showAlert("กรอกไม่ครบ", "ใส่ชื่อ Challenge, Category และเป้าหมายก่อนนะ");
      return;
    }
    if (type === "PERSONAL" && !parsedTarget) {
      showAlert("ยังไม่ได้ตั้งเส้นชัย", "ใส่ว่าต้องทำให้ครบกี่ครั้งถึงจะเรียกว่าสำเร็จ (เช่น 10)");
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
                onPress={() => handleChangeMeasurement(opt.value)}
              >
                <Text style={measurementType === opt.value ? styles.optionTextActive : styles.optionText}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* เส้นชัยที่ชัดเจน — ใช้ตัดสินว่าเมื่อไหร่ถึงจะได้ใบไม้ ถ้าไม่มีค่านี้
              ระบบจะไม่รู้ว่าทำสำเร็จตอนไหน ปุ่มรับใบไม้ก็จะไม่ปลดล็อก
              ป้ายกำกับและวิธี check-in จะเปลี่ยนตามวิธีวัดผลที่เลือกด้านบน */}
          <Text style={styles.label}>{targetLabel(measurementType)}</Text>
          <View style={styles.targetRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder={targetPlaceholder(measurementType)}
              value={targetValue}
              onChangeText={setTargetValue}
              keyboardType={isAccumulative(measurementType) ? "decimal-pad" : "number-pad"}
            />
            {isAccumulative(measurementType) && (
              <TextInput
                style={[styles.input, styles.unitInput]}
                placeholder="หน่วย"
                value={measurementUnit}
                onChangeText={setMeasurementUnit}
              />
            )}
          </View>
          <Text style={styles.helper}>{targetHelper(measurementType, measurementUnit)}</Text>
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

      {/* ท้าเพื่อนตั้งแต่ตอนสร้าง (ไม่บังคับ) — ตาม feedback ของผู้ใช้
          ส่วนการคัดลอกลิงก์ / โพสต์ลง Social ใช้ระบบเดิมที่หน้า "ท้าเพื่อน"
          ซึ่งจะเข้าได้ทันทีหลังสร้างเสร็จ (ต้องมี Challenge ก่อนถึงจะมีลิงก์) */}
      <View style={styles.inviteSection}>
        <Text style={styles.label}>🎯 ท้าเพื่อนมาทำด้วยกัน (ไม่บังคับ)</Text>
        <Text style={styles.helper}>
          พิมพ์ชื่อเพื่อนที่มีบัญชีในแอปอยู่แล้ว แตะเพื่อเลือก — พอสร้างเสร็จระบบจะส่งคำท้าให้เขาทันที
          ส่วนคนที่ยังไม่มีบัญชี ใช้ปุ่มคัดลอกลิงก์/โพสต์ลง Social ได้ที่หน้าท้าเพื่อนหลังสร้างเสร็จ
        </Text>

        <TextInput
          style={styles.input}
          placeholder="พิมพ์ชื่อเพื่อนในแอป..."
          value={friendQuery}
          onChangeText={handleSearchFriend}
        />

        {selectedFriends.length > 0 && (
          <View style={styles.chipRow}>
            {selectedFriends.map((f) => (
              <Pressable key={f.id} style={styles.chipSelected} onPress={() => toggleFriend(f)}>
                <Text style={styles.chipSelectedText}>{f.display_name} ✕</Text>
              </Pressable>
            ))}
          </View>
        )}

        {friendQuery.trim().length > 0 && (
          <View style={styles.friendResults}>
            {friendResults.length === 0 ? (
              <Text style={styles.helper}>ไม่พบชื่อนี้ในระบบ — ใช้การแชร์ลิงก์แทนได้หลังสร้างเสร็จ</Text>
            ) : (
              friendResults.map((f) => {
                const picked = selectedFriends.some((x) => x.id === f.id);
                return (
                  <Pressable key={f.id} style={styles.friendRow} onPress={() => toggleFriend(f)}>
                    <Text style={styles.friendName}>{f.display_name}</Text>
                    <Text style={picked ? styles.friendPicked : styles.friendPick}>
                      {picked ? "✓ เลือกแล้ว" : "+ ท้า"}
                    </Text>
                  </Pressable>
                );
              })
            )}
          </View>
        )}

        {selectedFriends.length > 0 && (
          <TextInput
            style={[styles.input, { marginTop: 10 }]}
            placeholder="ข้อความท้าทาย (ไม่บังคับ) เช่น สู้ๆ นะ ท้าทำด้วยกัน!"
            value={inviteMessage}
            onChangeText={setInviteMessage}
            multiline
          />
        )}
      </View>

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
  helper: { color: "#8a9484", fontSize: 12, marginTop: 6, lineHeight: 18 },
  targetRow: { flexDirection: "row", gap: 8 },
  inviteSection: { marginTop: 20, borderTopWidth: 1, borderTopColor: "#eee", paddingTop: 8 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  chipSelected: { backgroundColor: "#2e7d32", borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12 },
  chipSelectedText: { color: "white", fontWeight: "600", fontSize: 13 },
  friendResults: { marginTop: 8 },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  friendName: { fontSize: 15, fontWeight: "600" },
  friendPick: { color: "#2e7d32", fontWeight: "700", fontSize: 13 },
  friendPicked: { color: "#8a9484", fontWeight: "700", fontSize: 13 },
  unitInput: { width: 90 },
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

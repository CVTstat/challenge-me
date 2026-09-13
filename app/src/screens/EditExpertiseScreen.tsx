import React, { useCallback, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, FlatList } from "react-native";
import { showAlert } from "@/lib/alert";
import { useFocusEffect } from "@react-navigation/native";

import { useAuth } from "@/providers/AuthProvider";
import { addExpertiseTag, listMyBadges, listMyExpertiseTags, removeExpertiseTag } from "@/api/expertise";
import { EXPERTISE_CATEGORIES } from "@/lib/categories";
import CategoryPicker from "@/components/CategoryPicker";
import type { CommunityBadgeRow, ExpertiseTagRow } from "@/types/database";

const BADGE_LABEL: Record<string, string> = {
  EXPERIENCED_HELPER: "❤️ Experienced Helper",
  COMMUNITY_GUIDE: "🧭 Community Guide",
  VERIFIED_PROFESSIONAL: "✓ Verified Professional",
  EXPERT: "⭐ Challenge Me Expert",
};

// Flow 1/15 (USER-FLOWS.md) — "ฉันช่วยคนอื่นเรื่องอะไรได้บ้าง?" (FR3.1-3.3)
export default function EditExpertiseScreen() {
  const { session } = useAuth();
  const [tags, setTags] = useState<ExpertiseTagRow[]>([]);
  const [badges, setBadges] = useState<CommunityBadgeRow[]>([]);
  const [category, setCategory] = useState("");
  const [label, setLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!session?.user) return;
    const [{ tags: t }, { badges: b }] = await Promise.all([
      listMyExpertiseTags(session.user.id),
      listMyBadges(session.user.id),
    ]);
    setTags(t);
    setBadges(b);
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleAdd() {
    if (!session?.user) return;
    if (!category.trim() || !label.trim()) {
      showAlert("กรอกไม่ครบ", "ใส่ category และคำอธิบายก่อนนะ");
      return;
    }
    setSubmitting(true);
    const { error } = await addExpertiseTag(session.user.id, category.trim(), label.trim());
    setSubmitting(false);
    if (error) {
      showAlert("เพิ่มไม่สำเร็จ", error);
      return;
    }
    setCategory("");
    setLabel("");
    load();
  }

  async function handleRemove(tagId: string) {
    const { error } = await removeExpertiseTag(tagId);
    if (error) showAlert("ลบไม่สำเร็จ", error);
    else load();
  }

  return (
    <View style={styles.container}>
      {badges.length > 0 && (
        <View style={styles.badgeRow}>
          {badges.map((b) => (
            <View key={b.id} style={styles.badgeChip}>
              <Text style={styles.badgeText}>{BADGE_LABEL[b.badge] ?? b.badge}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.label}>Category</Text>
      <CategoryPicker options={EXPERTISE_CATEGORIES} value={category} onChange={setCategory} />
      <Text style={styles.label}>อธิบายว่าช่วยเรื่องนี้ได้อย่างไร</Text>
      <TextInput
        style={styles.input}
        placeholder="เช่น คนที่เลิกบุหรี่สำเร็จ 5 ปี"
        value={label}
        onChangeText={setLabel}
      />
      <Pressable style={styles.primaryButton} onPress={handleAdd} disabled={submitting}>
        <Text style={styles.primaryButtonText}>{submitting ? "กำลังเพิ่ม..." : "+ เพิ่ม"}</Text>
      </Pressable>

      <FlatList
        style={{ marginTop: 16 }}
        data={tags}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.tagRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.tagCategory}>{item.category}</Text>
              <Text style={styles.tagLabel}>{item.label}</Text>
            </View>
            <Pressable onPress={() => handleRemove(item.id)}>
              <Text style={styles.removeText}>ลบ</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>ยังไม่มี tag — เพิ่มสิ่งที่คุณช่วยคนอื่นได้ไว้ด้านบน</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  badgeChip: { backgroundColor: "#fff7ed", borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12 },
  badgeText: { fontSize: 13, fontWeight: "600" },
  label: { fontWeight: "600", marginTop: 8 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12, fontSize: 15, marginTop: 4 },
  primaryButton: { backgroundColor: "#e11d48", borderRadius: 8, padding: 12, marginTop: 12 },
  primaryButtonText: { color: "white", textAlign: "center", fontWeight: "600" },
  tagRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderColor: "#eee" },
  tagCategory: { fontWeight: "600" },
  tagLabel: { color: "#666" },
  removeText: { color: "#e11d48" },
  empty: { color: "#888", marginTop: 24, textAlign: "center" },
});

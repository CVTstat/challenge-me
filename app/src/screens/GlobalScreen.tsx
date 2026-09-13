import React, { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl, Linking } from "react-native";
import { showAlert } from "@/lib/alert";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootNavigator";

import { listPublishedGlobalChallenges } from "@/api/challenges";
import type { GlobalChallengeRow } from "@/types/database";

const CONTACT_EMAIL = "cvtstat@gmail.com";

// Flow 16 (USER-FLOWS.md §16) — [Global tab]: Featured/Trending/New/Closing Soon
// (เวอร์ชันนี้แสดงเป็น list เดียวก่อน — แยก section ตาม Master Concept ทำเพิ่มได้
// จากการ sort/filter query เดิมโดยไม่ต้องแก้ schema)
export default function GlobalScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [items, setItems] = useState<GlobalChallengeRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { globalChallenges } = await listPublishedGlobalChallenges();
    setItems(globalChallenges as GlobalChallengeRow[]);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // เปิดแอปอีเมลของเครื่องพร้อมกรอกผู้รับ/หัวข้อไว้ให้ — ผู้ใช้แค่พิมพ์เนื้อหา
  // แล้วกดส่ง (ถ้าเครื่องไม่มีแอปอีเมลผูกไว้ จะบอกอีเมลให้ไปส่งเองแทน)
  async function handleContact() {
    const subject = encodeURIComponent("อยากร่วมสร้าง Global Challenge กับ Challenge Me");
    const body = encodeURIComponent(
      "สวัสดีครับ/ค่ะ\n\nแนะนำตัว (องค์กร/ทีม/บุคคล):\n\nไอเดีย Challenge ที่อยากทำร่วมกัน:\n\nสิ่งที่อยากเปลี่ยน:\n\nช่องทางติดต่อกลับ:\n"
    );
    const url = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
    try {
      const ok = await Linking.canOpenURL(url);
      if (!ok) throw new Error("no mail app");
      await Linking.openURL(url);
    } catch {
      showAlert("ส่งอีเมลมาที่", CONTACT_EMAIL);
    }
  }

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={items}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      ListEmptyComponent={
        !loading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>ยังไม่มี Global Challenge ที่เปิดรับสมัคร</Text>
          </View>
        ) : null
      }
      ListFooterComponent={
        <View style={styles.inviteCard}>
          <Text style={styles.inviteTitle}>
            ถ้าคุณคือองค์กร ผู้สนใจ หรือคนหนึ่งคนที่อยากเปลี่ยนโลก{"\n"}ส่งความคิดของคุณมาบอกเราสิ?
          </Text>
          <Text style={styles.inviteSub}>
            Global Challenge เกิดจากไอเดียของคนที่อยากเห็นอะไรบางอย่างดีขึ้น — เล่าให้เราฟังได้เลย
          </Text>
          <Pressable style={styles.inviteButton} onPress={handleContact}>
            <Text style={styles.inviteButtonText}>✉️ ส่งไอเดียมาหาเรา</Text>
          </Pressable>
          <Text style={styles.inviteEmail}>{CONTACT_EMAIL}</Text>
        </View>
      }
      renderItem={({ item }) => (
        <Pressable
          style={styles.card}
          onPress={() => navigation.navigate("GlobalChallengeDetail", { globalChallengeId: item.id })}
        >
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardMeta}>{item.goal_description}</Text>
          <Text style={styles.cardReward}>🎁 {item.reward_text}</Text>
          {item.has_limited_daruma ? (
            <Text style={styles.cardBadge}>
              🍃 ใบไม้พิเศษ (Limited) {item.limited_daruma_claimed}/{item.limited_daruma_total}
            </Text>
          ) : null}
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: "#f7f7f8", borderRadius: 12, padding: 16, gap: 4 },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  cardMeta: { color: "#555" },
  cardReward: { color: "#b45309", marginTop: 4 },
  cardBadge: { color: "#e11d48", marginTop: 2 },
  emptyState: { alignItems: "center", marginTop: 60 },
  emptyTitle: { color: "#888" },
  inviteCard: {
    marginTop: 20,
    backgroundColor: "#fdf3ee",
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    gap: 8,
  },
  inviteTitle: { fontSize: 16, fontWeight: "700", textAlign: "center", lineHeight: 24, color: "#26170f" },
  inviteSub: { fontSize: 13, color: "#8a7264", textAlign: "center", lineHeight: 19 },
  inviteButton: {
    marginTop: 8,
    backgroundColor: "#d61f3f",
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 26,
    alignSelf: "stretch",
  },
  inviteButtonText: { color: "white", fontWeight: "700", textAlign: "center", fontSize: 15 },
  inviteEmail: { fontSize: 12, color: "#a1897a", marginTop: 2 },
});

import React, { useCallback, useState } from "react";
import { View, Text, Pressable, StyleSheet, FlatList } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootNavigator";

import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import TreeCanvas, { nextMilestone } from "@/components/TreeCanvas";
import type { DarumaRow, ProfileRow } from "@/types/database";

// ธีมใหม่ตาม feedback ของผู้ใช้: เลิกใช้ "เติมตา Daruma" เปลี่ยนเป็น
// "ต้นไม้แห่งความสำเร็จ" — เริ่มจากต้นที่มีแต่กิ่ง ทุกความสำเร็จ = ใบไม้ 1 ใบ
// ที่ไปติดบนต้นจนเขียวชอุ่ม หน้านี้คือ "ต้นไม้ส่วนตัว" ของเจ้าของบัญชี
//
// การอ่านค่าจากฐานข้อมูลเดิม (ไม่ได้เปลี่ยนโครงสร้างตาราง):
//   • right_eye_filled_at ไม่ null = ทำสำเร็จแล้ว  → ใบไม้ 🍃
//   • left_eye_filled_at ไม่ null  = เริ่มลงมือแล้ว → กำลังพยายาม 🌱
//   • ยังไม่มีทั้งคู่                = ยังไม่เริ่ม     → เมล็ด 🌰
//
// หมายเหตุ (แก้บั๊กเดิม): Challenge ที่เพิ่งสร้างจะยังเป็นแบบร่าง (DRAFT) —
// ยังไม่โผล่ในแท็บ Home จนกว่าจะกด "เริ่มปลูก" ที่หน้ารายละเอียดก่อน แถวใน
// รายการนี้จึงต้องกดเข้าไปได้เสมอ เพื่อไปกดเริ่มปลูกต่อ
export default function MeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { session, signOut } = useAuth();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [darumas, setDarumas] = useState<(DarumaRow & { challenges: { title: string } | null })[]>([]);

  const load = useCallback(async () => {
    if (!session?.user) return;
    const { data: profileRow } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
    setProfile(profileRow as ProfileRow);

    // ต้นไม้ของเรา: join ผ่าน challenges.owner_id (Flow 12/FR16.1)
    const { data: darumaRows } = await supabase
      .from("daruma")
      .select("*, challenges!inner(title, owner_id)")
      .eq("challenges.owner_id", session.user.id);
    setDarumas((darumaRows ?? []) as any);
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const leaves = darumas.filter((d) => d.right_eye_filled_at).length;
  const growing = darumas.filter((d) => d.left_eye_filled_at && !d.right_eye_filled_at).length;
  const seeds = darumas.filter((d) => !d.left_eye_filled_at).length;
  const goal = nextMilestone(leaves);

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={darumas}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View>
          <Text style={styles.name}>{profile?.display_name ?? "..."}</Text>

          <View style={styles.treeCard}>
            <Text style={styles.treeTitle}>🌳 ต้นไม้ของฉัน</Text>
            <TreeCanvas leaves={leaves} buds={growing} width={240} />

            {/* สิ่งที่ผู้ใช้ขอ: เห็น "สำเร็จแล้ว" เทียบกับ "ที่ยังพยายามอยู่" */}
            <View style={styles.scoreRow}>
              <View style={styles.scoreBox}>
                <Text style={styles.scoreNumber}>{leaves}</Text>
                <Text style={styles.scoreLabel}>🍃 ใบไม้ที่ได้แล้ว</Text>
                <Text style={styles.scoreSub}>ความสำเร็จจริง</Text>
              </View>
              <Text style={styles.scoreDivider}>/</Text>
              <View style={styles.scoreBox}>
                <Text style={[styles.scoreNumber, styles.scoreNumberSoft]}>{growing}</Text>
                <Text style={styles.scoreLabel}>🌱 กำลังพยายาม</Text>
                <Text style={styles.scoreSub}>ยังไม่จบ แต่ยังไม่แพ้</Text>
              </View>
            </View>

            <Text style={styles.goalLine}>
              {leaves === 0
                ? "ต้นไม้ยังไม่มีใบเลย — ทำ Challenge แรกให้สำเร็จ เพื่อใบแรกของคุณ"
                : `อีก ${Math.max(0, goal - leaves)} ใบ จะถึงเป้าหมาย ${goal} ใบ`}
            </Text>
            {seeds > 0 && <Text style={styles.seedLine}>🌰 มี {seeds} อย่างที่ยังไม่ได้เริ่มปลูก</Text>}
          </View>

          <Pressable style={styles.treeLinkButton} onPress={() => navigation.navigate("CommunityTree")}>
            <Text style={styles.treeLinkText}>🌏 ดูต้นไม้ของทั้งชุมชน</Text>
          </Pressable>

          <Text style={styles.listHeader}>รายการทั้งหมดของฉัน</Text>
        </View>
      }
      renderItem={({ item }) => (
        <Pressable
          style={styles.row}
          onPress={() => navigation.navigate("ChallengeDetail", { challengeId: item.challenge_id })}
        >
          <Text style={styles.rowEmoji}>
            {item.right_eye_filled_at ? "🍃" : item.left_eye_filled_at ? "🌱" : "🌰"}
          </Text>
          <Text style={styles.rowTitle}>{item.challenges?.title ?? "-"}</Text>
          {!item.left_eye_filled_at && <Text style={styles.rowHint}>แตะเพื่อเริ่มปลูก →</Text>}
        </Pressable>
      )}
      ListEmptyComponent={
        <Text style={styles.empty}>ยังไม่มีอะไรบนต้นไม้เลย — ไปสร้าง Challenge แรกกันเถอะ</Text>
      }
      ListFooterComponent={
        <View>
          <Pressable style={styles.linkButton} onPress={() => navigation.navigate("EditExpertise")}>
            <Text style={styles.linkButtonText}>🧭 ฉันช่วยคนอื่นเรื่องอะไรได้บ้าง</Text>
          </Pressable>

          <Pressable style={styles.signOutButton} onPress={signOut}>
            <Text style={styles.signOutText}>ออกจากระบบ</Text>
          </Pressable>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  name: { fontSize: 22, fontWeight: "700" },
  treeCard: {
    marginTop: 12,
    backgroundColor: "#f4f8f1",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  treeTitle: { fontSize: 16, fontWeight: "700", color: "#2e7d32", marginBottom: 4 },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8 },
  scoreBox: { alignItems: "center", flex: 1 },
  scoreNumber: { fontSize: 32, fontWeight: "800", color: "#2e7d32" },
  scoreNumberSoft: { color: "#8aa87f" },
  scoreLabel: { fontSize: 13, fontWeight: "600", color: "#3d4a37", marginTop: 2 },
  scoreSub: { fontSize: 11, color: "#8a9484", marginTop: 1 },
  scoreDivider: { fontSize: 24, color: "#c3d1bc", fontWeight: "300" },
  goalLine: { marginTop: 14, fontSize: 13, color: "#5a6b54", textAlign: "center" },
  seedLine: { marginTop: 4, fontSize: 12, color: "#9a8f7d" },
  treeLinkButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#cfe0c8",
    backgroundColor: "#fbfdfa",
    borderRadius: 10,
    padding: 12,
  },
  treeLinkText: { textAlign: "center", fontWeight: "700", color: "#2e7d32" },
  listHeader: { marginTop: 22, marginBottom: 4, fontSize: 15, fontWeight: "700", color: "#333" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  rowEmoji: { fontSize: 18 },
  rowTitle: { fontSize: 15, flex: 1 },
  rowHint: { color: "#e11d48", fontSize: 12, fontWeight: "600" },
  empty: { color: "#888", marginTop: 16 },
  linkButton: { marginTop: 20, borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12 },
  linkButtonText: { textAlign: "center", fontWeight: "600", color: "#333" },
  signOutButton: { marginTop: 12, padding: 14, alignItems: "center" },
  signOutText: { color: "#e11d48", fontWeight: "600" },
});

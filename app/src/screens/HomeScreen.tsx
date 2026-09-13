import React, { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootNavigator";
import { useNavigation } from "@react-navigation/native";

import { useAuth } from "@/providers/AuthProvider";
import { listMyActiveChallenges } from "@/api/challenges";
import { listChallengesNeedingPush } from "@/api/push";
import { getTreeStats } from "@/api/tree";
import type { TreeStats } from "@/api/tree";
import TreeCanvas, { nextMilestone, TREE_CAPACITY } from "@/components/TreeCanvas";
import type { ChallengeRow } from "@/types/database";

// Flow 18 (USER-FLOWS.md) — [Home] tab: My Active Challenges + Needs a Push
// + การ์ดสรุป "ต้นไม้ของพวกเรา" (ธีมใหม่: ความสำเร็จ = ใบไม้บนต้นไม้)
export default function HomeScreen() {
  const { session } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [challenges, setChallenges] = useState<ChallengeRow[]>([]);
  const [needsPush, setNeedsPush] = useState<ChallengeRow[]>([]);
  const [tree, setTree] = useState<TreeStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);
    const [{ challenges: rows }, { challenges: pushRows }, { stats }] = await Promise.all([
      listMyActiveChallenges(session.user.id),
      listChallengesNeedingPush(session.user.id),
      getTreeStats(),
    ]);
    setChallenges(rows);
    setNeedsPush(pushRows);
    setTree(stats);
    setLoading(false);
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // สัญลักษณ์ตามธีมต้นไม้: กำลังโต / ต้องการน้ำ (แรงผลักดัน) / กู้ชีพ
  const statusEmoji: Record<string, string> = {
    ACTIVE: "🌱",
    NEEDS_PUSH: "💧",
    RESCUE: "🛟",
  };

  const platformLeaves = tree?.platformLeaves ?? 0;
  const platformGrowing = tree?.platformGrowing ?? 0;
  const goal = nextMilestone(platformLeaves);
  const scaled = (value: number) => (goal <= 0 ? 0 : Math.round((value / goal) * TREE_CAPACITY));

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={challenges}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      ListHeaderComponent={
        <View style={styles.header}>
          {/* การ์ดต้นไม้ของทั้งชุมชน — กดเข้าไปดูต้นเต็ม ๆ ได้ */}
          <Pressable style={styles.treeCard} onPress={() => navigation.navigate("CommunityTree")}>
            <TreeCanvas
              leaves={scaled(platformLeaves)}
              buds={scaled(platformGrowing)}
              width={96}
              showEmptySlots={false}
            />
            <View style={styles.treeCardText}>
              <Text style={styles.treeCardTitle}>🌏 ต้นไม้ของพวกเรา</Text>
              <Text style={styles.treeCardStat}>
                🍃 {platformLeaves} สำเร็จแล้ว · 🌱 {platformGrowing} กำลังพยายาม
              </Text>
              <Text style={styles.treeCardCta}>แตะเพื่อดูต้นไม้ทั้งต้น →</Text>
            </View>
          </Pressable>

          {needsPush.length > 0 && (
            <View style={styles.pushSection}>
              <Text style={styles.pushHeader}>💧 คนที่คุณช่วยเชียร์ ต้องการแรงผลักดัน</Text>
              {needsPush.map((c) => (
                <Pressable
                  key={c.id}
                  style={styles.pushCard}
                  onPress={() => navigation.navigate("ChallengeDetail", { challengeId: c.id })}
                >
                  <Text style={styles.pushCardTitle}>{c.title}</Text>
                  <Text style={styles.pushCardCta}>ไปดันเขาหน่อย →</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      }
      ListEmptyComponent={
        !loading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>ยังไม่มี Challenge ที่กำลังโตอยู่</Text>
            <Text style={styles.emptySubtitle}>ไปที่แท็บ ➕ Challenge เพื่อปลูกต้นแรกของคุณ</Text>
          </View>
        ) : null
      }
      renderItem={({ item }) => (
        <Pressable
          style={styles.card}
          onPress={() => navigation.navigate("ChallengeDetail", { challengeId: item.id })}
        >
          <Text style={styles.cardEmoji}>{statusEmoji[item.status] ?? "🌱"}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardMeta}>{item.category}</Text>
          </View>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12 },
  header: { gap: 16, marginBottom: 4 },
  treeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f4f8f1",
    borderRadius: 14,
    padding: 12,
  },
  treeCardText: { flex: 1, gap: 2 },
  treeCardTitle: { fontSize: 15, fontWeight: "700", color: "#2e7d32" },
  treeCardStat: { fontSize: 13, color: "#5a6b54" },
  treeCardCta: { fontSize: 12, color: "#8aa87f", marginTop: 2 },
  pushSection: { gap: 8 },
  pushHeader: { fontWeight: "700", fontSize: 15 },
  pushCard: { backgroundColor: "#fef2f2", borderRadius: 12, padding: 14 },
  pushCardTitle: { fontWeight: "600" },
  pushCardCta: { color: "#b91c1c", marginTop: 4, fontSize: 13 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#f7f7f8",
    borderRadius: 12,
    padding: 16,
  },
  cardEmoji: { fontSize: 24 },
  cardTitle: { fontSize: 16, fontWeight: "600" },
  cardMeta: { color: "#888", marginTop: 2 },
  emptyState: { alignItems: "center", marginTop: 60, gap: 8, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: "600" },
  emptySubtitle: { color: "#888", textAlign: "center" },
});

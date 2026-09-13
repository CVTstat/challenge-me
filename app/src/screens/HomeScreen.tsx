import React, { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootNavigator";
import { useNavigation } from "@react-navigation/native";

import { useAuth } from "@/providers/AuthProvider";
import { listMyActiveChallenges } from "@/api/challenges";
import { listChallengesNeedingPush } from "@/api/push";
import type { ChallengeRow } from "@/types/database";

// Flow 18 (USER-FLOWS.md) — [Home] tab: My Active Challenges + Needs a Push
// (Friends' Progress feed / Recommended Challenge ต่อยอดจาก query เดิมได้ —
// ยังไม่ implement ใน scaffold นี้)
export default function HomeScreen() {
  const { session } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [challenges, setChallenges] = useState<ChallengeRow[]>([]);
  const [needsPush, setNeedsPush] = useState<ChallengeRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);
    const [{ challenges: rows }, { challenges: pushRows }] = await Promise.all([
      listMyActiveChallenges(session.user.id),
      listChallengesNeedingPush(session.user.id),
    ]);
    setChallenges(rows);
    setNeedsPush(pushRows);
    setLoading(false);
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const statusEmoji: Record<string, string> = {
    ACTIVE: "🔥",
    NEEDS_PUSH: "🔴",
    RESCUE: "🛟",
  };

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={challenges}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      ListHeaderComponent={
        needsPush.length > 0 ? (
          <View style={styles.pushSection}>
            <Text style={styles.pushHeader}>🔴 คนที่คุณช่วยเชียร์ ต้องการแรงผลักดัน</Text>
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
        ) : null
      }
      ListEmptyComponent={
        !loading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>ยังไม่มี Challenge ที่ active</Text>
            <Text style={styles.emptySubtitle}>ไปที่แท็บ ➕ Challenge เพื่อเริ่ม Challenge แรกของคุณ</Text>
          </View>
        ) : null
      }
      renderItem={({ item }) => (
        <Pressable
          style={styles.card}
          onPress={() => navigation.navigate("ChallengeDetail", { challengeId: item.id })}
        >
          <Text style={styles.cardEmoji}>{statusEmoji[item.status] ?? "🎯"}</Text>
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
  pushSection: { marginBottom: 16, gap: 8 },
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
  emptyState: { alignItems: "center", marginTop: 80, gap: 8, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: "600" },
  emptySubtitle: { color: "#888", textAlign: "center" },
});

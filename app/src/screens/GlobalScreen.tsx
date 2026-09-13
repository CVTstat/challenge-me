import React, { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootNavigator";

import { listPublishedGlobalChallenges } from "@/api/challenges";
import type { GlobalChallengeRow } from "@/types/database";

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
  emptyState: { alignItems: "center", marginTop: 80 },
  emptyTitle: { color: "#888" },
});

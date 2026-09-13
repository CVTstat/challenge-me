import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import TreeCanvas, { nextMilestone, TREE_CAPACITY } from "@/components/TreeCanvas";
import { getTreeStats } from "@/api/tree";
import type { TreeStats } from "@/api/tree";

// ต้นไม้ของทั้งชุมชน — ตาม feedback ของผู้ใช้ที่อยากเห็น "ความสำเร็จทั้งหมด
// ในแพลตฟอร์มเป็นต้นไม้ของทั้งแพลตฟอร์ม" คู่กับ "ต้นไม้ส่วนตัวของเรา"
// ทุกใบบนต้นนี้คือความสำเร็จจริงของใครสักคนในแอป รวมของเราอยู่ในนั้นด้วย
export default function CommunityTreeScreen() {
  const [stats, setStats] = useState<TreeStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { stats: s } = await getTreeStats();
    setStats(s);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading && !stats) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const platformLeaves = stats?.platformLeaves ?? 0;
  const platformGrowing = stats?.platformGrowing ?? 0;
  const platformGrowers = stats?.platformGrowers ?? 0;
  const myLeaves = stats?.myLeaves ?? 0;
  const myGrowing = stats?.myGrowing ?? 0;
  const goal = nextMilestone(platformLeaves);

  // ต้นไม้ของชุมชนมีใบไม้ได้เยอะกว่าช่องใบที่วาดไว้ — จึงแสดงตามสัดส่วนของ
  // "เป้าหมายขั้นถัดไป" แทน (พอถึงเป้าก็ขยับเป้าขึ้นอีก ต้นไม้โตต่อได้เรื่อย ๆ)
  const scaled = (value: number) => (goal <= 0 ? 0 : Math.round((value / goal) * TREE_CAPACITY));

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
    >
      <Text style={styles.title}>🌏 ต้นไม้ของพวกเราทุกคน</Text>
      <Text style={styles.subtitle}>ทุกใบบนต้นนี้ คือความสำเร็จจริงของใครสักคนในแอป</Text>

      <View style={styles.treeCard}>
        <TreeCanvas leaves={scaled(platformLeaves)} buds={scaled(platformGrowing)} width={280} />
        <View style={styles.scoreRow}>
          <View style={styles.scoreBox}>
            <Text style={styles.scoreNumber}>{platformLeaves}</Text>
            <Text style={styles.scoreLabel}>🍃 สำเร็จแล้ว</Text>
          </View>
          <Text style={styles.scoreDivider}>/</Text>
          <View style={styles.scoreBox}>
            <Text style={[styles.scoreNumber, styles.scoreNumberSoft]}>{platformGrowing}</Text>
            <Text style={styles.scoreLabel}>🌱 กำลังพยายาม</Text>
          </View>
        </View>
        <Text style={styles.goalLine}>
          {platformLeaves === 0
            ? "ยังไม่มีใบไม้ใบแรกของชุมชน — คุณอาจเป็นคนแรกก็ได้"
            : `อีก ${Math.max(0, goal - platformLeaves)} ใบ จะถึงเป้าหมายร่วม ${goal} ใบ`}
        </Text>
        <Text style={styles.growersLine}>👥 มี {platformGrowers} คนกำลังปลูกต้นไม้ของตัวเองอยู่</Text>
      </View>

      <Text style={styles.sectionTitle}>🌳 ต้นไม้ของฉันในป่านี้</Text>
      <View style={[styles.treeCard, styles.myTreeCard]}>
        <TreeCanvas leaves={myLeaves} buds={myGrowing} width={200} />
        <View style={styles.scoreRow}>
          <View style={styles.scoreBox}>
            <Text style={styles.scoreNumberSmall}>{myLeaves}</Text>
            <Text style={styles.scoreLabel}>🍃 สำเร็จแล้ว</Text>
          </View>
          <Text style={styles.scoreDivider}>/</Text>
          <View style={styles.scoreBox}>
            <Text style={[styles.scoreNumberSmall, styles.scoreNumberSoft]}>{myGrowing}</Text>
            <Text style={styles.scoreLabel}>🌱 กำลังพยายาม</Text>
          </View>
        </View>
        {platformLeaves > 0 && myLeaves > 0 && (
          <Text style={styles.goalLine}>
            ใบไม้ของคุณคิดเป็น {Math.max(1, Math.round((myLeaves / platformLeaves) * 100))}% ของทั้งชุมชน
          </Text>
        )}
      </View>

      <Text style={styles.footnote}>
        ต้นไม้ไม่ได้โตเพราะความตั้งใจ แต่โตเพราะสิ่งที่ทำสำเร็จจริง — ใบไม้จะขึ้นก็ต่อเมื่อคุณกดว่า
        &quot;ทำสำเร็จแล้ว&quot; ด้วยตัวเองเท่านั้น
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "700", textAlign: "center" },
  subtitle: { color: "#7a8574", textAlign: "center", marginTop: 4, fontSize: 13 },
  treeCard: {
    marginTop: 16,
    backgroundColor: "#f4f8f1",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  myTreeCard: { backgroundColor: "#fbfdfa", borderWidth: 1, borderColor: "#e4eede" },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 10 },
  scoreBox: { alignItems: "center", flex: 1 },
  scoreNumber: { fontSize: 34, fontWeight: "800", color: "#2e7d32" },
  scoreNumberSmall: { fontSize: 26, fontWeight: "800", color: "#2e7d32" },
  scoreNumberSoft: { color: "#8aa87f" },
  scoreLabel: { fontSize: 13, fontWeight: "600", color: "#3d4a37", marginTop: 2 },
  scoreDivider: { fontSize: 24, color: "#c3d1bc", fontWeight: "300" },
  goalLine: { marginTop: 12, fontSize: 13, color: "#5a6b54", textAlign: "center" },
  growersLine: { marginTop: 6, fontSize: 12, color: "#8a9484" },
  sectionTitle: { marginTop: 28, fontSize: 16, fontWeight: "700", color: "#333" },
  footnote: { marginTop: 24, fontSize: 12, color: "#9aa294", textAlign: "center", lineHeight: 18 },
});

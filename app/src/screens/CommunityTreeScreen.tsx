import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import TreeCanvas, { nextMilestone, TREE_CAPACITY } from "@/components/TreeCanvas";
import { ProgressBar, StatTile } from "@/components/ui";
import { colors, font, radius, shadow, spacing } from "@/theme";
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
        <ActivityIndicator size="large" color={colors.primary} />
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
      style={styles.screen}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
    >
      <Text style={styles.title}>🌏 ต้นไม้ของพวกเราทุกคน</Text>
      <Text style={styles.subtitle}>ทุกใบบนต้นนี้ คือความสำเร็จจริงของใครสักคนในแอป</Text>

      <View style={styles.treeCard}>
        <TreeCanvas leaves={scaled(platformLeaves)} buds={scaled(platformGrowing)} width={280} />
        <View style={styles.statRow}>
          <StatTile emoji="🍃" value={platformLeaves} label="สำเร็จแล้ว" color={colors.primary} />
          <StatTile emoji="🌱" value={platformGrowing} label="กำลังพยายาม" color={colors.amber} />
          <StatTile emoji="👥" value={platformGrowers} label="ผู้ร่วมทาง" color={colors.accent} />
        </View>
        <ProgressBar value={goal <= 0 ? 0 : platformLeaves / goal} style={{ marginTop: spacing.lg }} />
        <Text style={styles.goalLine}>
          {platformLeaves === 0
            ? "ยังไม่มีใบไม้ใบแรกของชุมชน — คุณอาจเป็นคนแรกก็ได้"
            : `อีก ${Math.max(0, goal - platformLeaves)} ใบ จะถึงเป้าหมายร่วม ${goal} ใบ`}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>🌳 ต้นไม้ของฉันในป่านี้</Text>
      <View style={[styles.treeCard, styles.myTreeCard]}>
        <TreeCanvas leaves={myLeaves} buds={myGrowing} width={200} />
        <View style={styles.statRow}>
          <StatTile emoji="🍃" value={myLeaves} label="สำเร็จแล้ว" color={colors.primary} />
          <StatTile emoji="🌱" value={myGrowing} label="กำลังพยายาม" color={colors.amber} />
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
  screen: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg, paddingBottom: 40 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  title: { fontSize: font.h2, fontWeight: "800", textAlign: "center", color: colors.text },
  subtitle: { color: colors.textMuted, textAlign: "center", marginTop: 4, fontSize: font.small },
  treeCard: {
    marginTop: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    ...shadow.card,
  },
  myTreeCard: { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder },
  statRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg, alignSelf: "stretch" },
  goalLine: { marginTop: spacing.md, fontSize: font.small, color: colors.textMuted, textAlign: "center" },
  sectionTitle: { marginTop: spacing.xxl, fontSize: font.h3, fontWeight: "700", color: colors.text },
  footnote: {
    marginTop: spacing.xxl,
    fontSize: font.tiny,
    color: colors.textFaint,
    textAlign: "center",
    lineHeight: 18,
  },
});

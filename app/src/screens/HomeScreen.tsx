import React, { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootNavigator";

import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import { listMyActiveChallenges } from "@/api/challenges";
import { listChallengesNeedingPush } from "@/api/push";
import { getProgressForChallenges } from "@/api/progress";
import { countUnreadNotifications } from "@/api/notifications";
import { getTreeStats } from "@/api/tree";
import type { TreeStats } from "@/api/tree";
import TreeCanvas, { nextMilestone, TREE_CAPACITY } from "@/components/TreeCanvas";
import { Avatar, Card, EmptyState, ProgressBar, SectionTitle } from "@/components/ui";
import { categoryIcon } from "@/lib/categories";
import { isAccumulative } from "@/lib/measurement";
import { colors, font, layout, radius, spacing } from "@/theme";
import type { ChallengeRow } from "@/types/database";

type ProgressMap = Record<string, { totalCheckIns: number; totalValue: number }>;

// Flow 18 (USER-FLOWS.md) — [Home] tab: ทักทาย + ต้นไม้ของฉัน + Challenge ที่
// กำลังทำอยู่พร้อมแถบความคืบหน้า + คนที่รอแรงผลักดันจากเรา
export default function HomeScreen() {
  const { session } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [challenges, setChallenges] = useState<ChallengeRow[]>([]);
  const [needsPush, setNeedsPush] = useState<ChallengeRow[]>([]);
  const [tree, setTree] = useState<TreeStats | null>(null);
  const [progress, setProgress] = useState<ProgressMap>({});
  const [displayName, setDisplayName] = useState<string>("");
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);
    const [{ challenges: rows }, { challenges: pushRows }, { stats }, { data: profile }, { count }] =
      await Promise.all([
        listMyActiveChallenges(session.user.id),
        listChallengesNeedingPush(session.user.id),
        getTreeStats(),
        supabase.from("profiles").select("display_name").eq("id", session.user.id).single(),
        countUnreadNotifications(session.user.id),
      ]);
    setChallenges(rows);
    setNeedsPush(pushRows);
    setTree(stats);
    setDisplayName((profile?.display_name as string) ?? "");
    setUnread(count);
    // ความคืบหน้าของทุก Challenge ดึงทีเดียวหลังรู้ว่ามี Challenge อะไรบ้าง
    const { progress: map } = await getProgressForChallenges(rows.map((c) => c.id));
    setProgress(map);
    setLoading(false);
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const platformLeaves = tree?.platformLeaves ?? 0;
  const platformGrowing = tree?.platformGrowing ?? 0;
  const myLeaves = tree?.myLeaves ?? 0;
  const myGrowing = tree?.myGrowing ?? 0;
  const goal = nextMilestone(platformLeaves);
  const scaled = (value: number) => (goal <= 0 ? 0 : Math.round((value / goal) * TREE_CAPACITY));

  const myGoal = nextMilestone(myLeaves);
  const myTreeProgress = myGoal <= 0 ? 0 : myLeaves / myGoal;

  /** ความคืบหน้าของ Challenge หนึ่งอัน: ทำไปแล้วเท่าไหร่ จากเป้าหมายเท่าไหร่ */
  function progressOf(c: ChallengeRow) {
    const p = progress[c.id] ?? { totalCheckIns: 0, totalValue: 0 };
    const numeric = isAccumulative(c.measurement_type);
    const done = numeric ? p.totalValue : p.totalCheckIns;
    const target = c.target_value ?? null;
    const unit = numeric ? c.measurement_unit ?? "" : "วัน";
    const ratio = target && target > 0 ? Math.min(1, done / target) : 0;
    return { done, target, unit, ratio };
  }

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={[styles.list, { paddingTop: insets.top + spacing.md }]}
      data={challenges}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
      ListHeaderComponent={
        <View>
          {/* ทักทายผู้ใช้ */}
          <View style={styles.greetRow}>
            <Avatar name={displayName} size={46} />
            <View style={{ flex: 1 }}>
              <Text style={styles.greetHello}>สวัสดี {displayName || "เพื่อน"} 👋</Text>
              <Text style={styles.greetSub}>วันนี้เก่งขึ้นอีกนิดแล้ว</Text>
            </View>
            {/* กระดิ่งแจ้งเตือน — ตัวเลขแดงคือจำนวนที่ยังไม่ได้อ่าน */}
            <Pressable
              style={styles.bell}
              onPress={() => navigation.navigate("Notifications")}
              hitSlop={8}
              accessibilityLabel="การแจ้งเตือน"
            >
              <Text style={styles.bellGlyph}>🔔</Text>
              {unread > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unread > 9 ? "9+" : unread}</Text>
                </View>
              )}
            </Pressable>
          </View>

          {/* การ์ดต้นไม้ของฉัน */}
          <Card style={styles.treeCard} onPress={() => navigation.navigate("CommunityTree")}>
            <View style={styles.treeRow}>
              <TreeCanvas leaves={myLeaves} buds={myGrowing} width={104} showEmptySlots={false} />
              <View style={styles.treeStats}>
                <Text style={styles.treeTitle}>🌳 ต้นไม้ของฉัน</Text>
                <View style={styles.treeNumbers}>
                  <View>
                    <Text style={styles.treeBig}>{myLeaves}</Text>
                    <Text style={styles.treeSmall}>🍃 ใบไม้ที่ได้แล้ว</Text>
                  </View>
                  <View>
                    <Text style={[styles.treeBig, styles.treeBigSoft]}>{myGrowing}</Text>
                    <Text style={styles.treeSmall}>🌱 กำลังพยายาม</Text>
                  </View>
                </View>
              </View>
            </View>
            <ProgressBar value={myTreeProgress} style={{ marginTop: spacing.md }} />
            <Text style={styles.treeCaption}>
              {myLeaves === 0
                ? "ทุกความพยายาม เติบโตเป็นความสำเร็จ — ใบแรกของคุณรออยู่"
                : `อีก ${Math.max(0, myGoal - myLeaves)} ใบ จะถึง ${myGoal} ใบ`}
            </Text>
          </Card>

          {/* ต้นไม้ของทั้งชุมชน */}
          <Pressable style={styles.globalStrip} onPress={() => navigation.navigate("CommunityTree")}>
            <Text style={styles.globalStripText}>
              🌏 ชุมชนสำเร็จแล้ว <Text style={styles.globalStripNum}>{platformLeaves}</Text> ใบ · กำลังพยายาม{" "}
              <Text style={styles.globalStripNum}>{platformGrowing}</Text>
            </Text>
            <Text style={styles.globalStripCta}>ดูทั้งหมด ›</Text>
          </Pressable>

          {needsPush.length > 0 && (
            <View>
              <SectionTitle>💧 เพื่อนที่รอแรงผลักดันจากคุณ</SectionTitle>
              {needsPush.map((c) => (
                <Card
                  key={c.id}
                  style={styles.pushCard}
                  onPress={() => navigation.navigate("ChallengeDetail", { challengeId: c.id })}
                >
                  <Text style={styles.pushTitle}>{c.title}</Text>
                  <Text style={styles.pushCta}>ไปส่งกำลังใจให้เขาหน่อย →</Text>
                </Card>
              ))}
            </View>
          )}

          <SectionTitle>Challenge ของฉัน</SectionTitle>
        </View>
      }
      ListEmptyComponent={
        !loading ? (
          <EmptyState
            emoji="🌱"
            title="ยังไม่มี Challenge ที่กำลังโตอยู่"
            subtitle="กดปุ่ม + สีเขียวด้านล่าง เพื่อปลูกต้นแรกของคุณ"
          />
        ) : null
      }
      renderItem={({ item }) => {
        const p = progressOf(item);
        const pct = Math.round(p.ratio * 100);
        return (
          <Card
            style={styles.challengeCard}
            onPress={() => navigation.navigate("ChallengeDetail", { challengeId: item.id })}
          >
            <View style={styles.challengeRow}>
              <View style={styles.iconTile}>
                <Text style={styles.iconTileGlyph}>{categoryIcon(item.category)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.challengeTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.challengeMeta}>
                  {p.target ? `${+p.done.toFixed(1)} / ${p.target} ${p.unit}` : "ยังไม่ได้ตั้งเป้าหมาย"}
                </Text>
              </View>
              <Text style={styles.challengePct}>{p.target ? `${pct}%` : "—"}</Text>
            </View>
            <ProgressBar value={p.ratio} height={7} style={{ marginTop: spacing.md }} />
          </Card>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  list: { width: "100%", maxWidth: layout.maxContent, alignSelf: "center", paddingHorizontal: spacing.lg, paddingBottom: 32, gap: spacing.md },

  greetRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.lg },
  greetHello: { fontSize: font.h3, fontWeight: "800", color: colors.text },
  greetSub: { fontSize: font.small, color: colors.textMuted, marginTop: 1 },
  bell: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  bellGlyph: { fontSize: 19 },
  badge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 20,
    height: 20,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: colors.bg,
  },
  badgeText: { color: colors.onPrimary, fontSize: 10, fontWeight: "800" },

  treeCard: { paddingVertical: spacing.lg },
  treeRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  treeStats: { flex: 1 },
  treeTitle: { fontSize: font.h3, fontWeight: "700", color: colors.primaryDark, marginBottom: spacing.sm },
  treeNumbers: { flexDirection: "row", gap: spacing.xl },
  treeBig: { fontSize: 28, fontWeight: "800", color: colors.primary },
  treeBigSoft: { color: colors.textFaint },
  treeSmall: { fontSize: font.tiny, color: colors.textMuted, marginTop: 1 },
  treeCaption: { fontSize: font.small, color: colors.textMuted, marginTop: spacing.sm, textAlign: "center" },

  globalStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  globalStripText: { flex: 1, fontSize: font.small, color: colors.primaryDark, lineHeight: 20 },
  globalStripNum: { fontWeight: "800" },
  // flexShrink: 0 กัน "ดูทั้งหมด ›" ถูกบีบจนตกบรรทัดเวลาตัวเลขยาวขึ้น
  globalStripCta: { fontSize: font.tiny, color: colors.primary, fontWeight: "700", flexShrink: 0 },

  pushCard: { backgroundColor: colors.accentSoft, borderColor: "#f7cdd5", marginBottom: spacing.sm },
  pushTitle: { fontWeight: "700", color: colors.text },
  pushCta: { color: colors.accentDark, marginTop: 4, fontSize: font.small, fontWeight: "600" },

  challengeCard: { paddingVertical: spacing.md },
  challengeRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  iconTile: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  iconTileGlyph: { fontSize: 22 },
  challengeTitle: { fontSize: font.body, fontWeight: "700", color: colors.text },
  challengeMeta: { fontSize: font.small, color: colors.textMuted, marginTop: 2 },
  challengePct: { fontSize: font.body, fontWeight: "800", color: colors.primary },
});

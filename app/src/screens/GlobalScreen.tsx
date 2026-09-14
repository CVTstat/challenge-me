import React, { useCallback, useState } from "react";
import { View, Text, FlatList, StyleSheet, RefreshControl, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showAlert } from "@/lib/alert";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootNavigator";

import { listPublishedGlobalChallenges } from "@/api/challenges";
import { getTreeStats } from "@/api/tree";
import type { TreeStats } from "@/api/tree";
import TreeCanvas, { nextMilestone, TREE_CAPACITY } from "@/components/TreeCanvas";
import { Card, EmptyState, PrimaryButton, SectionTitle, StatTile } from "@/components/ui";
import { colors, font, layout, radius, spacing } from "@/theme";
import type { GlobalChallengeRow } from "@/types/database";

const CONTACT_EMAIL = "cvtstat@gmail.com";

// Flow 16 (USER-FLOWS.md §16) — [Global tab]: ภาพรวมของทั้งแพลตฟอร์ม +
// Global Challenge ที่เปิดรับสมัคร + ช่องทางให้องค์กร/คนทั่วไปส่งไอเดียเข้ามา
export default function GlobalScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<GlobalChallengeRow[]>([]);
  const [tree, setTree] = useState<TreeStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ globalChallenges }, { stats }] = await Promise.all([listPublishedGlobalChallenges(), getTreeStats()]);
    setItems(globalChallenges as GlobalChallengeRow[]);
    setTree(stats);
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

  const platformLeaves = tree?.platformLeaves ?? 0;
  const platformGrowing = tree?.platformGrowing ?? 0;
  const growers = tree?.platformGrowers ?? 0;
  const goal = nextMilestone(platformLeaves);
  const scaled = (value: number) => (goal <= 0 ? 0 : Math.round((value / goal) * TREE_CAPACITY));

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={[styles.list, { paddingTop: insets.top + spacing.md }]}
      data={items}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
      ListHeaderComponent={
        <View>
          <Text style={styles.header}>🌏 Global</Text>
          <Text style={styles.subheader}>รวมพลัง สร้างการเปลี่ยนแปลงที่ใหญ่กว่า</Text>

          {/* ต้นไม้รวมของทั้งแพลตฟอร์ม */}
          <Card style={styles.heroCard} onPress={() => navigation.navigate("CommunityTree")}>
            <TreeCanvas
              leaves={scaled(platformLeaves)}
              buds={scaled(platformGrowing)}
              width={190}
              showEmptySlots={false}
            />
            <Text style={styles.heroText}>
              มาร่วมกันสร้างต้นไม้แห่งการเปลี่ยนแปลง{"\n"}ให้โลกใบนี้น่าอยู่ขึ้น
            </Text>
            <View style={styles.statRow}>
              <StatTile
                emoji="🍃"
                value={platformLeaves.toLocaleString()}
                label="ใบไม้ที่ได้แล้ว"
                color={colors.primary}
              />
              <StatTile emoji="👥" value={growers.toLocaleString()} label="ผู้ร่วมทาง" color={colors.accent} />
              <StatTile emoji="🎯" value={items.length} label="Global Challenge" color={colors.amber} />
            </View>
          </Card>

          <SectionTitle>Global Challenge ที่กำลังเปิดรับสมัคร</SectionTitle>
        </View>
      }
      ListEmptyComponent={
        !loading ? (
          <EmptyState
            emoji="🌍"
            title="ยังไม่มี Global Challenge ที่เปิดรับสมัคร"
            subtitle="อยากให้มี Challenge แบบไหน ส่งไอเดียมาบอกเราได้เลยด้านล่าง"
          />
        ) : null
      }
      ListFooterComponent={
        <Card style={styles.inviteCard}>
          <Text style={styles.inviteTitle}>
            ถ้าคุณคือองค์กร ผู้สนใจ หรือคนหนึ่งคนที่อยากเปลี่ยนโลก{"\n"}ส่งความคิดของคุณมาบอกเราสิ?
          </Text>
          <Text style={styles.inviteSub}>
            Global Challenge เกิดจากไอเดียของคนที่อยากเห็นอะไรบางอย่างดีขึ้น — เล่าให้เราฟังได้เลย
          </Text>
          <PrimaryButton
            label="✉️ ส่งไอเดียมาหาเรา"
            onPress={handleContact}
            color={colors.accent}
            style={styles.inviteButton}
          />
          <Text style={styles.inviteEmail}>{CONTACT_EMAIL}</Text>
        </Card>
      }
      renderItem={({ item }) => (
        <Card
          style={styles.card}
          onPress={() => navigation.navigate("GlobalChallengeDetail", { globalChallengeId: item.id })}
        >
          <View style={styles.cardHead}>
            <Text style={styles.cardGlyph}>🌍</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardMeta} numberOfLines={2}>
                {item.goal_description}
              </Text>
            </View>
          </View>
          {item.reward_text ? <Text style={styles.cardReward}>🎁 {item.reward_text}</Text> : null}
          {item.has_limited_daruma ? (
            <Text style={styles.cardBadge}>
              🍃 ใบไม้พิเศษ (Limited) {item.limited_daruma_claimed}/{item.limited_daruma_total}
            </Text>
          ) : null}
        </Card>
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  list: { width: "100%", maxWidth: layout.maxContent, alignSelf: "center", paddingHorizontal: spacing.lg, paddingBottom: 32, gap: spacing.md },
  header: { fontSize: font.h1, fontWeight: "800", color: colors.text },
  subheader: { fontSize: font.small, color: colors.textMuted, marginTop: 2, marginBottom: spacing.lg },

  heroCard: { alignItems: "center", paddingVertical: spacing.xl },
  heroText: {
    fontSize: font.body,
    fontWeight: "700",
    color: colors.primaryDark,
    textAlign: "center",
    lineHeight: 24,
    marginTop: spacing.md,
  },
  statRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg, alignSelf: "stretch" },

  card: { gap: spacing.sm },
  cardHead: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  cardGlyph: { fontSize: 26 },
  cardTitle: { fontSize: font.h3, fontWeight: "700", color: colors.text },
  cardMeta: { color: colors.textMuted, marginTop: 3, fontSize: font.small, lineHeight: 20 },
  cardReward: { color: colors.amber, fontSize: font.small, fontWeight: "600" },
  cardBadge: { color: colors.accent, fontSize: font.small, fontWeight: "600" },

  inviteCard: {
    marginTop: spacing.xl,
    backgroundColor: colors.accentSoft,
    borderColor: "#f7cdd5",
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  inviteTitle: {
    fontSize: font.h3,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 26,
    color: colors.text,
  },
  inviteSub: {
    fontSize: font.small,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  inviteButton: { alignSelf: "stretch", marginTop: spacing.lg, borderRadius: radius.md },
  inviteEmail: { fontSize: font.tiny, color: colors.textFaint, marginTop: spacing.md },
});

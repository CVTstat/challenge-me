import React, { useCallback, useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootNavigator";

import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import TreeCanvas, { nextMilestone } from "@/components/TreeCanvas";
import DarumaCanvas, { darumaEyesFrom } from "@/components/DarumaCanvas";
import { Avatar, Card, ProgressBar, SectionTitle, StatTile } from "@/components/ui";
import { colors, font, radius, spacing } from "@/theme";
import type { DarumaRow, ProfileRow } from "@/types/database";

// หน้านี้รวมทั้งสองสัญลักษณ์ของแอปไว้ด้วยกัน (ดู DarumaCanvas สำหรับเหตุผล):
//   • ต้นไม้ = ภาพรวมทั้งหมดของเรา ทุกใบคือความสำเร็จ 1 ครั้ง
//   • ดารุมะ = เป้าหมายรายอัน เห็นทันทีว่าตัวไหนยังค้างตาข้างที่สองอยู่
//
// การอ่านค่าจากฐานข้อมูลเดิม (ไม่ได้เปลี่ยนโครงสร้างตาราง):
//   • right_eye_filled_at ไม่ null = ตาครบสองข้าง = สำเร็จ → ได้ใบไม้ 🍃
//   • left_eye_filled_at ไม่ null  = เติมตาแรกแล้ว = กำลังพยายาม
//   • ยังไม่มีทั้งคู่                = ดารุมะยังไม่มีตาเลย = ยังไม่เริ่ม
export default function MeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
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
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
    >
      {/* หัวโปรไฟล์ */}
      <View style={styles.profileRow}>
        <Avatar name={profile?.display_name} size={62} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{profile?.display_name ?? "..."}</Text>
          <Text style={styles.motto}>เล็ก ๆ ทุกวัน เปลี่ยนคุณได้</Text>
        </View>
      </View>

      {/* สถิติรวมของเรา */}
      <View style={styles.statRow}>
        <StatTile value={leaves} label="ใบไม้ที่ได้แล้ว" emoji="🍃" color={colors.primary} />
        <StatTile value={growing} label="กำลังพยายาม" emoji="🌱" color={colors.amber} />
        <StatTile value={darumas.length} label="Challenge ทั้งหมด" emoji="🎯" color={colors.accent} />
      </View>

      {/* ต้นไม้ของฉัน */}
      <Card style={styles.treeCard}>
        <Text style={styles.treeTitle}>🌳 ต้นไม้ของฉัน</Text>
        <TreeCanvas leaves={leaves} buds={growing} width={230} />
        <ProgressBar value={goal <= 0 ? 0 : leaves / goal} style={{ marginTop: spacing.lg }} />
        <Text style={styles.goalLine}>
          {leaves === 0
            ? "ต้นไม้ยังไม่มีใบเลย — ทำ Challenge แรกให้สำเร็จ เพื่อใบแรกของคุณ"
            : `อีก ${Math.max(0, goal - leaves)} ใบ จะถึงเป้าหมาย ${goal} ใบ`}
        </Text>
        <Pressable onPress={() => navigation.navigate("CommunityTree")} hitSlop={8}>
          <Text style={styles.treeLink}>🌏 ดูต้นไม้ของทั้งชุมชน ›</Text>
        </Pressable>
      </Card>

      {/* คอลเลกชันดารุมะ */}
      <SectionTitle>ดารุมะของฉัน</SectionTitle>
      {seeds > 0 && <Text style={styles.seedLine}>มีดารุมะ {seeds} ตัวที่ยังไม่ได้เติมตาเลย — แตะเพื่อเริ่ม</Text>}
      {darumas.length === 0 ? (
        <Text style={styles.empty}>ยังไม่มีดารุมะเลย — สร้าง Challenge แรกกันเถอะ</Text>
      ) : (
        <View style={styles.darumaGrid}>
          {darumas.map((item) => {
            const eyes = darumaEyesFrom(item.left_eye_filled_at, item.right_eye_filled_at);
            return (
              <Pressable
                key={item.id}
                style={styles.darumaCell}
                onPress={() => navigation.navigate("ChallengeDetail", { challengeId: item.challenge_id })}
              >
                <DarumaCanvas eyes={eyes} width={64} />
                <Text style={styles.darumaName} numberOfLines={2}>
                  {item.challenges?.title ?? "-"}
                </Text>
                <Text style={[styles.darumaState, eyes === 2 && { color: colors.primary }]}>
                  {eyes === 2 ? "สำเร็จแล้ว 🍃" : eyes === 1 ? "กำลังพยายาม" : "ยังไม่เริ่ม"}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* เมนู */}
      <View style={styles.menu}>
        <MenuRow
          icon="🧭"
          label="ฉันช่วยคนอื่นเรื่องอะไรได้บ้าง"
          onPress={() => navigation.navigate("EditExpertise")}
        />
        <MenuRow icon="🌏" label="ต้นไม้ของทั้งชุมชน" onPress={() => navigation.navigate("CommunityTree")} />
        <MenuRow icon="🚪" label="ออกจากระบบ" danger onPress={signOut} />
      </View>
    </ScrollView>
  );
}

function MenuRow({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.menuRow, pressed && { opacity: 0.7 }]}>
      <Text style={styles.menuIcon}>{icon}</Text>
      <Text style={[styles.menuLabel, danger && { color: colors.accent }]}>{label}</Text>
      <Text style={styles.menuChevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.lg, paddingBottom: 40 },

  profileRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.lg },
  name: { fontSize: font.h2, fontWeight: "800", color: colors.text },
  motto: { fontSize: font.small, color: colors.textMuted, marginTop: 2 },

  statRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg },

  treeCard: { alignItems: "center", paddingVertical: spacing.xl },
  treeTitle: { fontSize: font.h3, fontWeight: "700", color: colors.primaryDark, marginBottom: spacing.sm },
  goalLine: { marginTop: spacing.sm, fontSize: font.small, color: colors.textMuted, textAlign: "center" },
  treeLink: { marginTop: spacing.md, color: colors.primary, fontWeight: "700", fontSize: font.small },

  seedLine: { fontSize: font.small, color: colors.amber, marginBottom: spacing.sm },
  empty: { color: colors.textFaint, marginTop: spacing.sm },
  darumaGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  darumaCell: {
    width: "30.5%",
    minWidth: 96,
    flexGrow: 1,
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  darumaName: { fontSize: font.tiny, fontWeight: "700", color: colors.text, textAlign: "center", marginTop: 6 },
  darumaState: { fontSize: font.tiny, color: colors.textFaint, marginTop: 2 },

  menu: { marginTop: spacing.xxl, backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: 15,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuIcon: { fontSize: 18 },
  menuLabel: { flex: 1, fontSize: font.body, fontWeight: "600", color: colors.text },
  menuChevron: { fontSize: 20, color: colors.textFaint },
});

import React, { useCallback, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Image } from "react-native";
import { showAlert } from "@/lib/alert";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootNavigator";

import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import TreeCanvas, { nextMilestone } from "@/components/TreeCanvas";
import { Avatar, Card, ProgressBar, StatTile } from "@/components/ui";
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
  // แก้ชื่อที่แสดงในแอปได้ — ชื่อเริ่มต้นมาจาก LINE ถ้าเข้าผ่าน LINE
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);

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

  function startEditingName() {
    setNameDraft(profile?.display_name ?? "");
    setEditingName(true);
  }

  async function handleSaveName() {
    if (!session?.user) return;
    const name = nameDraft.trim();
    if (!name) {
      showAlert("ใส่ชื่อก่อน", "ชื่อที่แสดงว่างไม่ได้");
      return;
    }
    setSavingName(true);
    const { error } = await supabase.from("profiles").update({ display_name: name }).eq("id", session.user.id);
    setSavingName(false);
    if (error) {
      showAlert("เปลี่ยนชื่อไม่สำเร็จ", error.message);
      return;
    }
    setEditingName(false);
    load();
  }

  const leaves = darumas.filter((d) => d.right_eye_filled_at).length;
  const growing = darumas.filter((d) => d.left_eye_filled_at && !d.right_eye_filled_at).length;
  const seeds = darumas.filter((d) => !d.left_eye_filled_at).length;
  const goal = nextMilestone(leaves);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
    >
      {/* หัวโปรไฟล์ — รูปจาก LINE ถ้ามี ไม่งั้นใช้ตัวอักษรแรกของชื่อ */}
      <View style={styles.profileRow}>
        {profile?.line_picture_url ? (
          <Image source={{ uri: profile.line_picture_url }} style={styles.avatarImage} />
        ) : (
          <Avatar name={profile?.display_name} size={62} />
        )}
        <View style={{ flex: 1 }}>
          {editingName ? (
            <View style={styles.nameEditRow}>
              <TextInput
                style={styles.nameInput}
                value={nameDraft}
                onChangeText={setNameDraft}
                placeholder="ชื่อที่แสดงในแอป"
                placeholderTextColor={colors.textFaint}
                autoFocus
                maxLength={40}
              />
              <Pressable onPress={handleSaveName} disabled={savingName} hitSlop={8}>
                <Text style={styles.nameSave}>{savingName ? "..." : "บันทึก"}</Text>
              </Pressable>
              <Pressable onPress={() => setEditingName(false)} hitSlop={8}>
                <Text style={styles.nameCancel}>ยกเลิก</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={startEditingName} hitSlop={6}>
              <Text style={styles.name}>
                {profile?.display_name ?? "..."} <Text style={styles.editHint}>แก้ไข</Text>
              </Text>
            </Pressable>
          )}
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

      {/* คอลเลกชันดารุมะย้ายไปอยู่หน้า "ต้นไม้ของพวกเรา" แล้ว (ตามที่ผู้ใช้ขอ)
          — อยู่ต่อจากต้นไม้ของเราเองในหน้านั้น เข้าได้จากการ์ดด้านบนหรือเมนู
          ข้างล่าง หน้านี้จึงเหลือแค่โปรไฟล์ สถิติ และเมนู */}
      {seeds > 0 && (
        <Text style={styles.seedLine}>มีดารุมะ {seeds} ตัวที่ยังไม่ได้เติมตาเลย — ดูได้ที่ต้นไม้ของพวกเรา</Text>
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
  editHint: { fontSize: font.tiny, color: colors.primary, fontWeight: "700" },
  motto: { fontSize: font.small, color: colors.textMuted, marginTop: 2 },
  avatarImage: { width: 62, height: 62, borderRadius: 31, backgroundColor: colors.primarySoft },
  nameEditRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  nameInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: font.body,
    color: colors.text,
  },
  nameSave: { color: colors.primary, fontWeight: "800", fontSize: font.small },
  nameCancel: { color: colors.textFaint, fontWeight: "600", fontSize: font.small },

  statRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg },

  treeCard: { alignItems: "center", paddingVertical: spacing.xl },
  treeTitle: { fontSize: font.h3, fontWeight: "700", color: colors.primaryDark, marginBottom: spacing.sm },
  goalLine: { marginTop: spacing.sm, fontSize: font.small, color: colors.textMuted, textAlign: "center" },
  treeLink: { marginTop: spacing.md, color: colors.primary, fontWeight: "700", fontSize: font.small },

  seedLine: { fontSize: font.small, color: colors.amber, marginBottom: spacing.sm },
  empty: { color: colors.textFaint, marginTop: spacing.sm },

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

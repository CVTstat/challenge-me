import React, { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl } from "react-native";
import { showAlert } from "@/lib/alert";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootNavigator";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/providers/AuthProvider";
import { Card, EmptyState, SectionTitle } from "@/components/ui";
import { colors, font, layout, radius, spacing } from "@/theme";
import { listOpenCommunityHelpRequests } from "@/api/community";
import {
  listChallengesImSupporting,
  listPendingSupporterInvites,
  respondToSupporterInvite,
} from "@/api/supporters";
import { listPendingChallengeInvites, respondToChallengeInvite } from "@/api/invites";
import type { ChallengeInviteRow, HelpRequestRow } from "@/types/database";

type SupportingRow = { id: string; challenges: { id: string; title: string; status: string; category: string } | null };
type InviteRow = { id: string; challenges: { id: string; title: string } | null };
type ChallengeInviteWithMeta = ChallengeInviteRow & {
  challenges: { id: string; title: string; goal_description: string } | null;
  inviter: { display_name: string } | null;
};

// Flow 14/15 (USER-FLOWS.md §14-15) — Community: Ask Community feed +
// People I'm Supporting + คำเชิญ Supporter ที่ค้างตอบรับ
export default function CommunityScreen() {
  const { session } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [requests, setRequests] = useState<HelpRequestRow[]>([]);
  const [supporting, setSupporting] = useState<SupportingRow[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [challengeInvites, setChallengeInvites] = useState<ChallengeInviteWithMeta[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ helpRequests }, supportingResult, invitesResult, challengeInvitesResult] = await Promise.all([
      listOpenCommunityHelpRequests(),
      session?.user ? listChallengesImSupporting(session.user.id) : Promise.resolve({ rows: [] as SupportingRow[] }),
      session?.user ? listPendingSupporterInvites(session.user.id) : Promise.resolve({ rows: [] as InviteRow[] }),
      session?.user
        ? listPendingChallengeInvites(session.user.id)
        : Promise.resolve({ rows: [] as ChallengeInviteWithMeta[] }),
    ]);
    setRequests(helpRequests);
    setSupporting((supportingResult as { rows: SupportingRow[] }).rows);
    setInvites((invitesResult as { rows: InviteRow[] }).rows);
    setChallengeInvites((challengeInvitesResult as { rows: ChallengeInviteWithMeta[] }).rows);
    setLoading(false);
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleRespond(supporterId: string, accept: boolean) {
    const { error } = await respondToSupporterInvite(supporterId, accept);
    if (error) showAlert("ทำรายการไม่สำเร็จ", error);
    else load();
  }

  async function handleRespondChallengeInvite(inviteId: string, accept: boolean) {
    const { newChallengeId, error } = await respondToChallengeInvite(inviteId, accept);
    if (error) {
      showAlert("ทำรายการไม่สำเร็จ", error);
      return;
    }
    if (accept && newChallengeId) {
      navigation.navigate("ChallengeDetail", { challengeId: newChallengeId });
    }
    load();
  }

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={[styles.list, { paddingTop: insets.top + spacing.md }]}
      data={requests}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
      ListHeaderComponent={
        <View>
          <Text style={styles.header}>❤️ Community</Text>
          <Text style={styles.subheader}>ที่ที่ไม่มีใครต้องสู้อยู่คนเดียว</Text>

          {challengeInvites.length > 0 && (
            <View>
              <SectionTitle>🎯 คำท้าที่ได้รับ</SectionTitle>
              {challengeInvites.map((inv) => (
                <Card key={inv.id} style={styles.challengeInviteCard}>
                  <Text style={styles.inviteTitle}>
                    {inv.inviter?.display_name ?? "เพื่อน"} ท้าให้ทำ “{inv.challenges?.title ?? "-"}”
                  </Text>
                  {inv.message ? <Text style={styles.inviteMessage}>“{inv.message}”</Text> : null}
                  <View style={styles.actionRow}>
                    <Pressable
                      style={styles.acceptButton}
                      onPress={() => handleRespondChallengeInvite(inv.id, true)}
                    >
                      <Text style={styles.acceptButtonText}>🔥 รับคำท้า</Text>
                    </Pressable>
                    <Pressable
                      style={styles.declineButton}
                      onPress={() => handleRespondChallengeInvite(inv.id, false)}
                    >
                      <Text style={styles.declineButtonText}>ไว้ก่อน</Text>
                    </Pressable>
                  </View>
                </Card>
              ))}
            </View>
          )}

          {invites.length > 0 && (
            <View>
              <SectionTitle>📬 คำเชิญเป็น Supporter</SectionTitle>
              {invites.map((inv) => (
                <Card key={inv.id} style={styles.inviteCard}>
                  <Text style={styles.inviteTitle}>{inv.challenges?.title ?? "-"}</Text>
                  <View style={styles.actionRow}>
                    <Pressable style={styles.acceptButton} onPress={() => handleRespond(inv.id, true)}>
                      <Text style={styles.acceptButtonText}>ตอบรับ</Text>
                    </Pressable>
                    <Pressable style={styles.declineButton} onPress={() => handleRespond(inv.id, false)}>
                      <Text style={styles.declineButtonText}>ปฏิเสธ</Text>
                    </Pressable>
                  </View>
                </Card>
              ))}
            </View>
          )}

          {supporting.length > 0 && (
            <View>
              <SectionTitle>👥 คนที่ฉันกำลังซัพพอร์ต</SectionTitle>
              {supporting.map((s) =>
                s.challenges ? (
                  <Card
                    key={s.id}
                    style={styles.supportCard}
                    onPress={() => navigation.navigate("ChallengeDetail", { challengeId: s.challenges!.id })}
                  >
                    <Text style={styles.supportTitle}>{s.challenges.title}</Text>
                    <Text style={styles.supportStatus}>{s.challenges.status}</Text>
                  </Card>
                ) : null
              )}
            </View>
          )}

          <SectionTitle>🧭 ถามชุมชน</SectionTitle>
        </View>
      }
      ListEmptyComponent={
        !loading ? (
          <EmptyState
            emoji="💬"
            title="ยังไม่มีคำถามที่เปิดอยู่"
            subtitle="ถ้าคุณติดอะไรอยู่ ลองโพสต์ถามจากหน้า Challenge ของคุณได้เลย"
          />
        ) : null
      }
      renderItem={({ item }) => (
        <Card
          style={styles.helpCard}
          onPress={() => navigation.navigate("HelpRequestDetail", { helpRequestId: item.id })}
        >
          <Text style={styles.body}>{item.body}</Text>
          <View style={styles.helpMetaRow}>
            <Text style={[styles.badge, item.status === "OPEN" ? styles.badgeOpen : styles.badgeAnswered]}>
              {item.status === "OPEN" ? "รอคำตอบ" : "มีคำตอบแล้ว"}
            </Text>
            <Text style={styles.helpCta}>ไปช่วยตอบ ›</Text>
          </View>
        </Card>
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  list: { width: "100%", maxWidth: layout.maxContent, alignSelf: "center", paddingHorizontal: spacing.lg, paddingBottom: 32, gap: spacing.md },
  header: { fontSize: font.h1, fontWeight: "800", color: colors.text },
  subheader: { fontSize: font.small, color: colors.textMuted, marginTop: 2 },

  challengeInviteCard: {
    backgroundColor: colors.accentSoft,
    borderColor: "#f7cdd5",
    marginBottom: spacing.sm,
  },
  inviteCard: { backgroundColor: colors.amberSoft, borderColor: "#f5e0b5", marginBottom: spacing.sm },
  inviteTitle: { fontWeight: "700", color: colors.text, fontSize: font.body, lineHeight: 22 },
  inviteMessage: { color: colors.textMuted, fontStyle: "italic", marginTop: 6, fontSize: font.small },

  actionRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  acceptButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 11,
    alignItems: "center",
  },
  acceptButtonText: { color: colors.onPrimary, fontWeight: "700", fontSize: font.small },
  declineButton: {
    borderRadius: radius.md,
    paddingVertical: 11,
    paddingHorizontal: 18,
    alignItems: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  declineButtonText: { color: colors.textMuted, fontWeight: "700", fontSize: font.small },

  supportCard: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.sm },
  supportTitle: { fontWeight: "700", color: colors.text },
  supportStatus: { color: colors.textFaint, fontSize: font.small },

  helpCard: { gap: spacing.sm },
  body: { fontSize: font.body, color: colors.text, lineHeight: 22 },
  helpMetaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  badge: {
    fontSize: font.tiny,
    fontWeight: "700",
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
    overflow: "hidden",
  },
  badgeOpen: { backgroundColor: colors.amberSoft, color: colors.amber },
  badgeAnswered: { backgroundColor: colors.primarySoft, color: colors.primaryDark },
  helpCta: { fontSize: font.tiny, color: colors.textMuted, fontWeight: "700" },
});

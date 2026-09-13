import React, { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, RefreshControl, Alert } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootNavigator";

import { useAuth } from "@/providers/AuthProvider";
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
    if (error) Alert.alert("ทำรายการไม่สำเร็จ", error);
    else load();
  }

  async function handleRespondChallengeInvite(inviteId: string, accept: boolean) {
    const { newChallengeId, error } = await respondToChallengeInvite(inviteId, accept);
    if (error) {
      Alert.alert("ทำรายการไม่สำเร็จ", error);
      return;
    }
    if (accept && newChallengeId) {
      navigation.navigate("ChallengeDetail", { challengeId: newChallengeId });
    }
    load();
  }

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={requests}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      ListHeaderComponent={
        <View>
          <Text style={styles.header}>❤️ Community</Text>

          {challengeInvites.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🎯 คำท้าที่ได้รับ</Text>
              {challengeInvites.map((inv) => (
                <View key={inv.id} style={styles.challengeInviteRow}>
                  <Text style={styles.inviteTitle}>
                    {inv.inviter?.display_name ?? "เพื่อน"} ท้าให้ทำ "{inv.challenges?.title ?? "-"}"
                  </Text>
                  {inv.message ? <Text style={styles.inviteMessage}>“{inv.message}”</Text> : null}
                  <View style={{ flexDirection: "row", gap: 12, marginTop: 6 }}>
                    <Pressable onPress={() => handleRespondChallengeInvite(inv.id, true)}>
                      <Text style={styles.acceptText}>🔥 รับคำท้า</Text>
                    </Pressable>
                    <Pressable onPress={() => handleRespondChallengeInvite(inv.id, false)}>
                      <Text style={styles.declineText}>ปฏิเสธ</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}

          {invites.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📬 คำเชิญเป็น Supporter</Text>
              {invites.map((inv) => (
                <View key={inv.id} style={styles.inviteRow}>
                  <Text style={styles.inviteTitle}>{inv.challenges?.title ?? "-"}</Text>
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <Pressable onPress={() => handleRespond(inv.id, true)}>
                      <Text style={styles.acceptText}>ตอบรับ</Text>
                    </Pressable>
                    <Pressable onPress={() => handleRespond(inv.id, false)}>
                      <Text style={styles.declineText}>ปฏิเสธ</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}

          {supporting.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>👥 คนที่ฉันกำลังซัพพอร์ต</Text>
              {supporting.map((s) =>
                s.challenges ? (
                  <Pressable
                    key={s.id}
                    style={styles.supportRow}
                    onPress={() => navigation.navigate("ChallengeDetail", { challengeId: s.challenges!.id })}
                  >
                    <Text style={styles.supportTitle}>{s.challenges.title}</Text>
                    <Text style={styles.supportStatus}>{s.challenges.status}</Text>
                  </Pressable>
                ) : null
              )}
            </View>
          )}

          <Text style={styles.sectionTitle}>🧭 Ask Community</Text>
        </View>
      }
      ListEmptyComponent={!loading ? <Text style={styles.empty}>ยังไม่มีคำถามที่เปิดอยู่</Text> : null}
      renderItem={({ item }) => (
        <Pressable
          style={styles.card}
          onPress={() => navigation.navigate("HelpRequestDetail", { helpRequestId: item.id })}
        >
          <Text style={styles.body}>{item.body}</Text>
          <Text style={styles.cardMeta}>{item.status === "OPEN" ? "รอคำตอบ" : "มีคำตอบแล้ว"}</Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12 },
  header: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  section: { marginBottom: 20, gap: 8 },
  sectionTitle: { fontWeight: "700", marginBottom: 4 },
  inviteRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff7ed",
    borderRadius: 10,
    padding: 12,
  },
  challengeInviteRow: {
    backgroundColor: "#fef2f2",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  inviteMessage: { color: "#666", fontStyle: "italic", marginTop: 4, fontSize: 13 },
  inviteTitle: { flex: 1, fontWeight: "600" },
  acceptText: { color: "#16a34a", fontWeight: "600" },
  declineText: { color: "#e11d48", fontWeight: "600" },
  supportRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f7f7f8",
    borderRadius: 10,
    padding: 12,
  },
  supportTitle: { fontWeight: "600" },
  supportStatus: { color: "#888" },
  card: { backgroundColor: "#f7f7f8", borderRadius: 12, padding: 16, gap: 4 },
  body: { fontSize: 15 },
  cardMeta: { color: "#888", fontSize: 13 },
  empty: { color: "#888", textAlign: "center", marginTop: 40 },
});

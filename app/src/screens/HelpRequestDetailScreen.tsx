import React, { useCallback, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, FlatList, ActivityIndicator } from "react-native";
import { showAlert } from "@/lib/alert";
import { useFocusEffect, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { RootStackParamList } from "@/navigation/RootNavigator";

import { useAuth } from "@/providers/AuthProvider";
import {
  findSuggestedGuides,
  getHelpRequest,
  listRepliesForHelpRequest,
  markReplyHelpful,
  replyToHelpRequest,
} from "@/api/community";
import type { ExpertiseTagRow, HelpReplyRow, HelpRequestRow } from "@/types/database";

type Props = { route: RouteProp<RootStackParamList, "HelpRequestDetail"> };
type GuideRow = ExpertiseTagRow & { profiles: { display_name: string; avatar_url: string | null } | null };

// ฟีเจอร์ 18-19 (FEATURE-REQUIREMENTS.md ข้อ 18-19) — Help Request detail: reply
// (FR18.3) + Community Guide suggestion (FR19.1) — Flow 14-15 ใน USER-FLOWS.md
export default function HelpRequestDetailScreen() {
  const { params } = useRoute<Props["route"]>();
  const { session } = useAuth();

  const [helpRequest, setHelpRequest] = useState<HelpRequestRow | null>(null);
  const [replies, setReplies] = useState<HelpReplyRow[]>([]);
  const [guides, setGuides] = useState<GuideRow[]>([]);
  const [replyBody, setReplyBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { helpRequest: hr } = await getHelpRequest(params.helpRequestId);
    setHelpRequest(hr);

    const { replies: r } = await listRepliesForHelpRequest(params.helpRequestId);
    setReplies(r);

    // FR19.1: แนะนำ Community Guide จาก category ของ Challenge เจ้าของคำถาม
    // (params.category ส่งมาจากหน้าที่ navigate มา ถ้ามี — ไม่บังคับ)
    if (params.category) {
      const { guides: g } = await findSuggestedGuides(params.category);
      setGuides(g);
    }
    setLoading(false);
  }, [params.helpRequestId, params.category]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleReply() {
    if (!session?.user || !replyBody.trim()) return;
    setSubmitting(true);
    const { error } = await replyToHelpRequest(params.helpRequestId, session.user.id, replyBody.trim());
    setSubmitting(false);
    if (error) {
      showAlert("ตอบไม่สำเร็จ", error);
      return;
    }
    setReplyBody("");
    load();
  }

  async function handleMarkHelpful(replyId: string) {
    const { error } = await markReplyHelpful(replyId);
    if (error) showAlert("ทำไม่สำเร็จ", error);
    else load();
  }

  if (loading || !helpRequest) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <FlatList
      contentContainerStyle={styles.container}
      data={replies}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View>
          <View style={styles.questionCard}>
            <Text style={styles.questionBody}>{helpRequest.body}</Text>
            <Text style={styles.questionMeta}>
              {helpRequest.visibility === "COMMUNITY" ? "🌍 เปิดให้ Community" : "👥 Supporters เท่านั้น"} ·{" "}
              {helpRequest.status === "OPEN" ? "รอคำตอบ" : "มีคำตอบแล้ว"}
            </Text>
          </View>

          {guides.length > 0 && (
            <View style={styles.guideSection}>
              <Text style={styles.sectionTitle}>🧭 Community Guide ที่อาจช่วยได้</Text>
              {guides.map((g) => (
                <View key={g.id} style={styles.guideRow}>
                  <Text style={styles.guideName}>{g.profiles?.display_name ?? "ผู้ใช้"}</Text>
                  <Text style={styles.guideLabel}>{g.label}</Text>
                </View>
              ))}
            </View>
          )}

          <Text style={styles.sectionTitle}>💬 คำตอบ ({replies.length})</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.replyCard}>
          <Text style={styles.replyBody}>{item.body}</Text>
          <Pressable onPress={() => handleMarkHelpful(item.id)} disabled={item.marked_helpful}>
            <Text style={item.marked_helpful ? styles.helpfulActive : styles.helpfulAction}>
              {item.marked_helpful ? "✓ ช่วยได้จริง" : "ทำเครื่องหมายว่าช่วยได้"}
            </Text>
          </Pressable>
        </View>
      )}
      ListEmptyComponent={<Text style={styles.empty}>ยังไม่มีคำตอบ — เป็นคนแรกที่ช่วยไหม?</Text>}
      ListFooterComponent={
        <View style={styles.replyBox}>
          <TextInput
            style={styles.input}
            placeholder="เขียนคำตอบของคุณ..."
            value={replyBody}
            onChangeText={setReplyBody}
            multiline
          />
          <Pressable style={styles.primaryButton} onPress={handleReply} disabled={submitting}>
            <Text style={styles.primaryButtonText}>{submitting ? "กำลังส่ง..." : "ส่งคำตอบ"}</Text>
          </Pressable>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 12 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  questionCard: { backgroundColor: "#fff7e6", borderRadius: 12, padding: 16 },
  questionBody: { fontSize: 16 },
  questionMeta: { color: "#6b7f70", marginTop: 8, fontSize: 13 },
  guideSection: { marginTop: 16 },
  sectionTitle: { fontWeight: "700", marginTop: 16, marginBottom: 8 },
  guideRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  guideName: { fontWeight: "600" },
  guideLabel: { color: "#6b7f70" },
  replyCard: { backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#e7ede8", borderRadius: 12, padding: 14, marginBottom: 8 },
  replyBody: { fontSize: 15 },
  helpfulAction: { color: "#6b7f70", marginTop: 8, fontSize: 13 },
  helpfulActive: { color: "#2f9e4f", marginTop: 8, fontSize: 13, fontWeight: "600" },
  empty: { color: "#6b7f70", textAlign: "center", marginVertical: 16 },
  replyBox: { marginTop: 16, gap: 8 },
  input: { borderWidth: 1, borderColor: "#e7ede8", borderRadius: 8, padding: 12, minHeight: 80, textAlignVertical: "top" },
  primaryButton: { backgroundColor: "#e8415a", borderRadius: 8, padding: 14 },
  primaryButtonText: { color: "white", textAlign: "center", fontWeight: "600" },
});

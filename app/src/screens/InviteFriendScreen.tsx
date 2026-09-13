import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  FlatList,
  Alert,
  Platform,
  Share,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { RootStackParamList } from "@/navigation/RootNavigator";

import { useAuth } from "@/providers/AuthProvider";
import { getWebBaseUrl } from "@/lib/config";
import {
  buildInviteShareUrl,
  getMyChallengeInviteToken,
  inviteFriendToChallenge,
  searchUsersByName,
} from "@/api/invites";

type Props = { route: RouteProp<RootStackParamList, "InviteFriend"> };

// ฟีเจอร์ใหม่ตาม feedback ของผู้ใช้ — "ท้าเพื่อน" ทั้งสองแบบในหน้าเดียว:
//  1) ชวนเพื่อนที่มีบัญชีในระบบแล้ว (ค้นหาแล้วกดชวน)
//  2) แชร์ลิงก์สาธารณะ (โพสต์ Facebook/Messenger/ฯลฯ ได้เลย)
export default function InviteFriendScreen() {
  const { params } = useRoute<Props["route"]>();
  const { session } = useAuth();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; display_name: string; avatar_url: string | null }[]>([]);
  const [message, setMessage] = useState("");
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [invitedIds, setInvitedIds] = useState<string[]>([]);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [linkBusy, setLinkBusy] = useState(false);

  const loadToken = useCallback(async () => {
    const { token } = await getMyChallengeInviteToken(params.challengeId);
    if (token) setShareUrl(buildInviteShareUrl(getWebBaseUrl(), token));
  }, [params.challengeId]);

  useEffect(() => {
    loadToken();
  }, [loadToken]);

  async function handleSearch(text: string) {
    setQuery(text);
    if (!session?.user) return;
    const { users } = await searchUsersByName(text, session.user.id);
    setResults(users);
  }

  async function handleInvite(userId: string) {
    setBusyUserId(userId);
    const { error } = await inviteFriendToChallenge(params.challengeId, userId, message.trim() || undefined);
    setBusyUserId(null);
    if (error) {
      Alert.alert("ชวนไม่สำเร็จ", error);
      return;
    }
    setInvitedIds((prev) => [...prev, userId]);
    Alert.alert("🎯 ส่งคำท้าแล้ว!", "เพื่อนจะเห็นคำเชิญนี้ในแท็บ Community");
  }

  async function handleShareLink() {
    if (!shareUrl) return;
    setLinkBusy(true);
    const text = `🎯 ท้าให้มาทำ Challenge นี้ด้วยกัน! เปิดลิงก์นี้แล้วรับคำท้าได้เลย:\n${shareUrl}`;
    try {
      if (Platform.OS === "web") {
        const nav = typeof navigator !== "undefined" ? (navigator as any) : null;
        if (nav?.share) {
          await nav.share({ title: "Challenge Me", text, url: shareUrl });
        } else if (nav?.clipboard?.writeText) {
          await nav.clipboard.writeText(shareUrl);
          Alert.alert("คัดลอกลิงก์แล้ว", "วางลิงก์นี้ตอนโพสต์ลง Facebook แล้วพิมพ์ @แท็กเพื่อนที่อยากท้าได้เลย");
        }
      } else {
        await Share.share({ message: text, url: shareUrl });
      }
    } catch {
      // ผู้ใช้กดยกเลิกกล่องแชร์ — ไม่ต้องแจ้ง error
    }
    setLinkBusy(false);
  }

  function handleOpenFacebookSharer() {
    if (!shareUrl) return;
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.open(fbUrl, "_blank", "noopener,noreferrer");
    } else {
      Share.share({ message: fbUrl, url: fbUrl });
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>🔗 แชร์ลิงก์ท้าเพื่อน</Text>
      <Text style={styles.hint}>
        ใครก็กดลิงก์นี้แล้วรับคำท้าได้เลย แม้ยังไม่เคยใช้แอป — เหมาะกับการโพสต์ลง Facebook
        แล้วพิมพ์ @แท็กชื่อเพื่อนที่อยากชวนเอง
      </Text>
      {shareUrl && (
        <View style={styles.linkBox}>
          <Text style={styles.linkText} numberOfLines={1}>
            {shareUrl}
          </Text>
        </View>
      )}
      <View style={styles.row}>
        <Pressable style={[styles.primaryButton, styles.flex1]} onPress={handleShareLink} disabled={linkBusy || !shareUrl}>
          <Text style={styles.primaryButtonText}>📤 แชร์ลิงก์</Text>
        </Pressable>
        <Pressable style={[styles.fbButton, styles.flex1]} onPress={handleOpenFacebookSharer} disabled={!shareUrl}>
          <Text style={styles.fbButtonText}>📘 โพสต์ลง Facebook</Text>
        </Pressable>
      </View>

      <View style={styles.divider} />

      <Text style={styles.sectionTitle}>👤 ชวนเพื่อนที่มีบัญชีอยู่แล้ว</Text>
      <TextInput
        style={styles.input}
        placeholder="พิมพ์ชื่อเพื่อนในแอป..."
        value={query}
        onChangeText={handleSearch}
      />
      <TextInput
        style={[styles.input, styles.messageInput]}
        placeholder="ข้อความท้าทาย (ไม่บังคับ) เช่น สู้ๆ นะ ท้าทำด้วยกัน!"
        value={message}
        onChangeText={setMessage}
        multiline
      />

      <FlatList
        style={{ marginTop: 12 }}
        data={results}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          query.trim() ? <Text style={styles.empty}>ไม่พบชื่อนี้ในระบบ</Text> : null
        }
        renderItem={({ item }) => {
          const invited = invitedIds.includes(item.id);
          return (
            <View style={styles.userRow}>
              <Text style={styles.userName}>{item.display_name}</Text>
              <Pressable
                style={[styles.inviteButton, invited && styles.inviteButtonDone]}
                onPress={() => handleInvite(item.id)}
                disabled={invited || busyUserId === item.id}
              >
                <Text style={styles.inviteButtonText}>{invited ? "✓ ส่งแล้ว" : "🎯 ท้า"}</Text>
              </Pressable>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginTop: 8 },
  hint: { color: "#666", fontSize: 13, marginTop: 4, marginBottom: 12, lineHeight: 18 },
  linkBox: { backgroundColor: "#f7f7f8", borderRadius: 8, padding: 12, marginBottom: 12 },
  linkText: { color: "#333", fontSize: 13 },
  row: { flexDirection: "row", gap: 10 },
  flex1: { flex: 1 },
  primaryButton: { backgroundColor: "#e11d48", borderRadius: 8, padding: 12 },
  primaryButtonText: { color: "white", textAlign: "center", fontWeight: "700" },
  fbButton: { backgroundColor: "#1877F2", borderRadius: 8, padding: 12 },
  fbButtonText: { color: "white", textAlign: "center", fontWeight: "700" },
  divider: { height: 1, backgroundColor: "#eee", marginVertical: 24 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12, backgroundColor: "white" },
  messageInput: { marginTop: 10, minHeight: 60, textAlignVertical: "top" },
  empty: { color: "#888", marginTop: 16, textAlign: "center" },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  userName: { fontSize: 15, fontWeight: "600" },
  inviteButton: { backgroundColor: "#e11d48", borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14 },
  inviteButtonDone: { backgroundColor: "#bbb" },
  inviteButtonText: { color: "white", fontWeight: "700", fontSize: 13 },
});

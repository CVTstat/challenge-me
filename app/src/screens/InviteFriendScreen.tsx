import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  FlatList,
  Platform,
  Share,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { RootStackParamList } from "@/navigation/RootNavigator";

import { useAuth } from "@/providers/AuthProvider";
import { getWebBaseUrl } from "@/lib/config";
import { showAlert } from "@/lib/alert";
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
      showAlert("ชวนไม่สำเร็จ", error);
      return;
    }
    setInvitedIds((prev) => [...prev, userId]);
    showAlert("🎯 ส่งคำท้าแล้ว!", "เพื่อนจะเห็นคำเชิญนี้ในแท็บ Community");
  }

  // ตามที่ผู้ใช้ขอ: เปลี่ยนปุ่มนี้จาก "แชร์ลิงก์" (เด้งเมนูแชร์ของเครื่อง) เป็น
  // "คัดลอกลิงก์" ตรง ๆ — ผู้ใช้เอาไปวางเองในช่องทางไหนก็ได้ตามใจ ไม่ต้องเดา
  // ว่าแต่ละแอปจะจัดการยังไง (บั๊กเรื่องลิงก์ซ้ำ/พรีวิวไม่ขึ้นที่เคยเจอกับ
  // LINE จะไม่มีทางเกิดอีกเลย เพราะผู้ใช้เป็นคนวางลิงก์ล้วน ๆ เองตรง ๆ)
  async function handleCopyLink() {
    if (!shareUrl) return;
    setLinkBusy(true);
    try {
      if (Platform.OS === "web") {
        const nav = typeof navigator !== "undefined" ? (navigator as any) : null;
        if (nav?.clipboard?.writeText) {
          await nav.clipboard.writeText(shareUrl);
        } else {
          throw new Error("no clipboard api");
        }
      } else {
        await Clipboard.setStringAsync(shareUrl);
      }
      showAlert("คัดลอกลิงก์แล้ว", "วางลิงก์นี้ในแอปที่อยากแชร์ได้เลย เช่น Facebook, LINE, Messenger");
    } catch {
      showAlert("คัดลอกไม่สำเร็จ", "ลองแตะค้างที่ลิงก์ด้านบนแล้วคัดลอกเองได้เลยครับ");
    }
    setLinkBusy(false);
  }

  async function handleShareToSocial() {
    if (!shareUrl) return;
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    const caption = "🎯 ท้าให้มาทำ Challenge นี้ด้วยกัน! เปิดลิงก์นี้แล้วรับคำท้าได้เลย";
    // หมายเหตุ (แก้บั๊ก): บนมือถือที่ลง Facebook app ไว้ การเปิด
    // facebook.com/sharer/sharer.php ด้วย window.open() จะโดน iOS/Android
    // "universal link" ดักไปเปิดแอป Facebook เฉย ๆ (เข้าหน้า feed ปกติ) โดย
    // ไม่มีกล่องโพสต์/พรีวิวขึ้นมาให้เลย — ต่างจากเดสก์ท็อป (ไม่มีแอปให้ดัก)
    // ที่กล่อง sharer.php เด้งขึ้นมาใช้งานได้ปกติ
    //
    // ทางแก้: ให้พยายามใช้ Web Share API (navigator.share) ก่อนเสมอเมื่อมี —
    // มันจะเปิด "share sheet" ของระบบปฏิบัติการเอง ให้ผู้ใช้เลือกแอปที่จะโพสต์
    // ได้เอง (Facebook, LINE, IG, ฯลฯ) — เหมาะกับปุ่มนี้ที่เปลี่ยนชื่อเป็น
    // "โพสต์ลง Social ของคุณ" (ไม่ผูกกับ Facebook แอปเดียวอีกต่อไป) และเป็น
    // กลไกเดียวกับที่ยืนยันแล้วว่าใช้งานได้จริงกับ LINE — เหลือ
    // window.open(sharer.php) ไว้เป็น fallback สำหรับกรณีที่ไม่มี
    // navigator.share เท่านั้น (ส่วนใหญ่คือเดสก์ท็อป ซึ่งจะพาไปที่ Facebook
    // โดยตรง เพราะเดสก์ท็อปเบราว์เซอร์ส่วนใหญ่ไม่มี share sheet ของระบบให้เลือก)
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const nav = typeof navigator !== "undefined" ? (navigator as any) : null;
      if (nav?.share) {
        try {
          await nav.share({ title: "Challenge Me", text: caption, url: shareUrl });
          return;
        } catch {
          // ผู้ใช้กดยกเลิก share sheet — ไม่ต้องทำอะไรต่อ (ไม่ fallback ไป
          // เปิด sharer.php ซ้ำ เดี๋ยวจะงงว่าทำไมมีอะไรเด้งขึ้นมาอีก)
          return;
        }
      }
      window.open(fbUrl, "_blank", "noopener,noreferrer");
    } else if (Platform.OS === "ios") {
      try {
        await Share.share({ message: caption, url: shareUrl });
      } catch {
        // ผู้ใช้กดยกเลิกกล่องแชร์
      }
    } else {
      try {
        await Share.share({ message: `${caption}\n${shareUrl}` });
      } catch {
        // ผู้ใช้กดยกเลิกกล่องแชร์
      }
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
        <Pressable style={[styles.primaryButton, styles.flex1]} onPress={handleCopyLink} disabled={linkBusy || !shareUrl}>
          <Text style={styles.primaryButtonText}>📋 คัดลอกลิงก์</Text>
        </Pressable>
        <Pressable style={[styles.socialButton, styles.flex1]} onPress={handleShareToSocial} disabled={!shareUrl}>
          <Text style={styles.socialButtonText}>📱 โพสต์ลง Social ของคุณ</Text>
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
  socialButton: { backgroundColor: "#333844", borderRadius: 8, padding: 12 },
  socialButtonText: { color: "white", textAlign: "center", fontWeight: "700" },
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

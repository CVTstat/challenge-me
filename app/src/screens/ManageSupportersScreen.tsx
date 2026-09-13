import React, { useCallback, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, FlatList } from "react-native";
import { showAlert } from "@/lib/alert";
import { useFocusEffect, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";

import type { RootStackParamList } from "@/navigation/RootNavigator";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import { inviteSupporter, listSupportersForChallenge, muteSupporter, removeSupporter } from "@/api/supporters";
import type { SupporterRow } from "@/types/database";

type SupporterWithProfile = SupporterRow & { profiles: { display_name: string; avatar_url: string | null } | null };

// Flow 8 (USER-FLOWS.md §8) — Manage Supporters (FR11.1, FR11.4)
export default function ManageSupportersScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, "ManageSupporters">>();
  const { session } = useAuth();
  const [supporters, setSupporters] = useState<SupporterWithProfile[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const { supporters: rows } = await listSupportersForChallenge(params.challengeId);
    setSupporters(rows);
  }, [params.challengeId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleInvite() {
    if (!session?.user || !inviteEmail.trim()) return;
    setSubmitting(true);

    // หา user ปลายทางจากอีเมล — ใน production จริงควรทำผ่าน Edge Function ที่มี
    // service role (ตาราง auth.users ไม่เปิดให้ query ตรงจาก client ทั่วไป)
    // ที่นี่ใช้ RPC ไปหาใน profiles แทน โดยสมมติว่า client เก็บอีเมลไว้ที่อื่น
    // (เช่น query ผ่าน view ที่ backend เตรียมไว้) — ใส่ placeholder ให้ dev ต่อเอง
    showAlert(
      "ต้องต่อ backend เพิ่ม",
      "การค้นหา user จากอีเมลต้องทำผ่าน Edge Function (service role) — ดูคอมเมนต์ในโค้ดนี้สำหรับรายละเอียด " +
        "ตอนนี้ใส่ user id ตรง ๆ แทนได้ถ้าต้องการทดสอบ"
    );
    setSubmitting(false);
  }

  /** เชิญโดยใส่ user id ตรง ๆ (สำหรับทดสอบ/เดโม ก่อนต่อ Edge Function ค้นหาอีเมลจริง) */
  async function handleInviteByUserId(userId: string) {
    if (!session?.user) return;
    setSubmitting(true);
    const { error } = await inviteSupporter(params.challengeId, session.user.id, userId);
    setSubmitting(false);
    if (error) showAlert("เชิญไม่สำเร็จ", error);
    else {
      setInviteEmail("");
      load();
    }
  }

  async function handleRemove(supporterId: string) {
    const { error } = await removeSupporter(supporterId);
    if (error) showAlert("ลบไม่สำเร็จ", error);
    else load();
  }

  async function handleMute(supporterId: string) {
    const { error } = await muteSupporter(supporterId);
    if (error) showAlert("Mute ไม่สำเร็จ", error);
    else load();
  }

  const statusLabel: Record<string, string> = {
    INVITED: "รอตอบรับ",
    ACTIVE: "Active",
    MUTED: "ปิดเสียงแล้ว",
    REMOVED: "ถูกลบแล้ว",
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>เชิญด้วย User ID (เดโม)</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="user-id ของ Supporter"
          value={inviteEmail}
          onChangeText={setInviteEmail}
        />
        <Pressable
          style={styles.primaryButton}
          onPress={() => handleInviteByUserId(inviteEmail.trim())}
          disabled={submitting || !inviteEmail.trim()}
        >
          <Text style={styles.primaryButtonText}>+ เชิญ</Text>
        </Pressable>
      </View>

      <FlatList
        style={{ marginTop: 16 }}
        data={supporters}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.profiles?.display_name ?? item.user_id}</Text>
              <Text style={styles.status}>{statusLabel[item.status] ?? item.status}</Text>
            </View>
            {item.status === "ACTIVE" && (
              <>
                <Pressable onPress={() => handleMute(item.id)}>
                  <Text style={styles.action}>ปิดเสียง</Text>
                </Pressable>
                <Pressable onPress={() => handleRemove(item.id)}>
                  <Text style={[styles.action, { color: "#e8415a" }]}>ลบ</Text>
                </Pressable>
              </>
            )}
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>ยังไม่มี Supporter</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  label: { fontWeight: "600", marginBottom: 4 },
  input: { borderWidth: 1, borderColor: "#e7ede8", borderRadius: 8, padding: 10 },
  primaryButton: { backgroundColor: "#e8415a", borderRadius: 8, paddingHorizontal: 16, justifyContent: "center" },
  primaryButtonText: { color: "white", fontWeight: "600" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderColor: "#e7ede8" },
  name: { fontWeight: "600" },
  status: { color: "#6b7f70", fontSize: 13 },
  action: { color: "#6b7f70", fontWeight: "600" },
  empty: { color: "#6b7f70", textAlign: "center", marginTop: 24 },
});

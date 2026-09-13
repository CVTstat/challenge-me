import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootNavigator";

import { useAuth } from "@/providers/AuthProvider";
import { usePendingInvite } from "@/providers/PendingInviteProvider";
import { acceptChallengeInviteByToken, getInvitePreview } from "@/api/invites";
import type { InvitePreview } from "@/types/database";

// หน้าแลนดิ้งตอนมีคนกดลิงก์ "ท้าเพื่อน" — ใช้ทั้งตอน login แล้วและยังไม่ login
// (ถูก mount จาก RootNavigator ทั้งฝั่ง Auth stack และ Main stack)
export default function InviteLandingScreen() {
  const { token, clear } = usePendingInvite();
  const { session } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList & { Login: undefined; Register: undefined }>>();

  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { preview: p, error } = await getInvitePreview(token);
    setLoading(false);
    if (error || !p) {
      setNotFound(true);
      return;
    }
    setPreview(p);
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAccept() {
    if (!token) return;
    if (!session?.user) {
      navigation.navigate("Register" as never);
      return;
    }
    setBusy(true);
    const { challengeId, error } = await acceptChallengeInviteByToken(token);
    setBusy(false);
    if (error) {
      Alert.alert("รับคำท้าไม่สำเร็จ", error);
      return;
    }
    clear();
    if (challengeId) {
      navigation.reset({
        index: 1,
        routes: [{ name: "MainTabs" as never }, { name: "ChallengeDetail" as never, params: { challengeId } as never }],
      });
    } else {
      navigation.navigate("MainTabs" as never);
    }
  }

  function handleSkip() {
    clear();
    navigation.navigate((session?.user ? "MainTabs" : "Login") as never);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (notFound || !preview) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>ลิงก์คำท้านี้ไม่พร้อมใช้งานแล้ว</Text>
        <Pressable style={styles.primaryButton} onPress={handleSkip}>
          <Text style={styles.primaryButtonText}>ไปที่แอป</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.badge}>🎯 คำท้าจาก {preview.inviter_display_name}</Text>
      <Text style={styles.title}>{preview.title}</Text>
      <Text style={styles.goal}>{preview.goal_description}</Text>
      {preview.reward_text ? <Text style={styles.reward}>🎁 {preview.reward_text}</Text> : null}

      <Pressable style={styles.primaryButton} onPress={handleAccept} disabled={busy}>
        <Text style={styles.primaryButtonText}>
          {session?.user ? "🔥 รับคำท้า — เริ่มทำเลย" : "สมัครสมาชิกเพื่อรับคำท้า"}
        </Text>
      </Pressable>
      <Pressable style={styles.secondaryButton} onPress={handleSkip}>
        <Text style={styles.secondaryButtonText}>ไว้ก่อน</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center", gap: 12 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 24 },
  badge: { color: "#e11d48", fontWeight: "700" },
  title: { fontSize: 24, fontWeight: "700", textAlign: "center" },
  goal: { fontSize: 16, color: "#555" },
  reward: { fontSize: 14, color: "#b45309" },
  primaryButton: { backgroundColor: "#e11d48", borderRadius: 8, padding: 16, marginTop: 20 },
  primaryButtonText: { color: "white", textAlign: "center", fontWeight: "700", fontSize: 16 },
  secondaryButton: { padding: 12 },
  secondaryButtonText: { color: "#888", textAlign: "center" },
});

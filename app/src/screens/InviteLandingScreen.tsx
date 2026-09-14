import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { showAlert } from "@/lib/alert";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootNavigator";

import { useAuth } from "@/providers/AuthProvider";
import { usePendingInvite } from "@/providers/PendingInviteProvider";
import { acceptChallengeInviteByToken, getInvitePreview } from "@/api/invites";
import LineLoginButton from "@/components/LineLoginButton";
import { isLineConfigured } from "@/lib/liff";
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
      showAlert("รับคำท้าไม่สำเร็จ", error);
      return;
    }
    clear();
    // หมายเหตุ: ตั้งแต่เปลี่ยนโครงสร้างให้แถบแท็บโชว์ทุกหน้า (ดู RootNavigator)
    // หน้านี้จะอยู่ "ข้างใน" stack ของแท็บที่กำลังใช้อยู่ ไม่ใช่ stack แยกที่ทับ
    // ทั้งจอเหมือนเดิม — จึงใช้ replace/popToTop กับ stack ปัจจุบันแทนการ reset
    // ไปที่ route ชื่อ MainTabs (ซึ่งไม่มีอยู่แล้ว) แถบแท็บจะได้ไม่หายไป
    if (challengeId) {
      navigation.replace("ChallengeDetail", { challengeId });
    } else {
      navigation.popToTop();
    }
  }

  function handleSkip() {
    clear();
    if (session?.user) {
      // กลับไปหน้าแรกของแท็บที่กำลังอยู่ (แถบแท็บยังอยู่ครบ)
      navigation.popToTop();
      return;
    }
    navigation.navigate("Login" as never);
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
      <Text style={styles.badge}>🌱 คำท้าจาก {preview.inviter_display_name}</Text>
      <Text style={styles.title}>{preview.title}</Text>
      <Text style={styles.goal}>{preview.goal_description}</Text>
      {preview.reward_text ? <Text style={styles.reward}>🎁 {preview.reward_text}</Text> : null}

      {/* คนที่กดลิงก์นี้เข้ามาส่วนใหญ่ยังไม่เคยใช้แอป และมักกดมาจากในแอป LINE
          หรือ Facebook — ถ้าให้เจอฟอร์มอีเมล/รหัสผ่านทันทีจะหลุดไปเกือบหมด
          จึงเอา "เข้าร่วมด้วย LINE" ขึ้นเป็นปุ่มแรก แล้วค่อยมีทางอีเมลรองไว้
          (autoTry ปิดไว้ เพราะหน้านี้ต้องให้เขาได้อ่านคำท้าก่อน ไม่ใช่โดน
          เด้งไปล็อกอินตั้งแต่ยังไม่ทันเห็นว่าใครท้าอะไร) */}
      {session?.user ? (
        <Pressable style={styles.primaryButton} onPress={handleAccept} disabled={busy}>
          <Text style={styles.primaryButtonText}>🌱 รับคำท้า — เริ่มปลูกเลย</Text>
        </Pressable>
      ) : (
        <>
          <LineLoginButton label="เข้าร่วมด้วย LINE" autoTry={false} />
          <Pressable
            style={isLineConfigured() ? styles.secondaryButton : styles.primaryButton}
            onPress={handleAccept}
          >
            <Text style={isLineConfigured() ? styles.secondaryButtonText : styles.primaryButtonText}>
              {isLineConfigured() ? "หรือสมัครด้วยอีเมล" : "สมัครสมาชิกเพื่อรับคำท้า"}
            </Text>
          </Pressable>
        </>
      )}
      <Pressable style={styles.secondaryButton} onPress={handleSkip}>
        <Text style={styles.secondaryButtonText}>ไว้ก่อน</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center", gap: 12 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 24 },
  badge: { color: "#e8415a", fontWeight: "700" },
  title: { fontSize: 24, fontWeight: "700", textAlign: "center" },
  goal: { fontSize: 16, color: "#6b7f70" },
  reward: { fontSize: 14, color: "#f59e0b" },
  primaryButton: { backgroundColor: "#e8415a", borderRadius: 8, padding: 16, marginTop: 20 },
  primaryButtonText: { color: "white", textAlign: "center", fontWeight: "700", fontSize: 16 },
  secondaryButton: { padding: 12 },
  secondaryButtonText: { color: "#6b7f70", textAlign: "center" },
});

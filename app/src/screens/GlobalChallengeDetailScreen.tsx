import React, { useCallback, useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator, Switch } from "react-native";
import { showAlert } from "@/lib/alert";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import type { RootStackParamList } from "@/navigation/RootNavigator";

import { useAuth } from "@/providers/AuthProvider";
import { getGlobalChallenge, joinGlobalChallenge } from "@/api/globalChallenge";
import type { GlobalChallengeRow } from "@/types/database";

type Props = { route: RouteProp<RootStackParamList, "GlobalChallengeDetail"> };

// ฟีเจอร์ 20 (FEATURE-REQUIREMENTS.md ข้อ 20) — Global Challenge detail + Join
// Flow 16 ใน USER-FLOWS.md — ต้องกด consent ก่อนเสมอ (FR20.3)
export default function GlobalChallengeDetailScreen() {
  const { params } = useRoute<Props["route"]>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { session } = useAuth();

  const [globalChallenge, setGlobalChallenge] = useState<GlobalChallengeRow | null>(null);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { globalChallenge: gc } = await getGlobalChallenge(params.globalChallengeId);
    setGlobalChallenge(gc);
    setLoading(false);
  }, [params.globalChallengeId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleJoin() {
    if (!session?.user || !globalChallenge) return;
    // FR20.3: ต้องยอมรับเงื่อนไข (consent) ก่อนจะ join ได้เสมอ
    if (!consentAccepted) {
      showAlert("ยอมรับเงื่อนไขก่อน", "กรุณายอมรับเงื่อนไขการเข้าร่วมก่อนกดเข้าร่วม Challenge");
      return;
    }
    setJoining(true);
    const { challengeId, error } = await joinGlobalChallenge(params.globalChallengeId, session.user.id);
    setJoining(false);

    if (error || !challengeId) {
      showAlert("เข้าร่วมไม่สำเร็จ", error ?? "ลองใหม่อีกครั้ง");
      return;
    }

    navigation.replace("ChallengeDetail", { challengeId });
  }

  if (loading || !globalChallenge) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const quotaFull =
    globalChallenge.has_limited_daruma &&
    (globalChallenge.limited_daruma_claimed ?? 0) >= (globalChallenge.limited_daruma_total ?? 0);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{globalChallenge.title}</Text>
      <Text style={styles.description}>{globalChallenge.description}</Text>
      <Text style={styles.goal}>🎯 {globalChallenge.goal_description}</Text>
      <Text style={styles.reward}>🎁 {globalChallenge.reward_text}</Text>

      {globalChallenge.has_limited_daruma && (
        <Text style={styles.limited}>
          🍃 ใบไม้พิเศษ (Limited) {globalChallenge.limited_daruma_claimed}/{globalChallenge.limited_daruma_total}
          {quotaFull ? " — เต็มโควต้าแล้ว" : ""}
        </Text>
      )}

      <View style={styles.consentBox}>
        <Text style={styles.consentText}>
          ฉันยอมรับเงื่อนไขการเข้าร่วม Global Challenge นี้ และเข้าใจว่า Challenge นี้อาจแชร์ข้อมูลความคืบหน้าให้ผู้สนับสนุน
          {globalChallenge.terms_url ? ` (${globalChallenge.terms_url})` : ""}
        </Text>
        <Switch value={consentAccepted} onValueChange={setConsentAccepted} />
      </View>

      <Pressable
        style={[styles.primaryButton, (quotaFull || joining) && styles.primaryButtonDisabled]}
        onPress={handleJoin}
        disabled={quotaFull || joining}
      >
        <Text style={styles.primaryButtonText}>
          {quotaFull ? "เต็มโควต้าแล้ว" : joining ? "กำลังเข้าร่วม..." : "🔴 เข้าร่วม Challenge นี้"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 8 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "700" },
  description: { color: "#555", marginTop: 4 },
  goal: { marginTop: 12, fontSize: 15 },
  reward: { color: "#b45309", marginTop: 4 },
  limited: { color: "#e11d48", marginTop: 8, fontWeight: "600" },
  consentBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 24,
    backgroundColor: "#f7f7f8",
    borderRadius: 12,
    padding: 14,
  },
  consentText: { flex: 1, fontSize: 13, color: "#444" },
  primaryButton: { backgroundColor: "#e11d48", borderRadius: 8, padding: 14, marginTop: 20 },
  primaryButtonDisabled: { opacity: 0.5 },
  primaryButtonText: { color: "white", textAlign: "center", fontWeight: "700", fontSize: 16 },
});

import React, { useCallback, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { showAlert } from "@/lib/alert";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";

import type { RootStackParamList } from "@/navigation/RootNavigator";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { fillFirstEye, fillSecondEye, submitCheckIn, toggleCheer } from "@/api/challenges";
import { completeMilestone, computeJourneyProgressPct, listMilestones } from "@/api/lifeChallenge";
import { getChallengeProgress } from "@/api/progress";
import type { ProgressSummary } from "@/api/progress";
import { acknowledgeImBack, pushChallenge } from "@/api/push";
import { generateAndShareCard } from "@/api/share";
import { changeGoal, extendChallenge, tryAgain } from "@/api/notYet";
import type { ChallengeAttemptRow, ChallengeRow, DarumaRow, MilestoneRow } from "@/types/database";

type Props = { route: RouteProp<RootStackParamList, "ChallengeDetail"> };

// รวม Flow 4 (First-Eye Ritual), Flow 5 (Check-in), Flow 6 (Milestones/Life),
// Flow 7 (Cheer), Flow 8 (Supporters entry), Flow 9 (Progress), Flow 10
// (Push/Rescue), Flow 11 (Completion/Second-Eye), Flow 13 (Not Yet), Flow 14
// (Ask for Help entry) ไว้ในหน้าเดียวกัน เพราะทั้งหมดอยู่บน [Challenge Home]
// เดียวกันตาม USER-FLOWS.md
export default function ChallengeDetailScreen() {
  const { params } = useRoute<Props["route"]>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { session } = useAuth();

  const [challenge, setChallenge] = useState<ChallengeRow | null>(null);
  const [daruma, setDaruma] = useState<DarumaRow | null>(null);
  const [attempt, setAttempt] = useState<ChallengeAttemptRow | null>(null);
  const [cheerCount, setCheerCount] = useState(0);
  const [milestones, setMilestones] = useState<MilestoneRow[]>([]);
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [changeGoalMode, setChangeGoalMode] = useState(false);
  const [newGoalText, setNewGoalText] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: challengeRow }, { data: darumaRow }, { data: attemptRow }, { count }] = await Promise.all([
      supabase.from("challenges").select("*").eq("id", params.challengeId).single(),
      supabase
        .from("daruma")
        .select("*")
        .eq("challenge_id", params.challengeId)
        .order("created_at", { ascending: true })
        .limit(1)
        .single(),
      supabase
        .from("challenge_attempts")
        .select("*")
        .eq("challenge_id", params.challengeId)
        .order("attempt_number", { ascending: false })
        .limit(1)
        .single(),
      supabase.from("cheers").select("id", { count: "exact", head: true }).eq("challenge_id", params.challengeId),
    ]);

    setChallenge(challengeRow as ChallengeRow);
    setDaruma(darumaRow as DarumaRow);
    setAttempt(attemptRow as ChallengeAttemptRow);
    setCheerCount(count ?? 0);

    if (challengeRow && (challengeRow as ChallengeRow).type === "LIFE") {
      const { milestones: ms } = await listMilestones(params.challengeId);
      setMilestones(ms);
    } else {
      setMilestones([]);
    }

    if (challengeRow && attemptRow) {
      const { summary } = await getChallengeProgress(
        challengeRow as ChallengeRow,
        (attemptRow as ChallengeAttemptRow).id,
        (attemptRow as ChallengeAttemptRow).best_streak
      );
      setProgress(summary);
    }

    setLoading(false);
  }, [params.challengeId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleFillFirstEye() {
    setBusy(true);
    const { error } = await fillFirstEye(params.challengeId);
    setBusy(false);
    if (error) showAlert("เติมตาแรกไม่สำเร็จ", error);
    else {
      if (challenge) await generateAndShareCard(challenge, "START");
      load();
    }
  }

  async function handleFillSecondEye() {
    setBusy(true);
    const { error } = await fillSecondEye(params.challengeId);
    setBusy(false);
    if (error) showAlert("เติมตาที่สองไม่สำเร็จ", error);
    else {
      if (challenge) await generateAndShareCard(challenge, "COMPLETE");
      load();
    }
  }

  async function handleCheckIn() {
    if (!attempt) return;
    setBusy(true);
    const { error } = await submitCheckIn({ challengeAttemptId: attempt.id, valueBool: true });
    setBusy(false);
    if (error) showAlert("Check-in ไม่สำเร็จ", error);
    else {
      showAlert("✓ Check-in วันนี้บันทึกแล้ว");
      load();
    }
  }

  async function handleCheer() {
    if (!session?.user) return;
    const { error } = await toggleCheer(params.challengeId, session.user.id);
    if (error) showAlert("Cheer ไม่สำเร็จ", error);
    else load();
  }

  async function handleShareProgress() {
    if (!challenge) return;
    await generateAndShareCard(challenge, "PROGRESS");
  }

  async function handlePush() {
    if (!session?.user || !attempt) return;
    setBusy(true);
    const { error } = await pushChallenge(params.challengeId, attempt.id, session.user.id);
    setBusy(false);
    if (error) showAlert("Push ไม่สำเร็จ", error);
    else showAlert("🔴 ส่งแรงผลักดันให้แล้ว!");
  }

  async function handleImBack() {
    if (!attempt) return;
    await acknowledgeImBack(attempt.id);
    if (challenge) await generateAndShareCard(challenge, "IM_BACK");
    // FR13.3-13.4: "I'M BACK" ต้องพาไป check-in จริง ไม่ได้ resolve rescue แค่กดปุ่มเดียว
    await handleCheckIn();
  }

  async function handleTryAgain() {
    setBusy(true);
    const { error } = await tryAgain(params.challengeId);
    setBusy(false);
    if (error) showAlert("เริ่มใหม่ไม่สำเร็จ", error);
    else load();
  }

  async function handleExtend() {
    if (!attempt) return;
    setBusy(true);
    const { error } = await extendChallenge(params.challengeId, attempt.id, 7);
    setBusy(false);
    if (error) showAlert("ขยายเวลาไม่สำเร็จ", error);
    else load();
  }

  async function handleChangeGoal() {
    if (!attempt || !challenge) return;
    if (!newGoalText.trim()) {
      showAlert("ใส่เป้าหมายใหม่ก่อน", "อธิบายเป้าหมายใหม่ที่จะเปลี่ยนไป");
      return;
    }
    setBusy(true);
    const { error } = await changeGoal(challenge, attempt.id, newGoalText.trim());
    setBusy(false);
    if (error) showAlert("เปลี่ยนเป้าหมายไม่สำเร็จ", error);
    else {
      setChangeGoalMode(false);
      setNewGoalText("");
      load();
    }
  }

  async function handleCompleteMilestone(milestoneId: string) {
    setBusy(true);
    const { error } = await completeMilestone(params.challengeId, milestoneId);
    setBusy(false);
    if (error) showAlert("ทำ Milestone ไม่สำเร็จ", error);
    else {
      if (challenge) await generateAndShareCard(challenge, "MILESTONE");
      load();
    }
  }

  if (loading || !challenge || !daruma) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const isOwner = session?.user?.id === challenge.owner_id;
  const darumaEmoji = daruma.right_eye_filled_at ? "👁️👁️" : daruma.left_eye_filled_at ? "👁️◯" : "◯◯";
  const journeyPct = challenge.type === "LIFE" ? computeJourneyProgressPct(milestones) : null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.darumaStatus}>
        🔴 {darumaEmoji} {challenge.status}
      </Text>
      <Text style={styles.title}>{challenge.title}</Text>
      <Text style={styles.goal}>{challenge.goal_description}</Text>
      {challenge.reward_text ? <Text style={styles.reward}>🎁 {challenge.reward_text}</Text> : null}

      {/* Flow 10 / FR12: NEEDS_PUSH banner — non-owner เห็นปุ่ม Push */}
      {challenge.status === "NEEDS_PUSH" && (
        <View style={styles.warnBanner}>
          <Text style={styles.warnText}>🔴 Challenge นี้ต้องการแรงผลักดัน</Text>
          {!isOwner && challenge.push_permission !== "NOBODY" && (
            <Pressable style={styles.pushButton} onPress={handlePush} disabled={busy}>
              <Text style={styles.pushButtonText}>🔴 PUSH</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Flow 10 / FR13: RESCUE — owner เห็นปุ่ม I'm Back, non-owner เห็นปุ่ม Push ได้เช่นกัน */}
      {challenge.status === "RESCUE" && (
        <View style={styles.rescueBanner}>
          <Text style={styles.rescueText}>🛟 Rescue Mode — ยังไม่สายเกินไป</Text>
          {isOwner ? (
            <Pressable style={styles.pushButton} onPress={handleImBack} disabled={busy}>
              <Text style={styles.pushButtonText}>🔥 I'M BACK</Text>
            </Pressable>
          ) : (
            challenge.push_permission !== "NOBODY" && (
              <Pressable style={styles.pushButton} onPress={handlePush} disabled={busy}>
                <Text style={styles.pushButtonText}>🔴 PUSH</Text>
              </Pressable>
            )
          )}
        </View>
      )}

      {/* Flow 13 / FR17: NOT_YET — 3 ทางเลือก (ไม่มีคำว่า "ล้มเหลว" ใน UI) */}
      {challenge.status === "NOT_YET" && isOwner && (
        <View style={styles.notYetBanner}>
          <Text style={styles.notYetText}>ยังไม่สำเร็จ — แต่ยังไม่จบ จะไปต่อยังไงดี?</Text>
          <View style={styles.notYetRow}>
            <Pressable style={[styles.secondaryButton, styles.notYetButton]} onPress={handleTryAgain} disabled={busy}>
              <Text style={styles.secondaryButtonText}>🔁 ลองอีกครั้ง</Text>
            </Pressable>
            <Pressable style={[styles.secondaryButton, styles.notYetButton]} onPress={handleExtend} disabled={busy}>
              <Text style={styles.secondaryButtonText}>⏳ ขยายเวลา +7 วัน</Text>
            </Pressable>
            <Pressable
              style={[styles.secondaryButton, styles.notYetButton]}
              onPress={() => setChangeGoalMode((v) => !v)}
            >
              <Text style={styles.secondaryButtonText}>✏️ เปลี่ยนเป้าหมาย</Text>
            </Pressable>
          </View>
          {changeGoalMode && (
            <View style={{ gap: 8 }}>
              <TextInput
                style={styles.goalInput}
                placeholder="เป้าหมายใหม่ของคุณ"
                value={newGoalText}
                onChangeText={setNewGoalText}
                multiline
              />
              <Pressable style={styles.primaryButton} onPress={handleChangeGoal} disabled={busy}>
                <Text style={styles.primaryButtonText}>บันทึกเป้าหมายใหม่</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}

      {/* Flow 9 / FR9: Progress — เฉพาะ Challenge ที่มี attempt แล้ว */}
      {progress && challenge.type === "PERSONAL" && (
        <View style={styles.progressBox}>
          <Text style={styles.progressLine}>
            🔥 Streak ปัจจุบัน {progress.currentStreak} · ดีที่สุด {progress.bestStreak}
          </Text>
          <Text style={styles.progressLine}>✓ Check-in ทั้งหมด {progress.totalCheckIns} ครั้ง</Text>
          {progress.progressPct !== null && <Text style={styles.progressLine}>📈 ความคืบหน้า {progress.progressPct}%</Text>}
        </View>
      )}

      {/* Flow 6 / FR5: Life Challenge Milestones */}
      {challenge.type === "LIFE" && (
        <View style={styles.milestoneSection}>
          <Text style={styles.sectionTitle}>🧭 Journey Progress {journeyPct}%</Text>
          {milestones.map((m) => (
            <View key={m.id} style={styles.milestoneRow}>
              <Text style={styles.milestoneStatus}>{m.status === "DONE" ? "✅" : m.status === "IN_PROGRESS" ? "🟡" : "⚪"}</Text>
              <Text style={styles.milestoneTitle}>{m.title}</Text>
              {isOwner && m.status === "IN_PROGRESS" && (
                <Pressable onPress={() => handleCompleteMilestone(m.id)} disabled={busy}>
                  <Text style={styles.milestoneComplete}>ทำสำเร็จ</Text>
                </Pressable>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Flow 4: First-Eye Ritual — ต้องกดเองเท่านั้น (FR7.1) */}
      {!daruma.left_eye_filled_at && (
        <View style={styles.ritualBox}>
          <Text style={styles.ritualText}>เมื่อพร้อมจะเริ่ม เติมตาข้างแรกให้ Daruma</Text>
          <Pressable style={styles.primaryButton} onPress={handleFillFirstEye} disabled={busy}>
            <Text style={styles.primaryButtonText}>👁️ เติมตาข้างแรก</Text>
          </Pressable>
        </View>
      )}

      {/* Flow 5: Check-in — เปิดใช้หลังเติมตาแรกแล้วเท่านั้น */}
      {daruma.left_eye_filled_at && !daruma.right_eye_filled_at && challenge.type === "PERSONAL" && (
        <View style={styles.section}>
          <Pressable style={styles.primaryButton} onPress={handleCheckIn} disabled={busy}>
            <Text style={styles.primaryButtonText}>✓ CHECK IN TODAY</Text>
          </Pressable>

          <Pressable style={styles.secondaryButton} onPress={handleCheer}>
            <Text style={styles.secondaryButtonText}>❤️ Cheer ({cheerCount})</Text>
          </Pressable>

          <Pressable style={styles.secondaryButton} onPress={handleShareProgress}>
            <Text style={styles.secondaryButtonText}>📤 แชร์ความคืบหน้า</Text>
          </Pressable>

          {/* Flow 11: ปกติจะ trigger จากเงื่อนไขถึงเป้าหมายอัตโนมัติ —
              ใส่ปุ่ม manual ไว้ demo การเติมตาที่สอง (FR15.2: ต้องกดเองเสมอ) */}
          <Pressable style={styles.secondaryButton} onPress={handleFillSecondEye} disabled={busy}>
            <Text style={styles.secondaryButtonText}>🏆 ทำสำเร็จแล้ว — เติมตาข้างที่สอง</Text>
          </Pressable>
        </View>
      )}

      {daruma.left_eye_filled_at && !daruma.right_eye_filled_at && challenge.type === "LIFE" && (
        <View style={styles.section}>
          <Pressable style={styles.secondaryButton} onPress={handleCheer}>
            <Text style={styles.secondaryButtonText}>❤️ Cheer ({cheerCount})</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={handleShareProgress}>
            <Text style={styles.secondaryButtonText}>📤 แชร์ความคืบหน้า</Text>
          </Pressable>
        </View>
      )}

      {daruma.right_eye_filled_at && (
        <View style={styles.completedBox}>
          <Text style={styles.completedText}>🏆 YOU DID IT. ครั้งหนึ่งคุณเคยบอกว่าจะทำ และคุณทำสำเร็จ</Text>
        </View>
      )}

      {/* Flow 8/14: ทางเข้าจัดการ Supporters + ขอความช่วยเหลือ — เปิดได้ตลอดเวลา */}
      <View style={styles.linksSection}>
        {isOwner && (
          <Pressable
            style={styles.linkButton}
            onPress={() => navigation.navigate("InviteFriend", { challengeId: params.challengeId })}
          >
            <Text style={styles.linkButtonText}>🎯 ท้าเพื่อนให้มาทำด้วยกัน</Text>
          </Pressable>
        )}
        {isOwner && (
          <Pressable
            style={styles.linkButton}
            onPress={() => navigation.navigate("ManageSupporters", { challengeId: params.challengeId })}
          >
            <Text style={styles.linkButtonText}>👥 จัดการ Supporters</Text>
          </Pressable>
        )}
        <Pressable
          style={styles.linkButton}
          onPress={() => navigation.navigate("AskForHelp", { challengeId: params.challengeId })}
        >
          <Text style={styles.linkButtonText}>❤️ ขอความช่วยเหลือ</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 8 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  darumaStatus: { fontSize: 14, color: "#888" },
  title: { fontSize: 24, fontWeight: "700", marginTop: 4 },
  goal: { fontSize: 15, color: "#555", marginTop: 4 },
  reward: { fontSize: 14, color: "#b45309", marginTop: 8 },
  warnBanner: { marginTop: 16, backgroundColor: "#fef2f2", borderRadius: 12, padding: 14, gap: 8 },
  warnText: { color: "#b91c1c", fontWeight: "600" },
  rescueBanner: { marginTop: 16, backgroundColor: "#eff6ff", borderRadius: 12, padding: 14, gap: 8 },
  rescueText: { color: "#1d4ed8", fontWeight: "600" },
  pushButton: { backgroundColor: "#e11d48", borderRadius: 8, paddingVertical: 10, alignItems: "center" },
  pushButtonText: { color: "white", fontWeight: "700" },
  notYetBanner: { marginTop: 16, backgroundColor: "#fff7ed", borderRadius: 12, padding: 14, gap: 10 },
  notYetText: { fontWeight: "600" },
  notYetRow: { flexDirection: "row", gap: 8 },
  goalInput: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12, backgroundColor: "white" },
  progressBox: { marginTop: 16, backgroundColor: "#f7f7f8", borderRadius: 12, padding: 14, gap: 4 },
  progressLine: { fontSize: 14, color: "#333" },
  milestoneSection: { marginTop: 16 },
  sectionTitle: { fontWeight: "700", marginBottom: 8 },
  milestoneRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 },
  milestoneStatus: { fontSize: 16 },
  milestoneTitle: { flex: 1, fontSize: 15 },
  milestoneComplete: { color: "#e11d48", fontWeight: "600" },
  ritualBox: { marginTop: 24, alignItems: "center", gap: 12 },
  ritualText: { textAlign: "center", color: "#555" },
  section: { marginTop: 24, gap: 12 },
  primaryButton: { backgroundColor: "#e11d48", borderRadius: 8, padding: 14 },
  primaryButtonText: { color: "white", textAlign: "center", fontWeight: "700", fontSize: 16 },
  secondaryButton: { borderWidth: 1, borderColor: "#e11d48", borderRadius: 8, padding: 12 },
  notYetButton: { flex: 1 },
  secondaryButtonText: { color: "#e11d48", textAlign: "center", fontWeight: "600" },
  completedBox: { marginTop: 24, backgroundColor: "#fff7ed", borderRadius: 12, padding: 16 },
  completedText: { textAlign: "center", fontWeight: "600" },
  linksSection: { marginTop: 32, gap: 10, paddingBottom: 20 },
  linkButton: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12 },
  linkButtonText: { textAlign: "center", fontWeight: "600", color: "#333" },
});

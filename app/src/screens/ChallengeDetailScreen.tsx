import React, { useCallback, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { showAlert, showConfirm } from "@/lib/alert";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";

import type { RootStackParamList } from "@/navigation/RootNavigator";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { startGrowing, earnLeaf, deleteChallenge, setChallengeTarget, submitCheckIn, toggleCheer } from "@/api/challenges";
import { completeMilestone, computeJourneyProgressPct, listMilestones } from "@/api/lifeChallenge";
import { getChallengeProgress } from "@/api/progress";
import DarumaCanvas, { darumaEyesFrom } from "@/components/DarumaCanvas";
import { ProgressRing, StatTile } from "@/components/ui";
import { colors, font, layout, radius, shadow, spacing } from "@/theme";
import {
  checkInLabel,
  isAccumulative,
  progressSummaryText,
  remainingText,
} from "@/lib/measurement";
import type { ProgressSummary } from "@/api/progress";
import { acknowledgeImBack, pushChallenge } from "@/api/push";
import { generateAndShareCard } from "@/api/share";
import { changeGoal, extendChallenge, tryAgain } from "@/api/notYet";
import type { ChallengeAttemptRow, ChallengeRow, DarumaRow, MilestoneRow } from "@/types/database";

type Props = { route: RouteProp<RootStackParamList, "ChallengeDetail"> };

// ธีม "ต้นไม้แห่งความสำเร็จ": ตาราง daruma ในฐานข้อมูลยังชื่อเดิม แต่ความหมาย
// ที่แสดงผลเปลี่ยนเป็น — left_eye_filled_at = เริ่มปลูกแล้ว (🌱 กำลังพยายาม),
// right_eye_filled_at = ทำสำเร็จแล้ว (🍃 ได้ใบไม้ 1 ใบไปติดบนต้นไม้ของเรา)
//
// รวม Flow 4 (พิธีเริ่มปลูก), Flow 5 (Check-in), Flow 6 (Milestones/Life),
// Flow 7 (Cheer), Flow 8 (Supporters entry), Flow 9 (Progress), Flow 10
// (Push/Rescue), Flow 11 (Completion/Second-Eye), Flow 13 (Not Yet), Flow 14
// (Ask for Help entry) ไว้ในหน้าเดียวกัน เพราะทั้งหมดอยู่บน [Challenge Home]
// เดียวกันตาม USER-FLOWS.md
export default function ChallengeDetailScreen() {
  const { params } = useRoute<Props["route"]>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { session } = useAuth();

  const [challenge, setChallenge] = useState<ChallengeRow | null>(null);
  const [growth, setGrowth] = useState<DarumaRow | null>(null);
  const [attempt, setAttempt] = useState<ChallengeAttemptRow | null>(null);
  const [cheerCount, setCheerCount] = useState(0);
  const [milestones, setMilestones] = useState<MilestoneRow[]>([]);
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [changeGoalMode, setChangeGoalMode] = useState(false);
  const [newGoalText, setNewGoalText] = useState("");
  const [targetInput, setTargetInput] = useState("");
  const [checkInValue, setCheckInValue] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: challengeRow }, { data: growthRow }, { data: attemptRow }, { count }] = await Promise.all([
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
    setGrowth(growthRow as DarumaRow);
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

  async function handleStartGrowing() {
    setBusy(true);
    const { error } = await startGrowing(params.challengeId);
    setBusy(false);
    if (error) showAlert("เริ่มปลูกไม่สำเร็จ", error);
    else {
      if (challenge) await generateAndShareCard(challenge, "START");
      load();
    }
  }

  async function handleEarnLeaf() {
    setBusy(true);
    const { error } = await earnLeaf(params.challengeId);
    setBusy(false);
    if (error) showAlert("บันทึกความสำเร็จไม่สำเร็จ", error);
    else {
      showAlert("🎉 เติมตาครบสองข้างแล้ว!", "ต้นไม้ของคุณได้ใบไม้เพิ่ม 1 ใบ — ไปดูได้ที่แท็บ Me");
      if (challenge) await generateAndShareCard(challenge, "COMPLETE");
      load();
    }
  }

  async function handleCheckIn() {
    if (!attempt || !challenge) return;

    // Challenge ที่วัดด้วยตัวเลขสะสม (ระยะทาง/เวลา/จำนวน) ต้องกรอกตัวเลขของ
    // วันนั้นมาด้วย ไม่ใช่แค่กดว่า "ทำได้" — ไม่งั้นจะไม่รู้ว่าสะสมไปเท่าไหร่แล้ว
    const numeric = isAccumulative(challenge.measurement_type);
    let valueNumber: number | undefined;
    if (numeric) {
      const n = Number(checkInValue.trim());
      if (!Number.isFinite(n) || n <= 0) {
        showAlert("ใส่ตัวเลขก่อน", `กรอกว่าวันนี้ทำได้เท่าไหร่ (${challenge.measurement_unit || "หน่วย"})`);
        return;
      }
      valueNumber = n;
    }

    setBusy(true);
    const { error } = await submitCheckIn({
      challengeAttemptId: attempt.id,
      valueBool: numeric ? undefined : true,
      valueNumber,
    });
    setBusy(false);
    if (error) showAlert("Check-in ไม่สำเร็จ", error);
    else {
      setCheckInValue("");
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

  // ตั้งเส้นชัยย้อนหลังให้ Challenge เก่าที่ยังไม่มี target_value (ฟอร์มสร้าง
  // เวอร์ชันก่อนหน้าไม่เคยถามค่านี้) — ถ้าไม่มีเส้นชัย ปุ่มรับใบไม้จะไม่ปลดล็อก
  async function handleSetTarget() {
    const n = Number(targetInput.trim());
    if (!Number.isFinite(n) || n <= 0) {
      showAlert("ใส่ตัวเลขก่อน", "ใส่จำนวนครั้งที่ต้องทำให้ครบ เช่น 10");
      return;
    }
    setBusy(true);
    const { error } = await setChallengeTarget(params.challengeId, Math.floor(n));
    setBusy(false);
    if (error) showAlert("ตั้งเป้าหมายไม่สำเร็จ", error);
    else {
      setTargetInput("");
      load();
    }
  }

  // ลบ Challenge — ย้อนกลับไม่ได้ จึงต้องยืนยันก่อนเสมอ และถ้าทำสำเร็จไปแล้ว
  // ต้องเตือนให้ชัดว่าใบไม้บนต้นไม้จะหายไปด้วย (ใบไม้นับจาก Challenge ที่สำเร็จ)
  async function handleDelete() {
    if (!challenge) return;
    const earnedLeaf = !!growth?.right_eye_filled_at;
    const warning = earnedLeaf
      ? `ใบไม้ที่ได้จาก Challenge นี้จะหายไปจากต้นไม้ของคุณอย่างถาวรด้วย\n\nรวมถึงประวัติ check-in ทั้งหมด คำเชิญ และกำลังใจที่เพื่อนเคยส่งมา — ทั้งหมดนี้กู้คืนไม่ได้`
      : `ประวัติ check-in ทั้งหมด คำเชิญ และกำลังใจที่เพื่อนเคยส่งมาจะถูกลบไปด้วย — กู้คืนไม่ได้`;

    const ok = await showConfirm(`ลบ "${challenge.title}" ?`, warning, "ลบเลย", "เก็บไว้ก่อน");
    if (!ok) return;

    setBusy(true);
    const { error } = await deleteChallenge(params.challengeId);
    setBusy(false);
    if (error) {
      showAlert("ลบไม่สำเร็จ", error);
      return;
    }
    showAlert("ลบแล้ว", `"${challenge.title}" ถูกลบออกจากแอปเรียบร้อย`);
    navigation.popToTop();
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

  if (loading || !challenge || !growth) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isOwner = session?.user?.id === challenge.owner_id;
  // ดารุมะประจำ Challenge นี้ — หนึ่งตัวต่อหนึ่งเป้าหมาย (ดู DarumaCanvas)
  const darumaEyes = darumaEyesFrom(growth.left_eye_filled_at, growth.right_eye_filled_at);
  const darumaCaption =
    darumaEyes === 2
      ? "ตาครบสองข้างแล้ว — คุณทำได้จริง"
      : darumaEyes === 1
        ? "ดารุมะรอตาข้างที่สองจากคุณอยู่"
        : "ดารุมะยังไม่มีตาเลย — รอคำมั่นจากคุณ";
  const journeyPct = challenge.type === "LIFE" ? computeJourneyProgressPct(milestones) : null;

  // ───────── เงื่อนไข "ทำสำเร็จ" ที่ใช้ปลดล็อกปุ่มรับใบไม้ ─────────
  // PERSONAL: ต้อง check-in ครบตามจำนวนที่ตั้งไว้ (challenges.target_value)
  // LIFE:     ต้องทำ Milestone ครบทุกข้อ
  // ถ้ายังไม่ครบ ปุ่มจะไม่ขึ้นเลย — เห็นแค่ว่าเหลืออีกเท่าไหร่
  const target = challenge.target_value ?? null;
  const numericMeasure = isAccumulative(challenge.measurement_type);
  const unit = challenge.measurement_unit ?? "";
  // วัดแบบ Yes/No → นับ "จำนวนครั้งที่ check-in"
  // วัดแบบตัวเลขสะสม → รวม "ตัวเลขที่กรอกไว้ทุกครั้ง" (เช่น กม. ที่วิ่งสะสม)
  const doneCount = numericMeasure ? (progress?.totalValue ?? 0) : (progress?.totalCheckIns ?? 0);
  const remaining = target !== null ? Math.max(0, target - doneCount) : null;
  const targetPct = target ? Math.min(100, Math.round((doneCount / target) * 100)) : 0;
  const allMilestonesDone = milestones.length > 0 && milestones.every((m) => m.status === "DONE");
  const isGoalReached =
    challenge.type === "LIFE" ? allMilestonesDone : target !== null && doneCount >= target;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.heroCard}>
        <DarumaCanvas eyes={darumaEyes} width={122} />
        <Text style={styles.darumaCaption}>{darumaCaption}</Text>
        <Text style={styles.title}>{challenge.title}</Text>
        <Text style={styles.goal}>{challenge.goal_description}</Text>
        {challenge.reward_text ? <Text style={styles.reward}>🎁 {challenge.reward_text}</Text> : null}
      </View>

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
          {/* วงแหวนความคืบหน้า — เห็นภาพรวมได้ในแวบเดียวว่าใกล้เส้นชัยแค่ไหน */}
          {target !== null && (
            <View style={styles.ringRow}>
              <ProgressRing value={targetPct / 100} size={158} strokeWidth={14}>
                <Text style={styles.ringPct}>{targetPct}%</Text>
                <Text style={styles.ringSub}>
                  {+doneCount.toFixed(1)} / {target} {unit || "ครั้ง"}
                </Text>
              </ProgressRing>
            </View>
          )}

          <View style={styles.statRow}>
            <StatTile emoji="📅" value={progress.totalCheckIns} label="ครั้งที่ทำได้" color={colors.primary} />
            <StatTile emoji="🔥" value={progress.currentStreak} label="ติดต่อกัน" color={colors.amber} />
            <StatTile
              emoji="🎯"
              value={remaining !== null ? +remaining.toFixed(1) : "—"}
              label={unit ? `เหลืออีก (${unit})` : "เหลืออีก"}
              color={colors.accent}
            />
          </View>

          {target !== null && (
            <Text style={styles.progressLine}>
              {progressSummaryText(challenge.measurement_type, unit, doneCount, target)}
            </Text>
          )}
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

      {/* Flow 4: พิธี "เริ่มปลูก" — ต้องกดเองเท่านั้น (FR7.1) */}
      {!growth.left_eye_filled_at && (
        <View style={styles.ritualBox}>
          <Text style={styles.ritualText}>
            เมื่อพร้อมจะเริ่มจริง ๆ เติมตาข้างแรกให้ดารุมะ{"\n"}
            ทำสำเร็จเมื่อไหร่ค่อยเติมตาข้างที่สอง แล้วต้นไม้ของคุณจะได้ใบไม้เพิ่ม 1 ใบ 🍃
          </Text>
          <Pressable style={styles.ritualButton} onPress={handleStartGrowing} disabled={busy}>
            <Text style={styles.primaryButtonText}>👁️ เติมตาข้างแรก</Text>
          </Pressable>
        </View>
      )}

      {/* Flow 5: Check-in — เปิดใช้หลังเริ่มปลูกแล้วเท่านั้น */}
      {growth.left_eye_filled_at && !growth.right_eye_filled_at && challenge.type === "PERSONAL" && (
        <View style={styles.section}>
          {numericMeasure ? (
            <View style={styles.checkInBox}>
              <Text style={styles.checkInLabel}>{checkInLabel(challenge.measurement_type, unit)}</Text>
              <View style={styles.checkInRow}>
                <TextInput
                  style={styles.checkInInput}
                  placeholder="เช่น 3"
                  value={checkInValue}
                  onChangeText={setCheckInValue}
                  keyboardType="decimal-pad"
                />
                {unit ? <Text style={styles.checkInUnit}>{unit}</Text> : null}
              </View>
              <Pressable style={styles.primaryButton} onPress={handleCheckIn} disabled={busy}>
                <Text style={styles.primaryButtonText}>✓ บันทึกของวันนี้</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.primaryButton} onPress={handleCheckIn} disabled={busy}>
              <Text style={styles.primaryButtonText}>✓ วันนี้ทำได้</Text>
            </Pressable>
          )}

          <Pressable style={styles.secondaryButton} onPress={handleCheer}>
            <Text style={styles.secondaryButtonText}>❤️ Cheer ({cheerCount})</Text>
          </Pressable>

          <Pressable style={styles.secondaryButton} onPress={handleShareProgress}>
            <Text style={styles.secondaryButtonText}>📤 แชร์ความคืบหน้า</Text>
          </Pressable>

          {/* Flow 11 / FR15.1-15.2: ปุ่มรับใบไม้ขึ้นเฉพาะตอนทำครบเงื่อนไขแล้ว
              เท่านั้น (ตาม feedback ของผู้ใช้) — แต่ยังต้องให้ผู้ใช้กดเองอยู่ดี
              ไม่มีการเติมใบไม้ให้อัตโนมัติ เพราะการกดรับเองคือส่วนหนึ่งของพิธี */}
          {isGoalReached ? (
            <View style={styles.unlockedBox}>
              <Text style={styles.unlockedText}>
                🎉 ครบ {target}
                {unit ? ` ${unit}` : " ครั้ง"} แล้ว — ใบไม้ใบนี้เป็นของคุณ
              </Text>
              <Pressable style={styles.leafButton} onPress={handleEarnLeaf} disabled={busy}>
                <Text style={styles.leafButtonText}>👁️ เติมตาข้างที่สอง — รับใบไม้ 1 ใบ</Text>
              </Pressable>
            </View>
          ) : target !== null ? (
            <View style={styles.lockedBox}>
              <Text style={styles.lockedText}>
                🔒 {remainingText(challenge.measurement_type, unit, remaining ?? 0)}
              </Text>
              <Text style={styles.lockedSub}>ครบตามเป้าเมื่อไหร่ ปุ่มรับใบไม้จะขึ้นมาเอง</Text>
            </View>
          ) : isOwner ? (
            <View style={styles.lockedBox}>
              <Text style={styles.lockedText}>ยังไม่ได้ตั้งเส้นชัยของ Challenge นี้</Text>
              <Text style={styles.lockedSub}>
                ใส่ว่าต้องทำให้ครบกี่ครั้งถึงจะเรียกว่าสำเร็จ แล้วปุ่มรับใบไม้จะขึ้นเองตอนทำครบ
              </Text>
              <View style={styles.targetRow}>
                <TextInput
                  style={styles.targetInput}
                  placeholder="เช่น 10"
                  value={targetInput}
                  onChangeText={setTargetInput}
                  keyboardType="number-pad"
                />
                <Pressable style={styles.targetButton} onPress={handleSetTarget} disabled={busy}>
                  <Text style={styles.targetButtonText}>ตั้งเป้าหมาย</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      )}

      {growth.left_eye_filled_at && !growth.right_eye_filled_at && challenge.type === "LIFE" && (
        <View style={styles.section}>
          <Pressable style={styles.secondaryButton} onPress={handleCheer}>
            <Text style={styles.secondaryButtonText}>❤️ Cheer ({cheerCount})</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={handleShareProgress}>
            <Text style={styles.secondaryButtonText}>📤 แชร์ความคืบหน้า</Text>
          </Pressable>

          {/* Life Challenge: เงื่อนไขคือทำ Milestone ครบทุกข้อ */}
          {allMilestonesDone ? (
            <View style={styles.unlockedBox}>
              <Text style={styles.unlockedText}>🎉 ทำ Milestone ครบทุกข้อแล้ว!</Text>
              <Pressable style={styles.leafButton} onPress={handleEarnLeaf} disabled={busy}>
                <Text style={styles.leafButtonText}>👁️ เติมตาข้างที่สอง — รับใบไม้ 1 ใบ</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.lockedBox}>
              <Text style={styles.lockedText}>
                🔒 เหลืออีก {milestones.filter((m) => m.status !== "DONE").length} Milestone
              </Text>
              <Text style={styles.lockedSub}>ทำครบทุกข้อเมื่อไหร่ ปุ่มรับใบไม้จะขึ้นมาเอง</Text>
            </View>
          )}
        </View>
      )}

      {growth.right_eye_filled_at && (
        <View style={styles.completedBox}>
          <Text style={styles.completedText}>
            ดารุมะได้ตาครบสองข้างแล้ว และต้นไม้ของคุณได้ใบไม้เพิ่มอีก 1 ใบ 🍃{"\n"}
            ครั้งหนึ่งคุณเคยบอกว่าจะทำ และคุณทำสำเร็จ
          </Text>
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

        {/* ปุ่มลบ — วางท้ายสุด แยกจากปุ่มอื่นชัดเจน และต้องยืนยันก่อนถึงจะลบจริง
            เพราะเป็นการกระทำที่ย้อนกลับไม่ได้ */}
        {isOwner && (
          <Pressable style={styles.deleteButton} onPress={handleDelete} disabled={busy}>
            <Text style={styles.deleteButtonText}>🗑️ ลบ Challenge นี้</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

// การ์ดสีขาวมุมมนเงาบาง ๆ ใช้ซ้ำหลายที่ในหน้านี้
const cardBase = {
  backgroundColor: colors.card,
  borderRadius: radius.lg,
  borderWidth: 1,
  borderColor: colors.border,
  padding: spacing.lg,
  ...shadow.card,
} as const;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  container: { width: "100%", maxWidth: layout.maxContent, alignSelf: "center", padding: spacing.lg, paddingBottom: 40, gap: spacing.md },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },

  // ── หัวหน้า: ดารุมะ + ชื่อเป้าหมาย ──────────────────────────────────────
  heroCard: { ...cardBase, alignItems: "center", paddingVertical: spacing.xl },
  darumaCaption: { fontSize: font.small, color: colors.textMuted, marginTop: spacing.sm, textAlign: "center" },
  title: { fontSize: font.h2, fontWeight: "800", color: colors.text, marginTop: spacing.md, textAlign: "center" },
  goal: { fontSize: font.body, color: colors.textMuted, marginTop: 6, textAlign: "center", lineHeight: 22 },
  reward: {
    fontSize: font.small,
    color: colors.amber,
    marginTop: spacing.md,
    backgroundColor: colors.amberSoft,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 14,
    overflow: "hidden",
    fontWeight: "600",
  },

  // ── แบนเนอร์สถานะ ──────────────────────────────────────────────────────
  warnBanner: { ...cardBase, backgroundColor: colors.accentSoft, borderColor: "#f7cdd5", gap: spacing.sm },
  warnText: { color: colors.accentDark, fontWeight: "700" },
  rescueBanner: { ...cardBase, backgroundColor: "#eef4ff", borderColor: "#cfdcf7", gap: spacing.sm },
  rescueText: { color: "#1d4ed8", fontWeight: "700" },
  pushButton: { backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: 12, alignItems: "center" },
  pushButtonText: { color: colors.onPrimary, fontWeight: "700" },
  notYetBanner: { ...cardBase, backgroundColor: colors.amberSoft, borderColor: "#f5e0b5", gap: spacing.md },
  notYetText: { fontWeight: "700", color: colors.text },
  notYetRow: { flexDirection: "row", gap: spacing.sm },
  goalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 13,
    backgroundColor: colors.card,
    color: colors.text,
  },

  // ── ความคืบหน้า ────────────────────────────────────────────────────────
  progressBox: { ...cardBase, gap: spacing.md },
  ringRow: { alignItems: "center", paddingVertical: spacing.sm },
  ringPct: { fontSize: 30, fontWeight: "800", color: colors.text },
  ringSub: { fontSize: font.small, color: colors.textMuted, marginTop: 2 },
  statRow: { flexDirection: "row", gap: spacing.sm },
  progressLine: { fontSize: font.small, color: colors.textMuted, textAlign: "center" },

  // ── Life Challenge: Milestones ─────────────────────────────────────────
  milestoneSection: { ...cardBase },
  sectionTitle: { fontWeight: "700", marginBottom: spacing.sm, color: colors.text, fontSize: font.h3 },
  milestoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  milestoneStatus: { fontSize: 16 },
  milestoneTitle: { flex: 1, fontSize: font.body, color: colors.text },
  milestoneComplete: { color: colors.primary, fontWeight: "700", fontSize: font.small },

  // ── พิธีเติมตาข้างแรก ──────────────────────────────────────────────────
  ritualBox: { ...cardBase, alignItems: "center", gap: spacing.md, paddingVertical: spacing.xl },
  ritualText: { textAlign: "center", color: colors.textMuted, lineHeight: 22, fontSize: font.body },
  // สีแดง = ดารุมะ/คำมั่น · สีเขียว = การเติบโต/ใบไม้ — แยกความหมายกันชัด ๆ
  ritualButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 15,
    alignSelf: "stretch",
    ...shadow.card,
  },
  leafButton: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, ...shadow.card },
  leafButtonText: { color: colors.onPrimary, textAlign: "center", fontWeight: "700", fontSize: font.body },

  // ── Check-in ───────────────────────────────────────────────────────────
  checkInBox: { ...cardBase, gap: spacing.md },
  checkInLabel: { fontWeight: "700", color: colors.text, fontSize: font.body },
  checkInRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  checkInInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 13,
    backgroundColor: colors.cardSoft,
    fontSize: font.h3,
    color: colors.text,
  },
  checkInUnit: { fontSize: font.body, color: colors.textMuted, fontWeight: "700" },

  // ── กล่องตอนยังทำไม่ครบ (ปุ่มรับใบไม้ยังไม่ขึ้น) ───────────────────────
  lockedBox: { ...cardBase, backgroundColor: colors.cardSoft, gap: 6 },
  lockedText: { fontWeight: "700", color: colors.textMuted, textAlign: "center", fontSize: font.body },
  lockedSub: { fontSize: font.tiny, color: colors.textFaint, textAlign: "center", lineHeight: 18 },
  targetRow: { flexDirection: "row", gap: spacing.sm, marginTop: 6 },
  targetInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 11,
    backgroundColor: colors.card,
    color: colors.text,
  },
  targetButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: 18,
    justifyContent: "center",
  },
  targetButtonText: { color: colors.onPrimary, fontWeight: "700" },

  // ── กล่องตอนปลดล็อกแล้ว ────────────────────────────────────────────────
  unlockedBox: { ...cardBase, backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder, gap: spacing.md },
  unlockedText: { fontWeight: "800", color: colors.primaryDark, textAlign: "center", fontSize: font.body },

  section: { gap: spacing.md },
  primaryButton: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 15, ...shadow.card },
  primaryButtonText: { color: colors.onPrimary, textAlign: "center", fontWeight: "700", fontSize: font.body },
  secondaryButton: {
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingVertical: 13,
  },
  notYetButton: { flex: 1, borderColor: colors.amber },
  secondaryButtonText: { color: colors.text, textAlign: "center", fontWeight: "700", fontSize: font.small },

  completedBox: {
    ...cardBase,
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryBorder,
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  completedText: { textAlign: "center", fontWeight: "700", color: colors.primaryDark, lineHeight: 23 },

  linksSection: { marginTop: spacing.sm, gap: spacing.sm },
  linkButton: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingVertical: 14,
  },
  linkButtonText: { textAlign: "center", fontWeight: "700", color: colors.text, fontSize: font.small },
  deleteButton: { marginTop: spacing.md, padding: spacing.md },
  deleteButtonText: { textAlign: "center", fontWeight: "600", color: colors.textFaint, fontSize: font.small },
});

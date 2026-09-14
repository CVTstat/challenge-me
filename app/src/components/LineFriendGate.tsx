import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import DarumaCanvas from "@/components/DarumaCanvas";
import { getAddFriendUrl, getLineFriendship } from "@/lib/liff";
import { colors, font, radius, shadow, spacing } from "@/theme";

/**
 * ด่านแอดเพื่อน LINE OA — กั้นไว้ก่อนเข้าแอป
 *
 * ทำไมต้องมี: ถ้าผู้ใช้ไม่ได้แอดเพื่อนกับ LINE OA ของเรา เราจะส่งข้อความหาเขา
 * ไม่ได้เลยแม้แต่ข้อความเดียว แปลว่าพอเขาปิดแอปไปก็หายไปเลย ไม่มีทางเตือนให้
 * กลับมาทำต่อ ซึ่งขัดกับหัวใจของแอปที่ว่า "มีคนคอยเตือนคอยเชียร์ให้ทำสำเร็จ"
 * ตอนที่เขาเพิ่งกดเข้ามาคือจังหวะเดียวที่เราขอให้แอดได้ ปล่อยผ่านไปแล้วไม่มีอีก
 *
 * *** หลักสำคัญ: ตอบไม่ได้ = ต้องปล่อยผ่าน ***
 * การเช็คนี้ทำได้เฉพาะคนที่เข้ามาทาง LINE เท่านั้น คนที่สมัครด้วยอีเมลปกติหรือ
 * เปิดบนคอมจะเช็คไม่ได้ (ได้ค่า null) ถ้าเผลอกั้นไว้ด้วยจะกลายเป็นล็อกคนกลุ่มนั้น
 * ออกจากแอปถาวรโดยที่เขาไม่ได้ทำอะไรผิด
 */
export default function LineFriendGate({ children }: { children: React.ReactNode }) {
  const [needFriend, setNeedFriend] = useState(false);
  const [rechecking, setRechecking] = useState(false);
  const addFriendUrl = getAddFriendUrl();

  const check = useCallback(async () => {
    // ยังไม่ได้ตั้งไอดี OA ก็ไม่มีลิงก์ให้กดแอด — กั้นไปก็ไม่มีทางออก
    if (!addFriendUrl) return;
    const isFriend = await getLineFriendship();
    setNeedFriend(isFriend === false);
  }, [addFriendUrl]);

  useEffect(() => {
    check();
  }, [check]);

  async function handleRecheck() {
    setRechecking(true);
    const isFriend = await getLineFriendship();
    setRechecking(false);
    // ตอบไม่ได้ก็ปล่อยเข้า ดีกว่าขังเขาไว้ตรงนี้
    setNeedFriend(isFriend === false);
  }

  if (!needFriend) return <>{children}</>;

  // react-native-web แปลง View ที่มี href ให้เป็นแท็ก <a> จริง
  // ต้องเป็นลิงก์จริงเท่านั้น ไม่งั้นเบราว์เซอร์มือถือจะไม่ยอมเปิดแอป LINE ให้
  const linkProps = { href: addFriendUrl } as unknown as Record<string, unknown>;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <DarumaCanvas eyes={0} width={112} />

      <Text style={styles.title}>อีกขั้นเดียว</Text>
      <Text style={styles.body}>
        แอดเพื่อนกับ LINE ของ Challenge Me ก่อนนะ{"\n"}
        จะได้เตือนคุณตอนมีคนส่งกำลังใจมา และคอยสะกิดเวลาใกล้หลุดเป้าหมาย
      </Text>

      <View style={styles.actions}>
        <View {...linkProps} style={[styles.primaryButton, styles.link]}>
          <Text style={styles.primaryButtonText}>แอดเพื่อนใน LINE</Text>
        </View>

        <Pressable style={styles.secondaryButton} onPress={handleRecheck} disabled={rechecking}>
          {rechecking ? (
            <ActivityIndicator color={colors.primaryDark} />
          ) : (
            <Text style={styles.secondaryButtonText}>แอดแล้ว — เข้าแอปเลย</Text>
          )}
        </Pressable>
      </View>

      <Text style={styles.footnote}>
        แอดแล้วกลับมากด &quot;แอดแล้ว — เข้าแอปเลย&quot; ได้เลย
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  container: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  title: { fontSize: font.h2, fontWeight: "800", color: colors.text, marginTop: spacing.lg },
  body: {
    fontSize: font.body,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 24,
    marginTop: spacing.sm,
    maxWidth: 420,
  },
  actions: { marginTop: spacing.xl, gap: spacing.md, width: "100%", maxWidth: 420 },
  primaryButton: {
    backgroundColor: "#06C755",
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    ...shadow.card,
  },
  link: { textDecorationLine: "none" },
  primaryButtonText: { color: "#ffffff", fontWeight: "700", fontSize: font.body },
  secondaryButton: {
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    backgroundColor: colors.card,
  },
  secondaryButtonText: { color: colors.primaryDark, fontWeight: "700", fontSize: font.body },
  footnote: { marginTop: spacing.lg, fontSize: font.tiny, color: colors.textFaint, textAlign: "center" },
});

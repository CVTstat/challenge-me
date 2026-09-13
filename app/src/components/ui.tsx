// ────────────────────────────────────────────────────────────────────────────
// คอมโพเนนต์ UI กลางที่ทุกหน้าใช้ร่วมกัน — ทำให้หน้าตาทั้งแอปเป็นชุดเดียวกัน
// และแก้ครั้งเดียวมีผลทุกหน้า (อิงดีไซน์ที่ผู้ใช้ส่งมา)
// ────────────────────────────────────────────────────────────────────────────

import React from "react";
import { View, Text, Pressable, StyleSheet, ViewStyle, StyleProp, TextStyle } from "react-native";
import { colors, font, radius, shadow, spacing } from "@/theme";

/* ── การ์ดสีขาวมุมมน เงาบาง ๆ ─────────────────────────────────────────────── */
export function Card({
  children,
  style,
  onPress,
  soft,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  soft?: boolean;
}) {
  const body = <View style={[styles.card, soft && styles.cardSoft, style]}>{children}</View>;
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}>
      {body}
    </Pressable>
  );
}

/* ── หัวข้อของแต่ละส่วน + ลิงก์ "ดูทั้งหมด" ทางขวา ───────────────────────── */
export function SectionTitle({
  children,
  action,
  onAction,
}: {
  children: React.ReactNode;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.sectionAction}>{action} ›</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/* ── แถบความคืบหน้าแนวนอน ────────────────────────────────────────────────── */
export function ProgressBar({
  value,
  color = colors.primary,
  height = 8,
  style,
}: {
  value: number; // 0..1
  color?: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const pct = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }, style]}>
      <View
        style={{
          width: `${pct * 100}%`,
          height: "100%",
          borderRadius: height / 2,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

/* ── วงแหวนความคืบหน้า ────────────────────────────────────────────────────
 * React Native วาดเส้นโค้งอิสระไม่ได้ (ไม่มี SVG ในโปรเจกต์นี้) จึงใช้เทคนิค
 * "ครึ่งวงกลมหมุน + กรอบตัดขอบ": วางวงแหวนที่ระบายสีไว้ครึ่งเดียวลงในกรอบที่
 * ตัดให้เห็นแค่ครึ่งซ้าย/ครึ่งขวา แล้วหมุนตามเปอร์เซ็นต์
 *
 * สูตรมุมหมุนด้านล่างทดสอบด้วยการเรนเดอร์จริงที่ 12/25/50/72/90/100% แล้วว่า
 * เริ่มที่ 12 นาฬิกาและเดินตามเข็มถูกต้องทุกค่า — แก้ตัวเลขนี้แล้ววงจะเพี้ยน
 * ────────────────────────────────────────────────────────────────────────── */
export function ProgressRing({
  value,
  size = 150,
  strokeWidth = 13,
  color = colors.primary,
  trackColor = colors.track,
  children,
}: {
  value: number; // 0..1
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  children?: React.ReactNode;
}) {
  const pct = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const deg = pct * 360;
  const half = size / 2;
  const rightRotate = Math.min(deg, 180) - 135;
  const leftRotate = deg - 135;

  const ringBase: ViewStyle = {
    position: "absolute",
    top: 0,
    width: size,
    height: size,
    borderRadius: half,
    borderWidth: strokeWidth,
    borderColor: "transparent",
    borderTopColor: color,
    borderRightColor: color,
  };

  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: size,
          height: size,
          borderRadius: half,
          borderWidth: strokeWidth,
          borderColor: trackColor,
        }}
      />
      {/* ครึ่งขวา = 0-50% */}
      <View style={{ position: "absolute", top: 0, right: 0, width: half, height: size, overflow: "hidden" }}>
        <View style={[ringBase, { right: 0, transform: [{ rotate: `${rightRotate}deg` }] }]} />
      </View>
      {/* ครึ่งซ้าย = 50-100% (โผล่เฉพาะตอนเกินครึ่งแล้ว) */}
      {deg > 180 && (
        <View style={{ position: "absolute", top: 0, left: 0, width: half, height: size, overflow: "hidden" }}>
          <View style={[ringBase, { left: 0, transform: [{ rotate: `${leftRotate}deg` }] }]} />
        </View>
      )}
      <View style={[styles.ringCenter, { width: size, height: size }]}>{children}</View>
    </View>
  );
}

/* ── ช่องสถิติเล็ก ๆ (ตัวเลขใหญ่ + คำอธิบาย) ─────────────────────────────── */
export function StatTile({
  value,
  label,
  emoji,
  color = colors.text,
  style,
}: {
  value: React.ReactNode;
  label: string;
  emoji?: string;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.statTile, style]}>
      {emoji ? <Text style={styles.statEmoji}>{emoji}</Text> : null}
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/* ── แถบปุ่มแบบแคปซูล (ใช้เป็นแท็บย่อย/ตัวกรอง) ──────────────────────────── */
export function Pills<T extends string>({
  options,
  value,
  onChange,
  activeColor = colors.primary,
  style,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  activeColor?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.pillRow, style]}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[styles.pill, active && { backgroundColor: activeColor, borderColor: activeColor }]}
          >
            <Text style={[styles.pillText, active && styles.pillTextActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ── ปุ่ม ─────────────────────────────────────────────────────────────────── */
export function PrimaryButton({
  label,
  onPress,
  disabled,
  color = colors.primary,
  style,
  textStyle,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  color?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.primaryButton,
        { backgroundColor: color },
        disabled && { opacity: 0.55 },
        pressed && !disabled && { opacity: 0.88 },
        style,
      ]}
    >
      <Text style={[styles.primaryButtonText, textStyle]}>{label}</Text>
    </Pressable>
  );
}

export function OutlineButton({
  label,
  onPress,
  color = colors.primary,
  style,
}: {
  label: string;
  onPress?: () => void;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.outlineButton, { borderColor: color }, pressed && { opacity: 0.8 }, style]}
    >
      <Text style={[styles.outlineButtonText, { color }]}>{label}</Text>
    </Pressable>
  );
}

/* ── รูปโปรไฟล์วงกลม (ยังไม่มีรูปจริง ใช้ตัวอักษรแรกของชื่อไปก่อน) ───────── */
export function Avatar({ name, size = 44 }: { name?: string | null; size?: number }) {
  const letter = (name ?? "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.primarySoft,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: colors.primaryBorder,
      }}
    >
      <Text style={{ fontSize: size * 0.42, fontWeight: "700", color: colors.primaryDark }}>{letter}</Text>
    </View>
  );
}

/* ── สถานะว่าง ───────────────────────────────────────────────────────────── */
export function EmptyState({ emoji, title, subtitle }: { emoji: string; title: string; subtitle?: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyEmoji}>{emoji}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  cardSoft: { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder },

  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  sectionTitle: { fontSize: font.h3, fontWeight: "700", color: colors.text },
  sectionAction: { fontSize: font.small, color: colors.textMuted, fontWeight: "600" },

  track: { backgroundColor: colors.track, overflow: "hidden", width: "100%" },

  ringCenter: { position: "absolute", top: 0, left: 0, alignItems: "center", justifyContent: "center" },

  statTile: {
    flex: 1,
    backgroundColor: colors.cardSoft,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  statEmoji: { fontSize: 18, marginBottom: 2 },
  statValue: { fontSize: font.h2, fontWeight: "800" },
  statLabel: { fontSize: font.tiny, color: colors.textMuted, marginTop: 2, textAlign: "center" },

  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  pill: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  pillText: { fontSize: font.small, color: colors.textMuted, fontWeight: "600" },
  pillTextActive: { color: colors.onPrimary },

  primaryButton: {
    borderRadius: radius.md,
    paddingVertical: 15,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    ...shadow.card,
  },
  primaryButtonText: { color: colors.onPrimary, fontWeight: "700", fontSize: font.body },

  outlineButton: {
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingVertical: 13,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    backgroundColor: colors.card,
  },
  outlineButtonText: { fontWeight: "700", fontSize: font.body },

  empty: { alignItems: "center", paddingVertical: 48, paddingHorizontal: spacing.xxl, gap: 6 },
  emptyEmoji: { fontSize: 40, marginBottom: 4 },
  emptyTitle: { fontSize: font.h3, fontWeight: "700", color: colors.text, textAlign: "center" },
  emptySubtitle: { fontSize: font.small, color: colors.textMuted, textAlign: "center", lineHeight: 20 },
});

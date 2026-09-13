// ตัวเลือก Category แบบ "ตารางไอคอน" ให้กดเลือก แทนการพิมพ์เอง
// (ตามภาพดีไซน์ที่ผู้ใช้ส่งมา) — ใช้ร่วมกันทั้งหน้าสร้าง Challenge และหน้า
// "ฉันช่วยอะไรได้บ้าง" (EditExpertiseScreen)
//
// ยังเปิดช่องพิมพ์เองไว้ตอนกด "อื่น ๆ" เผื่อไม่มีตัวเลือกที่ตรงกับสิ่งที่
// ผู้ใช้ต้องการจริง ๆ — ค่าที่ส่งออกไป (onChange) ยังเป็น string ธรรมดา
// เหมือนเดิมทุกประการ ไม่กระทบ backend/ฐานข้อมูลเลย

import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { CategoryOption, OTHER_CATEGORY_VALUE } from "@/lib/categories";
import { colors, font, radius, spacing } from "@/theme";

interface Props {
  options: CategoryOption[];
  value: string;
  onChange: (value: string) => void;
  customPlaceholder?: string;
}

export default function CategoryPicker({ options, value, onChange, customPlaceholder }: Props) {
  // สถานะ "กำลังพิมพ์เอง" ต้องเก็บเป็น state ของตัวเอง จะเดาจากค่า value อย่างเดียว
  // ไม่ได้
  //
  // บั๊กที่เจอจริง: เดิมใช้เงื่อนไข "value ไม่ว่างและไม่ตรง preset ไหน" แทนการ
  // จำว่าผู้ใช้กดปุ่มอื่น ๆ ไปแล้ว — พอยังไม่ได้เลือกอะไรเลย (value ว่าง) กดปุ่ม
  // "อื่น ๆ" จึงไม่มีอะไรเกิดขึ้น เพราะค่ายังว่างอยู่เหมือนเดิม ช่องพิมพ์เลย
  // ไม่โผล่ กลายเป็นปุ่มที่กดไม่ได้
  const matchedPreset = options.find((o) => o.value === value && o.value !== OTHER_CATEGORY_VALUE);
  // ค่าที่พิมพ์เองไว้ก่อนหน้า (เช่น Challenge เก่าที่สร้างตอนยังเป็นช่องพิมพ์)
  // ก็ต้องนับว่าอยู่โหมดพิมพ์เองด้วย ค่าเดิมจะได้ไม่หาย
  const hasCustomValue = value.trim().length > 0 && !matchedPreset;
  const [customMode, setCustomMode] = useState(hasCustomValue);

  const showCustomInput = customMode || hasCustomValue;
  const selectedChip = matchedPreset ? matchedPreset.value : showCustomInput ? OTHER_CATEGORY_VALUE : "";

  function handlePick(opt: CategoryOption) {
    if (opt.value === OTHER_CATEGORY_VALUE) {
      setCustomMode(true);
      // สลับจาก preset อื่นมาเป็น "อื่น ๆ" ต้องเคลียร์ค่าเดิมเพื่อให้พิมพ์ใหม่ได้
      if (matchedPreset) onChange("");
      return;
    }
    setCustomMode(false);
    onChange(opt.value);
  }

  return (
    <View>
      <View style={styles.grid}>
        {options.map((opt) => {
          const active = selectedChip === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => handlePick(opt)}
              style={({ pressed }) => [styles.tile, active && styles.tileActive, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.tileIcon}>{opt.icon}</Text>
              <Text style={[styles.tileLabel, active && styles.tileLabelActive]} numberOfLines={1}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {showCustomInput && (
        <TextInput
          style={styles.input}
          placeholder={customPlaceholder ?? "พิมพ์หมวดของคุณเอง"}
          placeholderTextColor={colors.textFaint}
          value={value}
          onChangeText={onChange}
          autoFocus
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
  tile: {
    width: "22.4%",
    minWidth: 74,
    flexGrow: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: 4,
    alignItems: "center",
  },
  tileActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary, borderWidth: 2 },
  tileIcon: { fontSize: 22 },
  tileLabel: { fontSize: font.tiny, color: colors.textMuted, marginTop: 5, fontWeight: "600" },
  tileLabelActive: { color: colors.primaryDark },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 13,
    fontSize: font.body,
    color: colors.text,
    marginTop: spacing.sm,
  },
});

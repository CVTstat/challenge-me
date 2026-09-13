// ตัวเลือก Category แบบกดเลือก (chip) แทนการพิมพ์เอง — ใช้ร่วมกันทั้งหน้า
// สร้าง Challenge และหน้า "ฉันช่วยอะไรได้บ้าง" (EditExpertiseScreen)
//
// ยังเปิดช่องพิมพ์เองไว้ตอนกด "อื่นๆ" เผื่อไม่มีตัวเลือกที่ตรงกับสิ่งที่
// ผู้ใช้ต้องการจริง ๆ — ค่าที่ส่งออกไป (onChange) ยังเป็น string ธรรมดา
// เหมือนเดิมทุกประการ ไม่กระทบ backend/ฐานข้อมูลเลย

import React from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { CategoryOption, OTHER_CATEGORY_VALUE } from "@/lib/categories";

interface Props {
  options: CategoryOption[];
  value: string;
  onChange: (value: string) => void;
  customPlaceholder?: string;
}

export default function CategoryPicker({ options, value, onChange, customPlaceholder }: Props) {
  // ถือว่ากำลังอยู่โหมด "พิมพ์เอง" เมื่อค่าปัจจุบันไม่ตรงกับ preset ไหนเลย
  // (ครอบคลุมทั้งกรณีเพิ่งกด "อื่นๆ" และกรณี Challenge เก่าที่เคยพิมพ์ category
  // แบบอิสระไว้ก่อนจะมีตัวเลือกสำเร็จรูปชุดนี้ — ค่าที่เคยพิมพ์ไว้จะไม่หายไป)
  const matchedPreset = options.find((o) => o.value === value && o.value !== OTHER_CATEGORY_VALUE);
  const isCustomMode = value.trim().length > 0 && !matchedPreset;
  const selectedChip = matchedPreset ? matchedPreset.value : isCustomMode ? OTHER_CATEGORY_VALUE : "";

  function handlePick(opt: CategoryOption) {
    if (opt.value === OTHER_CATEGORY_VALUE) {
      // สลับจาก preset อื่นมาเป็น "อื่นๆ" ต้องเคลียร์ค่าเดิมเพื่อให้พิมพ์ใหม่ได้
      if (matchedPreset) onChange("");
      return;
    }
    onChange(opt.value);
  }

  return (
    <View>
      <View style={styles.row}>
        {options.map((opt) => (
          <Pressable
            key={opt.value}
            style={[styles.chip, selectedChip === opt.value && styles.chipActive]}
            onPress={() => handlePick(opt)}
          >
            <Text style={selectedChip === opt.value ? styles.chipTextActive : styles.chipText}>{opt.label}</Text>
          </Pressable>
        ))}
      </View>
      {selectedChip === OTHER_CATEGORY_VALUE && (
        <TextInput
          style={styles.input}
          placeholder={customPlaceholder ?? "พิมพ์ category ของคุณเอง"}
          value={value}
          onChangeText={onChange}
          autoFocus
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  chip: { borderWidth: 1, borderColor: "#ddd", borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 },
  chipActive: { backgroundColor: "#e11d48", borderColor: "#e11d48" },
  chipText: { color: "#333", fontSize: 13 },
  chipTextActive: { color: "white", fontWeight: "600", fontSize: 13 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12, fontSize: 15, marginTop: 8 },
});

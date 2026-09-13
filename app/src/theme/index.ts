// ────────────────────────────────────────────────────────────────────────────
// Design System ของ Challenge Me
//
// รวม "สี / ระยะห่าง / มุมโค้ง / เงา / ขนาดตัวอักษร" ไว้ที่เดียว เพื่อให้ทุกหน้า
// หน้าตาเป็นชุดเดียวกันจริง ๆ และแก้ธีมทั้งแอปได้จากไฟล์เดียว
//
// โทนหลักอิงจากภาพดีไซน์ที่ผู้ใช้ส่งมา:
//   • เขียว = การเติบโต/ความสำเร็จ (ปุ่มหลัก, ต้นไม้, ใบไม้)
//   • แดงชมพู = ดารุมะ/ความมุ่งมั่น (ปุ่มสร้าง Challenge, หัวใจ, กำลังใจ)
//   • พื้นหลังสีอ่อนนวล + การ์ดสีขาวมุมมน + เงาฟุ้งบาง ๆ
// ────────────────────────────────────────────────────────────────────────────

export const colors = {
  // เขียว — สีหลักของแบรนด์
  primary: "#2f9e4f",
  primaryDark: "#237a3c",
  primarySoft: "#eaf6ec",
  primaryBorder: "#cfe7d5",

  // แดงชมพู — สีของดารุมะ/ความมุ่งมั่น
  accent: "#e8415a",
  accentDark: "#c62f47",
  accentSoft: "#fdecef",

  // เหลืองอำพัน — รางวัล/ไฟ streak
  amber: "#f59e0b",
  amberSoft: "#fff7e6",

  // ตัวอักษร
  text: "#1b2a20",
  textMuted: "#6b7f70",
  textFaint: "#9aab9f",
  onPrimary: "#ffffff",

  // พื้นผิว
  bg: "#f4f7f4",
  card: "#ffffff",
  cardSoft: "#f8faf8",
  border: "#e7ede8",
  track: "#eceff0",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export const font = {
  h1: 26,
  h2: 20,
  h3: 17,
  body: 15,
  small: 13,
  tiny: 11,
} as const;

// เงาแบบฟุ้งบาง ๆ ใช้ได้ทั้ง iOS / Android / เว็บ
// (react-native-web แปลง shadow* เป็น box-shadow ให้เอง ส่วน elevation ใช้กับ Android)
export const shadow = {
  card: {
    shadowColor: "#1b2a20",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  float: {
    shadowColor: "#1b2a20",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;

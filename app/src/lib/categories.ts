// รายการ Category แบบ "เลือกได้" แทนการพิมพ์เอง (ตามที่ผู้ใช้ขอ — เดิมช่อง
// Category เป็นแค่ TextInput ว่าง ๆ ที่มี placeholder เป็นตัวอย่าง ทำให้ดูเหมือน
// ต้องพิมพ์เองทั้งที่จริง ๆ อยากให้มีตัวเลือกสำเร็จรูปให้กด)
//
// แยกเป็น 2 ชุดเพราะเป็นคนละบริบทกัน:
//   - CHALLENGE_CATEGORIES: หมวดของเป้าหมาย/Challenge ที่ผู้ใช้สร้างให้ตัวเอง
//   - EXPERTISE_CATEGORIES: หมวดของ "สิ่งที่ฉันช่วยคนอื่นได้" ในหน้า Community
//
// ยังคงมีตัวเลือก "อื่นๆ" ที่เปิดให้พิมพ์เองได้เสมอ เพราะเป้าหมายของคนเรามี
// ได้หลากหลายเกินกว่าจะระบุเป็น preset ให้ครบทุกกรณี

export interface CategoryOption {
  value: string;
  label: string;
}

export const OTHER_CATEGORY_VALUE = "other";

export const CHALLENGE_CATEGORIES: CategoryOption[] = [
  { value: "health", label: "🏃 สุขภาพ/ออกกำลังกาย" },
  { value: "finance", label: "💰 การเงิน" },
  { value: "career", label: "💼 การงาน/อาชีพ" },
  { value: "education", label: "📚 การเรียน/ทักษะ" },
  { value: "relationship", label: "❤️ ความสัมพันธ์/ครอบครัว" },
  { value: "habit", label: "🔄 นิสัย/ไลฟ์สไตล์" },
  { value: "mindset", label: "🧘 จิตใจ/สติ" },
  { value: "hobby", label: "🎨 งานอดิเรก" },
  { value: OTHER_CATEGORY_VALUE, label: "✏️ อื่นๆ (พิมพ์เอง)" },
];

export const EXPERTISE_CATEGORIES: CategoryOption[] = [
  { value: "smoking_cessation", label: "🚭 เลิกบุหรี่/เลิกเหล้า" },
  { value: "fitness", label: "🏃 ออกกำลังกาย/วิ่ง" },
  { value: "weight_loss", label: "⚖️ ลดน้ำหนัก" },
  { value: "finance", label: "💰 การเงิน/การออม" },
  { value: "career", label: "💼 อาชีพ/การงาน" },
  { value: "education", label: "📚 การเรียน/สอบ" },
  { value: "relationship", label: "❤️ ความสัมพันธ์/ครอบครัว" },
  { value: "wellbeing", label: "🧘 สุขภาพใจ/ลดความเครียด" },
  { value: "business", label: "🚀 ธุรกิจ/สตาร์ทอัพ" },
  { value: "general_skill", label: "🛠️ ทักษะทั่วไป" },
  { value: OTHER_CATEGORY_VALUE, label: "✏️ อื่นๆ (พิมพ์เอง)" },
];

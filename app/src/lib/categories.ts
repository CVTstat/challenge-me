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
  icon: string;
}

export const OTHER_CATEGORY_VALUE = "other";

export const CHALLENGE_CATEGORIES: CategoryOption[] = [
  { value: "health", label: "สุขภาพ", icon: "❤️" },
  { value: "fitness", label: "ออกกำลังกาย", icon: "🏃" },
  { value: "career", label: "การงาน", icon: "💼" },
  { value: "education", label: "การเรียน", icon: "📖" },
  { value: "finance", label: "การเงิน", icon: "💰" },
  { value: "self_growth", label: "พัฒนาตัวเอง", icon: "🌟" },
  { value: "relationship", label: "ครอบครัว", icon: "👨‍👩‍👧" },
  { value: "environment", label: "สิ่งแวดล้อม", icon: "🌱" },
  { value: "habit", label: "นิสัยประจำวัน", icon: "🔄" },
  { value: OTHER_CATEGORY_VALUE, label: "อื่น ๆ", icon: "✏️" },
];

export const EXPERTISE_CATEGORIES: CategoryOption[] = [
  { value: "smoking_cessation", label: "เลิกบุหรี่/เหล้า", icon: "🚭" },
  { value: "fitness", label: "ออกกำลังกาย", icon: "🏃" },
  { value: "weight_loss", label: "ลดน้ำหนัก", icon: "⚖️" },
  { value: "finance", label: "การเงิน", icon: "💰" },
  { value: "career", label: "อาชีพ/การงาน", icon: "💼" },
  { value: "education", label: "การเรียน/สอบ", icon: "📖" },
  { value: "relationship", label: "ครอบครัว", icon: "👨‍👩‍👧" },
  { value: "wellbeing", label: "สุขภาพใจ", icon: "🧘" },
  { value: "business", label: "ธุรกิจ", icon: "🚀" },
  { value: "general_skill", label: "ทักษะทั่วไป", icon: "🛠️" },
  { value: OTHER_CATEGORY_VALUE, label: "อื่น ๆ", icon: "✏️" },
];

// รวมทั้งสองชุดไว้ค้นหาไอคอน/ชื่อไทยของ category ที่บันทึกไว้แล้ว
const ALL_OPTIONS = [...CHALLENGE_CATEGORIES, ...EXPERTISE_CATEGORIES];

/** ไอคอนประจำหมวด — ใช้กับการ์ด Challenge ในหน้า Home/Me (ไม่รู้จักก็ใช้ 🎯) */
export function categoryIcon(category?: string | null): string {
  if (!category) return "🎯";
  const found = ALL_OPTIONS.find((o) => o.value === category.trim().toLowerCase());
  return found && found.value !== OTHER_CATEGORY_VALUE ? found.icon : "🎯";
}

/** ชื่อไทยของหมวด — ถ้าเป็นค่าที่ผู้ใช้พิมพ์เอง ก็แสดงตามที่พิมพ์ */
export function categoryLabel(category?: string | null): string {
  if (!category) return "";
  const found = ALL_OPTIONS.find((o) => o.value === category.trim().toLowerCase());
  return found && found.value !== OTHER_CATEGORY_VALUE ? found.label : category;
}

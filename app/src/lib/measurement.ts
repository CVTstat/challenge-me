import type { MeasurementType } from "@/types/database";

// ────────────────────────────────────────────────────────────────────────────
// กติกาการวัดผล — ให้ "วิธีวัดผล" กับ "การ check-in" กับ "เงื่อนไขสำเร็จ"
// สอดคล้องกันเสมอ (ตาม feedback ของผู้ใช้)
//
// แบ่งเป็น 2 กลุ่มใหญ่:
//
// 1) YES_NO — วัดเป็น "ทำได้/ไม่ได้" รายวัน
//    check-in  : กดปุ่มเดียวว่าวันนี้ทำได้
//    เป้าหมาย  : ต้องทำให้ได้ครบกี่วัน/กี่ครั้ง
//    สำเร็จเมื่อ: จำนวนครั้งที่ check-in ครบตามเป้า
//    ตัวอย่าง  : กินหมูกะทะให้ได้ 10 วัน
//
// 2) COUNT / DISTANCE / TIME / NUMBER — วัดเป็น "ตัวเลขที่สะสมได้"
//    check-in  : กรอกตัวเลขของวันนั้น (เช่น วันนี้วิ่งได้ 3.5 กม.)
//    เป้าหมาย  : ยอดรวมที่ต้องสะสมให้ถึง (เช่น 10 กม.)
//    สำเร็จเมื่อ: ผลรวมของทุก check-in ถึงเป้าที่ตั้งไว้
//    ตัวอย่าง  : วิ่งสะสมให้ครบ 10 กม.
// ────────────────────────────────────────────────────────────────────────────

/** true = วัดด้วยตัวเลขสะสม (ต้องกรอกตัวเลขทุกครั้งที่ check-in) */
export function isAccumulative(type: MeasurementType): boolean {
  return type !== "YES_NO";
}

/** หน่วยเริ่มต้นที่เดาให้ตามวิธีวัดผล — ผู้ใช้แก้เองได้ */
export function defaultUnit(type: MeasurementType): string {
  switch (type) {
    case "DISTANCE":
      return "กม.";
    case "TIME":
      return "นาที";
    case "COUNT":
      return "ครั้ง";
    case "YES_NO":
      return "ครั้ง";
    default:
      return "";
  }
}

/** หัวข้อของช่องกรอกเป้าหมาย ให้ตรงกับวิธีวัดผลที่เลือก */
export function targetLabel(type: MeasurementType): string {
  switch (type) {
    case "YES_NO":
      return "ต้องทำให้ได้กี่ครั้งถึงจะสำเร็จ";
    case "DISTANCE":
      return "ต้องสะสมระยะทางรวมเท่าไหร่ถึงจะสำเร็จ";
    case "TIME":
      return "ต้องสะสมเวลารวมเท่าไหร่ถึงจะสำเร็จ";
    case "COUNT":
      return "ต้องสะสมให้ครบกี่ครั้งถึงจะสำเร็จ";
    default:
      return "ต้องสะสมให้ถึงเท่าไหร่ถึงจะสำเร็จ";
  }
}

/** ข้อความตัวอย่างในช่องกรอกเป้าหมาย */
export function targetPlaceholder(type: MeasurementType): string {
  switch (type) {
    case "YES_NO":
      return "เช่น 10 (จำนวนวันที่ต้องทำให้ได้)";
    case "DISTANCE":
      return "เช่น 10 (ระยะทางรวมที่ต้องสะสม)";
    case "TIME":
      return "เช่น 300 (เวลารวมที่ต้องสะสม)";
    case "COUNT":
      return "เช่น 100 (จำนวนรวมที่ต้องสะสม)";
    default:
      return "เช่น 100";
  }
}

/** คำอธิบายใต้ช่องเป้าหมาย บอกว่าจะต้อง check-in ยังไง */
export function targetHelper(type: MeasurementType, unit: string): string {
  if (!isAccumulative(type)) {
    return "แต่ละวันกดปุ่มเดียวว่า “วันนี้ทำได้” — ครบตามจำนวนนี้เมื่อไหร่ จะได้รับใบไม้ 🍃";
  }
  const u = unit || "หน่วย";
  return `แต่ละครั้งกรอกตัวเลขของวันนั้น (เช่น วันนี้ได้ 3 ${u}) ระบบจะสะสมให้จนครบเป้า แล้วจะได้รับใบไม้ 🍃`;
}

/** หัวข้อปุ่ม/ช่องกรอกตอน check-in */
export function checkInLabel(type: MeasurementType, unit: string): string {
  if (!isAccumulative(type)) return "✓ วันนี้ทำได้";
  const u = unit || "หน่วย";
  return `วันนี้ทำได้เท่าไหร่ (${u})`;
}

/** ข้อความสรุปความคืบหน้า เช่น "ทำไปแล้ว 3.5 / 10 กม." */
export function progressSummaryText(
  type: MeasurementType,
  unit: string,
  done: number,
  target: number
): string {
  const u = unit || (isAccumulative(type) ? "" : "ครั้ง");
  const format = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
  return `ทำไปแล้ว ${format(done)} / ${format(target)}${u ? ` ${u}` : ""}`;
}

/** ข้อความบอกว่าเหลืออีกเท่าไหร่ถึงจะได้ใบไม้ */
export function remainingText(type: MeasurementType, unit: string, remaining: number): string {
  const format = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
  if (!isAccumulative(type)) return `อีก ${format(remaining)} ครั้ง ถึงจะได้รับใบไม้`;
  const u = unit || "หน่วย";
  return `อีก ${format(remaining)} ${u} ถึงจะได้รับใบไม้`;
}

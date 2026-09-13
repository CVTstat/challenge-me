import React from "react";
import { View, StyleSheet } from "react-native";

// ────────────────────────────────────────────────────────────────────────────
// ดารุมะประจำ Challenge — ตุ๊กตาแห่งความหวัง
//
// ทำไมถึงมีทั้งดารุมะและต้นไม้ในแอปเดียวกัน: สองอย่างนี้ทำงานคนละระดับ
//   • ดารุมะ = ระดับ "เป้าหมายรายอัน" — หนึ่งตัวต่อหนึ่ง Challenge
//     พลังของมันคือความค้างคา: ดารุมะตาเดียวมันดูไม่สมบูรณ์ เห็นแล้วอยากเติม
//     ให้ครบ (เติมตาแรก = ให้คำมั่นว่าจะเริ่ม, เติมตาที่สอง = ทำสำเร็จจริง)
//   • ต้นไม้ = ระดับ "ตัวตนและชุมชน" — สะสมความสำเร็จทั้งหมดไว้ในภาพเดียว
//     เห็นสัดส่วนของทั้งชุมชนได้ ซึ่งดารุมะทำไม่ได้ (ดารุมะ 400 ตัวกองรวมกัน
//     ไม่ได้แปลว่าอะไร แต่ใบไม้ 400 ใบบนต้นเดียวกันคือป่าที่ทุกคนช่วยกันปลูก)
//
// ทุกครั้งที่ดารุมะได้ตาครบสองข้าง ต้นไม้จะได้ใบไม้เพิ่ม 1 ใบ
//
// วาดด้วย View ล้วน ๆ เหมือน TreeCanvas — ใช้แค่ "วงกลม" กับ "แท่งมนที่หมุนได้"
// เท่านั้น เพราะ React Native ทำวงรีแท้ไม่ได้ (ทำได้แค่วงกลมกับแคปซูล)
// จึงไม่ต้องพึ่งไลบรารีวาดรูปเพิ่ม และแสดงผลเหมือนกันทั้งบนเว็บและแอป
// ────────────────────────────────────────────────────────────────────────────

const BASE = 200;
const RED = "#d61f3f";
const RED_DARK = "#ae1730";
const CREAM = "#f7e9d2";
const INK = "#2b2118";

export interface DarumaCanvasProps {
  /** 0 = ยังไม่เริ่ม · 1 = เติมตาแรกแล้ว (ให้คำมั่น) · 2 = ทำสำเร็จแล้ว */
  eyes: 0 | 1 | 2;
  /** ความกว้างบนจอ (สูงเท่ากับกว้าง) */
  width?: number;
}

export default function DarumaCanvas({ eyes, width = 200 }: DarumaCanvasProps) {
  const s = width / BASE;

  // วงกลม: กำหนดจุดศูนย์กลางกับรัศมีในระบบพิกัด 200x200 แล้วคูณ scale
  const circle = (cx: number, cy: number, r: number, color: string, extra?: object) => ({
    position: "absolute" as const,
    left: (cx - r) * s,
    top: (cy - r) * s,
    width: r * 2 * s,
    height: r * 2 * s,
    borderRadius: r * s,
    backgroundColor: color,
    ...extra,
  });

  // แท่งมนที่หมุนได้ (ใช้ทำคิ้ว/หนวด/ปาก) — หมุนรอบจุดกึ่งกลางของตัวเอง
  const bar = (cx: number, cy: number, w: number, h: number, angle: number, color: string) => ({
    position: "absolute" as const,
    left: (cx - w / 2) * s,
    top: (cy - h / 2) * s,
    width: w * s,
    height: h * s,
    borderRadius: (h / 2) * s,
    backgroundColor: color,
    transform: [{ rotate: `${angle}deg` }],
  });

  return (
    <View style={[styles.canvas, { width, height: width }]}>
      {/* ลำตัว: วงกลมสองวงขนาดใกล้กันซ้อนกัน ได้ทรงไข่แบบตุ๊กตาล้มลุก */}
      <View style={circle(100, 126, 70, RED)} />
      <View style={circle(100, 88, 60, RED)} />

      {/* เงาโค้งด้านล่าง ให้ดูมีน้ำหนักถ่วงแบบดารุมะจริง */}
      <View style={circle(100, 150, 58, RED_DARK)} />
      <View style={circle(100, 134, 64, RED)} />

      {/* หน้า */}
      <View style={circle(100, 88, 44, CREAM)} />

      {/* คิ้ว */}
      <View style={bar(78, 62, 30, 7, -12, INK)} />
      <View style={bar(122, 62, 30, 7, 12, INK)} />

      {/* ตา — หัวใจของดารุมะ: เติมทีละข้างตามความคืบหน้าจริงเท่านั้น
          ข้างซ้ายเติมตอนให้คำมั่น ข้างขวาเติมตอนทำสำเร็จ */}
      {[80, 120].map((ex, i) =>
        eyes >= i + 1 ? (
          <View key={ex} style={circle(ex, 86, 13, INK)} />
        ) : (
          <View
            key={ex}
            style={circle(ex, 86, 13, "#ffffff", { borderWidth: 2.2 * s, borderColor: INK })}
          />
        )
      )}

      {/* หนวดและปาก */}
      <View style={bar(84, 110, 28, 7, 13, INK)} />
      <View style={bar(116, 110, 28, 7, -13, INK)} />
      <View style={bar(100, 122, 18, 5, 0, INK)} />
    </View>
  );
}

/** แปลงสถานะในฐานข้อมูลเป็นจำนวนตาที่เติมแล้ว */
export function darumaEyesFrom(leftFilledAt: string | null, rightFilledAt: string | null): 0 | 1 | 2 {
  if (rightFilledAt) return 2;
  if (leftFilledAt) return 1;
  return 0;
}

const styles = StyleSheet.create({
  // overflow hidden เพื่อตัดส่วนของวงกลมเงาที่ล้นออกนอกกรอบ
  canvas: { position: "relative", overflow: "hidden" },
});

import React from "react";
import { View, Text, StyleSheet } from "react-native";

// ────────────────────────────────────────────────────────────────────────────
// ดารุมะประจำ Challenge — ตุ๊กตาแห่งความหวัง
//
// ทำไมถึงมีทั้งดารุมะและต้นไม้ในแอปเดียวกัน: สองอย่างนี้ทำงานคนละระดับ
//   • ดารุมะ = ระดับ "เป้าหมายรายอัน" — หนึ่งตัวต่อหนึ่ง Challenge
//     พลังของมันคือความค้างคา: ดารุมะตาเดียวมันดูไม่สมบูรณ์ เห็นแล้วอยากเติม
//     ให้ครบ (เติมตาแรก = ให้คำมั่นว่าจะเริ่ม, เติมตาที่สอง = ทำสำเร็จจริง)
//   • ต้นไม้ = ระดับ "ตัวตนและชุมชน" — สะสมความสำเร็จทั้งหมดไว้ในภาพเดียว
//     เห็นสัดส่วนของทั้งชุมชนได้ ซึ่งดารุมะทำไม่ได้
//
// ทุกครั้งที่ดารุมะได้ตาครบสองข้าง ต้นไม้จะได้ใบไม้เพิ่ม 1 ใบ
//
// รายละเอียดวาดตามดารุมะของจริง: ลายเปลวไฟทองสองข้างลำตัว อักษรมงคลบนพุง
// ใบหน้าครีมล้อมด้วยวงสีส้ม คิ้วหนาทรงนกกระเรียน ตามีวงแหวนทอง หนวดทรงเต่า
// และปากแดง — ทั้งหมดประกอบจาก "วงกลม" กับ "แท่งมนที่หมุนได้" เท่านั้น
// เพราะ React Native ทำวงรีแท้ไม่ได้ จึงไม่ต้องพึ่งไลบรารีวาดรูปเพิ่มเลย
// (เทคนิคเดียวกับ TreeCanvas)
// ────────────────────────────────────────────────────────────────────────────

const BASE = 200;
const RED = "#d61f3f";
const RED_DARK = "#a81529";
const CREAM = "#fdf6ec";
const INK = "#241c15";
const GOLD = "#e8b94a";
const ORANGE = "#f2a02c";
const LIP = "#e0402f";

export interface DarumaCanvasProps {
  /** 0 = ยังไม่เริ่ม · 1 = เติมตาแรกแล้ว (ให้คำมั่น) · 2 = ทำสำเร็จแล้ว */
  eyes: 0 | 1 | 2;
  /** ความกว้างบนจอ (สูงเท่ากับกว้าง) */
  width?: number;
  /**
   * วาดรายละเอียดปลีกย่อยไหม (ลายทอง ขนคิ้ว เส้นหนวด อักษรบนพุง)
   * ค่าเริ่มต้นจะปิดเองเมื่อขนาดเล็กกว่า 64 เพราะรายละเอียดจะเละจนอ่านไม่ออก
   */
  detail?: boolean;
}

export default function DarumaCanvas({ eyes, width = 200, detail }: DarumaCanvasProps) {
  const s = width / BASE;
  const showDetail = detail ?? width >= 64;

  // วงกลม: ระบุจุดศูนย์กลางกับรัศมีในระบบพิกัด 200x200 แล้วคูณ scale
  const circle = (cx: number, cy: number, r: number, color: string) => ({
    position: "absolute" as const,
    left: (cx - r) * s,
    top: (cy - r) * s,
    width: r * 2 * s,
    height: r * 2 * s,
    borderRadius: r * s,
    backgroundColor: color,
  });

  // แท่งมนที่หมุนรอบจุดกึ่งกลางตัวเอง (ใช้ทำคิ้ว หนวด ปาก และลายเปลวไฟ)
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

  // ลายเปลวไฟทองสองข้างลำตัว — เรียงเป็นพัดตามขอบ ไม่ล้นออกนอกทรง
  const flames: { key: string; style: object }[] = [];
  if (showDetail) {
    [145, 170, 195, 220].forEach((a) => {
      [a, 180 - a].forEach((side) => {
        const rad = (side * Math.PI) / 180;
        flames.push({
          key: `f${side}`,
          style: bar(100 + 48 * Math.cos(rad), 120 + 48 * Math.sin(rad), 23, 7, -side, GOLD),
        });
      });
    });
  }

  const sides: (-1 | 1)[] = [-1, 1];

  // ตอนย่อเล็ก (เช่น 34px ในรายการ) รายละเอียดจะถูกตัดออก — ถ้ายังใช้สัดส่วน
  // เดิมอยู่ ใบหน้ากับตาจะเล็กจนดูไม่ออกว่าเติมตาไปกี่ข้างแล้ว ซึ่งเป็นข้อมูล
  // ที่สำคัญที่สุดของดารุมะ จึงขยายหน้าและตาให้ใหญ่ขึ้นเฉพาะตอนย่อเล็ก
  const c = !showDetail;
  const faceR = c ? 45 : 38;
  const eyeDx = c ? 20 : 17;
  const eyeCy = c ? 78 : 79;
  const eyeRingR = c ? 15 : 12.5;
  const eyeR = c ? 12 : 10;

  return (
    <View style={[styles.canvas, { width, height: width }]}>
      {/* ── ลำตัว: วงกลมสองวงซ้อนกันได้ทรงตุ๊กตาล้มลุก ── */}
      <View style={circle(100, 126, 70, RED)} />
      <View style={circle(100, 88, 60, RED)} />
      {/* เงาเสี้ยวที่ก้น: วงในสัมผัสขอบล่างพอดี แล้วทับด้านบนด้วยสีแดงอีกที
          จึงไม่มีทางล้นออกนอกเส้นรอบรูป (เคยพลาดตรงนี้ทำให้ขอบแหว่ง) */}
      <View style={circle(100, 138, 58, RED_DARK)} />
      <View style={circle(100, 128, 62, RED)} />

      {/* ── ลายทอง ── */}
      {flames.map((f) => (
        <View key={f.key} style={f.style} />
      ))}

      {/* ── อักษรมงคลบนพุง (ซ่อนตอนย่อเล็ก) ── */}
      {showDetail && width >= 90 && (
        <Text
          style={[
            styles.kanji,
            { top: 138 * s, fontSize: 26 * s, lineHeight: 28 * s, color: GOLD },
          ]}
        >
          金
        </Text>
      )}

      {/* ── ใบหน้า: วงส้มรอบนอก + หน้าครีม ── */}
      <View style={circle(100, 82, faceR + 3, ORANGE)} />
      <View style={circle(100, 82, faceR, CREAM)} />

      {/* ── คิ้วหนาทรงนกกระเรียน ── */}
      {sides.map((sgn) => (
        <View
          key={`brow${sgn}`}
          style={c ? bar(100 + sgn * 20, 52, 30, 9, -sgn * 17, INK) : bar(100 + sgn * 17, 56, 26, 8, -sgn * 15, INK)}
        />
      ))}
      {showDetail &&
        sides.map((sgn) => (
          <React.Fragment key={`browx${sgn}`}>
            <View style={bar(100 + sgn * 20, 49, 17, 4, -sgn * 24, INK)} />
            <View style={bar(100 + sgn * 11, 62, 14, 4, -sgn * 6, INK)} />
          </React.Fragment>
        ))}

      {/* ── ตา: วงแหวนทองรอบนอก แล้วเติมทีละข้างตามความคืบหน้าจริง ── */}
      {sides.map((sgn, i) => {
        const ex = 100 + sgn * eyeDx;
        const filled = eyes >= i + 1;
        return (
          <React.Fragment key={`eye${sgn}`}>
            <View style={circle(ex, eyeCy, eyeRingR, ORANGE)} />
            <View style={circle(ex, eyeCy, eyeR, filled ? INK : "#ffffff")} />
            {filled && showDetail && <View style={circle(ex - 3, 76, 3, "#ffffff")} />}
          </React.Fragment>
        );
      })}

      {/* ── หนวดทรงเต่า ── */}
      {sides.map((sgn) => (
        <React.Fragment key={`must${sgn}`}>
          <View
            style={c ? bar(100 + sgn * 22, 100, 26, 11, sgn * 16, INK) : bar(100 + sgn * 19, 96, 24, 10, sgn * 16, INK)}
          />
          {showDetail && <View style={bar(100 + sgn * 28, 104, 14, 3, sgn * 26, INK)} />}
        </React.Fragment>
      ))}

      {/* ── ปาก + เส้นหนวดล่าง ── */}
      <View style={c ? bar(100, 112, 14, 6, 0, LIP) : bar(100, 105, 13, 6, 0, LIP)} />
      {showDetail &&
        sides.map((sgn) => (
          <React.Fragment key={`wh${sgn}`}>
            <View style={bar(100 + sgn * 8, 112, 12, 2.6, sgn * 14, INK)} />
            <View style={bar(100 + sgn * 6, 117, 10, 2.6, sgn * 22, INK)} />
          </React.Fragment>
        ))}
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
  // overflow hidden กันส่วนที่ล้นกรอบ (ถ้ามี) ไม่ให้ทับ layout อื่น
  canvas: { position: "relative", overflow: "hidden" },
  kanji: { position: "absolute", left: 0, right: 0, textAlign: "center", fontWeight: "700" },
});

import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";

// ────────────────────────────────────────────────────────────────────────────
// ต้นไม้แห่งความสำเร็จ (แทนที่ Daruma เดิม)
//
// แนวคิด: ทุกคนเริ่มจาก "ต้นไม้ที่มีแต่กิ่ง ไม่มีใบ" — ทุกความสำเร็จที่ทำได้
// จริง = ใบไม้ 1 ใบที่ไปติดบนต้น ทำไปเรื่อย ๆ จนต้นไม้เขียวชอุ่ม
//   • ใบเขียวเต็มใบ  = ความสำเร็จที่ทำได้แล้ว
//   • ตุ่มใบอ่อน     = ความพยายามที่กำลังทำอยู่ (ยังไม่สำเร็จ แต่กำลังโต)
//   • จุดจาง ๆ       = ที่ว่างที่รอใบไม้ใบต่อไป
//
// วาดด้วย View ล้วน ๆ ทั้งหมด ไม่ใช้ไลบรารีวาดรูปเพิ่ม (เช่น react-native-svg)
// ตั้งใจเลือกแบบนี้เพราะ: ไม่ต้องเพิ่ม dependency ใหม่ที่อาจทำ build บน Vercel
// พัง และทำงานได้เหมือนกันทั้งบนเว็บและบนแอปมือถือ
// ────────────────────────────────────────────────────────────────────────────

// ระบบพิกัดออกแบบบน canvas ขนาด 260x260 หน่วย แล้วค่อยคูณ scale ตามขนาดจริง
const BASE = 260;

type Segment = { x1: number; y1: number; x2: number; y2: number; thickness: number };
type Slot = { x: number; y: number; rotate: number };

// สุ่มแบบมี seed คงที่ (LCG) — ต้นไม้จะหน้าตาเหมือนเดิมทุกครั้งที่เปิดแอป
// ไม่ใช่สุ่มใหม่ทุก render ซึ่งจะทำให้ใบไม้เต้นไปมา
function makeRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function buildTree() {
  const segments: Segment[] = [];
  const tips: { x: number; y: number; depth: number }[] = [];
  const rand = makeRandom(20250913);

  function grow(x: number, y: number, angleDeg: number, length: number, thickness: number, depth: number) {
    const rad = (angleDeg * Math.PI) / 180;
    const x2 = x + Math.cos(rad) * length;
    const y2 = y + Math.sin(rad) * length;
    segments.push({ x1: x, y1: y, x2, y2, thickness });
    tips.push({ x: x2, y: y2, depth });

    if (depth <= 0) return;
    const spread = 20 + depth * 3;
    const wobble = () => (rand() - 0.5) * 14;
    grow(x2, y2, angleDeg - spread + wobble(), length * 0.74, thickness * 0.68, depth - 1);
    grow(x2, y2, angleDeg + spread + wobble(), length * 0.72, thickness * 0.68, depth - 1);
    // กิ่งแทรกกลางเฉพาะช่วงกลางต้น ให้ทรงพุ่มดูแน่นขึ้น ไม่โล่งเป็นตัว Y
    if (depth === 3) grow(x2, y2, angleDeg + wobble(), length * 0.62, thickness * 0.55, depth - 2);
  }

  // เริ่มจากโคนต้น (กลางล่าง) ชี้ขึ้นข้างบน (-90 องศา เพราะแกน y เพิ่มลงล่าง)
  grow(BASE / 2, 244, -90, 60, 15, 4);

  // ตำแหน่งใบไม้: เอาปลายกิ่งเล็ก ๆ (depth ต่ำ) มาเป็นจุดติดใบ แล้วกระจาย
  // รอบ ๆ จุดละ 2-3 ใบ ให้ดูเป็นพุ่มธรรมชาติ ไม่ใช่เรียงเป็นแถว
  const slots: Slot[] = [];
  tips
    .filter((t) => t.depth <= 1)
    .forEach((t) => {
      const count = t.depth === 0 ? 3 : 2;
      for (let i = 0; i < count; i++) {
        slots.push({
          x: t.x + (rand() - 0.5) * 20,
          y: t.y + (rand() - 0.5) * 18,
          rotate: rand() * 360,
        });
      }
    });

  // สลับลำดับแบบ seed คงที่ — เวลามีใบไม้ไม่กี่ใบ จะได้กระจายทั่วต้น
  // ไม่ไปกองอยู่มุมเดียว (ถ้าเรียงตามลำดับที่สร้าง ใบแรก ๆ จะกองข้างเดียว)
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }

  return { segments, slots };
}

const TREE = buildTree();
export const TREE_CAPACITY = TREE.slots.length;

const LEAF_COLORS = ["#3d8b40", "#4caf50", "#5cb85c", "#2e7d32", "#76c479", "#43a047"];

export interface TreeCanvasProps {
  /** จำนวนความสำเร็จที่ทำได้แล้ว = ใบไม้เขียวเต็มใบ */
  leaves: number;
  /** จำนวนความพยายามที่ยังทำอยู่ = ตุ่มใบอ่อนที่กำลังจะเป็นใบ */
  buds?: number;
  /** ความกว้างของต้นไม้บนจอ (สูงเท่ากับกว้าง) */
  width?: number;
  /** โชว์จุดจาง ๆ ตรงที่ว่างที่ยังไม่มีใบไหม */
  showEmptySlots?: boolean;
}

export default function TreeCanvas({ leaves, buds = 0, width = 260, showEmptySlots = true }: TreeCanvasProps) {
  const scale = width / BASE;
  const filled = Math.max(0, Math.min(TREE_CAPACITY, Math.round(leaves)));
  const budCount = Math.max(0, Math.min(TREE_CAPACITY - filled, Math.round(buds)));

  const nodes = useMemo(() => {
    return TREE.slots.map((slot, index) => {
      const kind = index < filled ? "leaf" : index < filled + budCount ? "bud" : "empty";
      return { slot, kind, index };
    });
  }, [filled, budCount]);

  return (
    <View style={[styles.canvas, { width, height: width }]}>
      {/* พื้นดิน */}
      <View
        style={[
          styles.ground,
          {
            left: width * 0.22,
            top: width * 0.925,
            width: width * 0.56,
            height: width * 0.045,
            borderRadius: width * 0.03,
          },
        ]}
      />

      {/* กิ่งก้าน */}
      {TREE.segments.map((seg, i) => {
        const dx = seg.x2 - seg.x1;
        const dy = seg.y2 - seg.y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        const cx = (seg.x1 + seg.x2) / 2;
        const cy = (seg.y1 + seg.y2) / 2;
        const t = Math.max(1.6, seg.thickness) * scale;
        return (
          <View
            key={`b${i}`}
            style={{
              position: "absolute",
              left: (cx * scale) - (length * scale) / 2,
              top: cy * scale - t / 2,
              width: length * scale,
              height: t,
              borderRadius: t / 2,
              backgroundColor: "#7a5a3d",
              transform: [{ rotate: `${angle}deg` }],
            }}
          />
        );
      })}

      {/* ใบไม้ / ตุ่มใบ / ที่ว่าง */}
      {nodes.map(({ slot, kind, index }) => {
        if (kind === "empty" && !showEmptySlots) return null;
        const leafW = (kind === "leaf" ? 13 : kind === "bud" ? 9 : 5) * scale;
        const leafH = (kind === "leaf" ? 9 : kind === "bud" ? 7 : 5) * scale;
        const color =
          kind === "leaf"
            ? LEAF_COLORS[index % LEAF_COLORS.length]
            : kind === "bud"
              ? "#b7dfa0"
              : "#d8d3cc";
        return (
          <View
            key={`l${index}`}
            style={{
              position: "absolute",
              left: slot.x * scale - leafW / 2,
              top: slot.y * scale - leafH / 2,
              width: leafW,
              height: leafH,
              backgroundColor: color,
              opacity: kind === "empty" ? 0.35 : 1,
              // ทำทรงใบไม้ด้วย border radius มุมทแยง (มุมบนซ้าย/ล่างขวามน
              // อีกสองมุมแหลม) — ได้ทรงใบไม้โดยไม่ต้องใช้ SVG
              borderTopLeftRadius: leafW,
              borderBottomRightRadius: leafW,
              transform: [{ rotate: `${slot.rotate}deg` }],
            }}
          />
        );
      })}
    </View>
  );
}

/**
 * เป้าหมายใบไม้ขั้นถัดไป — ต้นไม้จะได้ไม่เต็มแล้วจบ แต่ขยับเป้าขึ้นเรื่อย ๆ
 * ใช้ทั้งกับต้นไม้ส่วนตัวและต้นไม้รวมของทั้งแพลตฟอร์ม
 */
export function nextMilestone(count: number) {
  const steps = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];
  for (const s of steps) {
    if (count < s) return s;
  }
  return Math.ceil((count + 1) / 10000) * 10000;
}

const styles = StyleSheet.create({
  canvas: { position: "relative" },
  ground: { position: "absolute", backgroundColor: "#e6ddd1" },
});

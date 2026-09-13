// ต้นไม้แห่งความสำเร็จ — เชื่อมกับ supabase/migrations/0007_tree_stats.sql
//
// ธีมของแอป: ทุกคนเริ่มจากต้นไม้ที่มีแต่กิ่ง ไม่มีใบเลย ทุกความสำเร็จที่ทำได้
// จริง = ใบไม้ 1 ใบที่ไปติดบนต้น ทำไปเรื่อย ๆ จนต้นเขียวชอุ่ม
//   • ต้นของเราเอง      — ความสำเร็จส่วนตัว
//   • ต้นของทั้งชุมชน   — ความสำเร็จของทุกคนในแพลตฟอร์มรวมกันเป็นต้นเดียว

import { supabase } from "@/lib/supabase";

export interface TreeStats {
  /** ใบไม้รวมของทั้งแพลตฟอร์ม = ความสำเร็จของทุกคนรวมกัน */
  platformLeaves: number;
  /** ความพยายามที่ยังทำอยู่ของทุกคนรวมกัน */
  platformGrowing: number;
  /** จำนวนคนที่มีต้นไม้แล้ว */
  platformGrowers: number;
  /** ใบไม้ของเราเอง */
  myLeaves: number;
  /** ความพยายามที่เรากำลังทำอยู่ */
  myGrowing: number;
}

const EMPTY_STATS: TreeStats = {
  platformLeaves: 0,
  platformGrowing: 0,
  platformGrowers: 0,
  myLeaves: 0,
  myGrowing: 0,
};

/**
 * ดึงตัวเลขต้นไม้ทั้งของเราและของทั้งแพลตฟอร์มในครั้งเดียว
 *
 * ต้องเรียกผ่าน RPC (ไม่ใช่ query ตาราง daruma ตรง ๆ) เพราะ RLS ยอมให้ client
 * เห็นเฉพาะ challenge ที่ตัวเองมีสิทธิ์ — จะนับยอดรวมของทั้งแพลตฟอร์มไม่ได้
 * ฝั่ง SQL เป็น SECURITY DEFINER ที่คืนค่าออกมาเป็นตัวเลขรวมล้วน ๆ เท่านั้น
 */
export async function getTreeStats(): Promise<{ stats: TreeStats; error: string | null }> {
  const { data, error } = await supabase.rpc("get_tree_stats");
  if (error) return { stats: EMPTY_STATS, error: error.message };

  // ฟังก์ชัน returns table -> supabase คืนเป็น array ที่มีแถวเดียว
  const row = (Array.isArray(data) ? data[0] : data) as Record<string, number | string | null> | null;
  if (!row) return { stats: EMPTY_STATS, error: null };

  const num = (v: number | string | null | undefined) => Number(v ?? 0) || 0;
  return {
    stats: {
      platformLeaves: num(row.platform_leaves),
      platformGrowing: num(row.platform_growing),
      platformGrowers: num(row.platform_growers),
      myLeaves: num(row.my_leaves),
      myGrowing: num(row.my_growing),
    },
    error: null,
  };
}

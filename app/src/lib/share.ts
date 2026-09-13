import { Platform, Share } from "react-native";
import { showAlert } from "@/lib/alert";

// ────────────────────────────────────────────────────────────────────────────
// ตัวช่วยแชร์กลางของทั้งแอป
//
// หมายเหตุ (แก้บั๊ก): Share ของ React Native ใช้ไม่ได้จริงบนเว็บ —
// react-native-web ไม่ได้ implement ให้ พอกดปุ่มแชร์บนเว็บเลยเงียบ ไม่มีอะไร
// เกิดขึ้นเลย (เป็นสาเหตุที่ปุ่ม "แชร์ความคืบหน้า" กดแล้วไม่เด้งอะไรมา)
//
// ไฟล์นี้รวมวิธีแชร์ที่ถูกต้องของแต่ละแพลตฟอร์มไว้ที่เดียว:
//   • เว็บ      → navigator.share (share sheet ของเครื่อง) ถ้าไม่มีก็คัดลอกให้แทน
//   • iOS      → Share.share แบบแยก message กับ url ได้
//   • Android  → Share.share ที่ต้องต่อลิงก์ท้ายข้อความเอง (ไม่มี field url)
//
// สำคัญ: อย่าใส่ url ซ้ำลงไปใน message เองแล้วส่ง url แยกไปด้วย เพราะบางแอป
// (เช่น LINE) จะเอาสองค่ามาต่อกัน กลายเป็นลิงก์โผล่ซ้ำสองรอบ และทำให้พรีวิว
// ลิงก์ไม่ขึ้น — ปล่อยให้ฟังก์ชันนี้จัดการเรื่องนี้ให้จุดเดียว
// ────────────────────────────────────────────────────────────────────────────

export interface ShareContentInput {
  /** หัวข้อ (บางแพลตฟอร์มเท่านั้นที่ใช้) */
  title?: string;
  /** ข้อความชวน — ห้ามใส่ลิงก์ซ้ำในนี้ ให้ส่งผ่าน url แทน */
  message: string;
  /** ลิงก์ที่อยากแนบไปด้วย (ถ้ามี) */
  url?: string;
  /** ข้อความที่จะบอกผู้ใช้ตอน fallback เป็นการคัดลอกแทน */
  copiedHint?: string;
}

/**
 * เปิด share sheet ของเครื่องให้ผู้ใช้เลือกแอปที่จะแชร์ไป
 * คืนค่า true ถ้าเปิดกล่องแชร์ (หรือคัดลอกให้) สำเร็จ
 */
export async function shareContent({ title, message, url, copiedHint }: ShareContentInput): Promise<boolean> {
  try {
    if (Platform.OS === "web") {
      const nav = typeof navigator !== "undefined" ? (navigator as any) : null;
      if (nav?.share) {
        await nav.share({ title: title ?? "Challenge Me", text: message, ...(url ? { url } : {}) });
        return true;
      }
      // เบราว์เซอร์ที่ไม่มี share sheet (ส่วนใหญ่คือเดสก์ท็อป) — คัดลอกให้แทน
      const fallbackText = url ? `${message}\n${url}` : message;
      if (nav?.clipboard?.writeText) {
        await nav.clipboard.writeText(fallbackText);
        showAlert("คัดลอกให้แล้ว", copiedHint ?? "วางข้อความนี้ในแอปที่อยากแชร์ได้เลย");
        return true;
      }
      showAlert("แชร์ไม่ได้", "เบราว์เซอร์นี้ไม่รองรับการแชร์อัตโนมัติ");
      return false;
    }

    if (Platform.OS === "ios") {
      await Share.share(url ? { message, url } : { message });
      return true;
    }

    // Android: ไม่มี field url แยก ต้องต่อท้ายข้อความเอง
    await Share.share({ message: url ? `${message}\n${url}` : message });
    return true;
  } catch {
    // ผู้ใช้กดยกเลิกกล่องแชร์เอง — ไม่ใช่ error ที่ต้องแจ้ง
    return false;
  }
}

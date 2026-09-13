// react-native-web ไม่ได้ implement Alert.alert() ให้ขึ้นเป็น popup จริงบนเว็บ
// (บนมือถือ/Expo Go ใช้ Alert.alert ปกติได้ แต่พอ build ขึ้นเว็บ เช่น Vercel
// เรียกแล้วจะไม่มีอะไรเกิดขึ้นให้ผู้ใช้เห็นเลย ทั้งตอนสำเร็จและ error) —
// ใช้ showAlert() ตัวนี้แทน Alert.alert() ทุกที่ เพื่อให้ error/ข้อความสำคัญ
// โชว์ให้ผู้ใช้เห็นจริง ๆ ไม่ว่าจะเปิดแอปจาก native หรือจากเว็บ
import { Alert, Platform } from "react-native";

export function showAlert(title: string, message?: string) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && typeof window.alert === "function") {
      window.alert(message ? `${title}\n\n${message}` : title);
    }
    return;
  }
  Alert.alert(title, message);
}

/**
 * กล่องยืนยันก่อนทำสิ่งที่ย้อนกลับไม่ได้ (เช่น ลบ Challenge)
 * คืนค่า true เมื่อผู้ใช้กดยืนยัน — ด้วยเหตุผลเดียวกับ showAlert คือบนเว็บต้อง
 * ใช้ window.confirm เพราะ Alert ของ React Native ใช้ไม่ได้จริงบน react-native-web
 */
export function showConfirm(
  title: string,
  message: string,
  confirmLabel = "ยืนยัน",
  cancelLabel = "ยกเลิก"
): Promise<boolean> {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && typeof window.confirm === "function") {
      return Promise.resolve(window.confirm(`${title}\n\n${message}`));
    }
    // ไม่มี confirm ให้ใช้ — ถือว่าไม่ยืนยัน ปลอดภัยกว่าเผลอลบ
    return Promise.resolve(false);
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: cancelLabel, style: "cancel", onPress: () => resolve(false) },
      { text: confirmLabel, style: "destructive", onPress: () => resolve(true) },
    ]);
  });
}

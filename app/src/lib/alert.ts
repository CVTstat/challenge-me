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

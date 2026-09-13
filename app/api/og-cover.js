// เสิร์ฟรูปภาพ Open Graph (og:image) ที่ใช้ตอนแชร์ลิงก์ "ท้าเพื่อน" ไปยัง
// Facebook/LINE/ฯลฯ ทำเป็นฟังก์ชันแยกต่างหาก (แทนที่จะพึ่ง Expo web export
// คัดลอกไฟล์ static ให้ ซึ่งไม่แน่ใจว่าทำงานแน่นอนกับ config ปัจจุบัน) เพื่อให้
// มั่นใจว่ารูปนี้เข้าถึงได้แน่ ๆ ผ่านกลไกเดียวกับ api/invite/[token].js ที่ยืนยัน
// แล้วว่าใช้งานได้จริงบน Vercel
const fs = require("fs");
const path = require("path");

module.exports = function handler(req, res) {
  try {
    const imgPath = path.join(__dirname, "_assets", "og-cover.png");
    const buf = fs.readFileSync(imgPath);
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=86400, immutable");
    res.status(200).send(buf);
  } catch (e) {
    res.status(404).send("not found");
  }
};

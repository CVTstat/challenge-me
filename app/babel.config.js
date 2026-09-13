module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // ทำให้ import "@/..." (ที่ tsconfig.json ประกาศไว้เป็น path alias
      // สำหรับ type-check) ใช้งานได้จริงตอน bundle ด้วย Metro — แค่ tsconfig
      // paths อย่างเดียวไม่พอ ต้องมี plugin นี้ resolve ให้ runtime ด้วย
      [
        "module-resolver",
        {
          root: ["./"],
          alias: { "@": "./src" },
          extensions: [".ios.js", ".android.js", ".js", ".jsx", ".ts", ".tsx", ".json"],
        },
      ],
    ],
  };
};

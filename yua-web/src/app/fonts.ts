import localFont from "next/font/local";

export const pretendard = localFont({
  src: [
    {
      path: "./Pretendard-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./Pretendard-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "./Pretendard-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
  ],
  display: "block", // 🔥 핵심: swap ❌, block ⭕
});

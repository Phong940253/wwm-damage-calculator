/** @type {import('next').NextConfig} */
const nextConfig = {
  // Nếu biến IS_BUILDING=true, đổi thư mục dist sang '.next-prod'
  distDir: process.env.IS_BUILDING === "true" ? ".next-prod" : ".next",

  // Các cấu hình khác của bạn giữ nguyên...
};

export default nextConfig;

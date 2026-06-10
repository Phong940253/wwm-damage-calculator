/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1. Nếu đang build trên Vercel: Luôn dùng mặc định '.next'
  // 2. Nếu đang build ở Local (có IS_BUILDING): Dùng '.next-prod'
  // 3. Nếu đang chạy dev: Dùng '.next'
  distDir: process.env.VERCEL
    ? ".next"
    : process.env.IS_BUILDING === "true"
      ? ".next-prod"
      : ".next",

  // Các cấu hình khác...
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // ⚠️ 警告：这将忽略所有类型错误，仅建议在演示 Demo 时使用
    ignoreBuildErrors: true,
  },
};

export default nextConfig;

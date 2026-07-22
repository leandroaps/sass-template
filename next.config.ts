import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // "standalone" gera um servidor Node mínimo em .next/standalone,
  // essencial para imagens Docker pequenas (~150MB vs ~1GB).
  output: "standalone",
};

export default withNextIntl(nextConfig);

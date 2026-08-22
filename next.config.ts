import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
  env: {
    // Analytics: Mark this project as created via create-cloudinary-next CLI
    CLOUDINARY_SOURCE: "cli",
  },
};

export default nextConfig;

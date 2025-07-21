// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist", // default output
  },
  server: {
    port: 3000,
  },
  base: "/", // 👈 ensures correct asset paths
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  base: "./",

  plugins: [react()],

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          echarts: ["echarts", "echarts-for-react"],
          zrender: ["zrender"],
          react: ["react", "react-dom", "scheduler"],
        },
      },
    },
  },
});

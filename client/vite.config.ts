import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import electron from "vite-plugin-electron";
import renderer from "vite-plugin-electron-renderer";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        // Main process entry file of the Electron App.
        entry: "electron/main.ts",
        vite: {
          build: {
            rollupOptions: {
              external: ["electron"],
              output: {
                format: "cjs",
              },
            },
          },
        },
      },
      {
        entry: "electron/preload.ts",
        vite: {
          build: {
            rollupOptions: {
              external: ["electron"],
              output: {
                format: "cjs",
              },
            },
          },
        },
      },
    ]),
    renderer(),
  ],
});

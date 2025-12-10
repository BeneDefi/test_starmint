import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path, { dirname } from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "url";
import glsl from "vite-plugin-glsl";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    glsl(), // GLSL shader support
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
  optimizeDeps: {
    include: ['@phosphor-icons/react', 'viem'],
    esbuildOptions: {
      target: 'esnext',
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
  },
  base: "./", 
  assetsInclude: [
    "**/*.gltf",
    "**/*.glb",
    "**/*.mp3",
    "**/*.ogg",
    "**/*.wav",
  ],
  server: {
    port: 5000,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
  },
  preview: {
    port: 5000,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});

var _a;
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        host: true,
        proxy: {
            "/api": {
                target: (_a = process.env.VITE_API_BASE_URL) !== null && _a !== void 0 ? _a : "http://localhost:8080",
                changeOrigin: true,
                rewrite: function (path) { return path.replace(/^\/api/, ""); }
            }
        }
    },
    test: {
        include: ["tests/**/*.test.ts"],
        environment: "node"
    }
});

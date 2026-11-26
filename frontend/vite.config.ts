import { execSync } from "node:child_process";
import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** معرّف ثابت لكل commit — يُستخدم في كشف النسخ الجديدة وفي version.json. */
function resolveBuildId(): string {
  if (process.env.VITE_APP_BUILD_ID) return process.env.VITE_APP_BUILD_ID;
  try {
    return (
      execSync("git rev-parse --short HEAD", {
        cwd: __dirname,
        stdio: ["ignore", "pipe", "ignore"],
      })
        .toString()
        .trim() || "dev"
    );
  } catch {
    return "dev";
  }
}

const buildId = resolveBuildId();

/** يُنشر version.json مع كل بناء ليتحقق المتصفح من وجود نسخة أحدث. */
function versionFile(version: string): Plugin {
  return {
    name: "awexen-version-file",
    apply: "build",
    enforce: "post",
    generateBundle(_options, bundle) {
      // الصفحة الرئيسية هي أول صفحة لمعظم الزائرين؛ نبدأ تحميلها مع الـ entry
      // بدل انتظار React ثم طلبها، مما يقلل LCP بمدة دورة شبكة كاملة.
      const homeChunk = Object.values(bundle).find(
        (item) => item.type === "chunk" && /(^|\/)Home-[^/]+\.js$/.test(item.fileName),
      );
      const html = bundle["index.html"];
      if (homeChunk && html && html.type === "asset") {
        html.source = String(html.source).replace(
          "</head>",
          `    <link rel="modulepreload" crossorigin href="/${homeChunk.fileName}" />\n  </head>`,
        );
      }
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: JSON.stringify({ version, builtAt: new Date().toISOString() }),
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), versionFile(buildId)],
  define: {
    __APP_BUILD_ID__: JSON.stringify(buildId),
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/@supabase")) return "supabase-vendor";
          if (id.includes("node_modules/@tanstack")) return "query-vendor";
          if (id.includes("node_modules/lucide-react")) return "icons-vendor";
          if (id.includes("node_modules/react") || id.includes("node_modules/react-router")) return "react-vendor";
          return undefined;
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});

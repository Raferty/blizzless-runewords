import { fileURLToPath, URL } from "url";
import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_RELEASE_DATE");
  const releaseDate =
    env.VITE_RELEASE_DATE ||
    new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Europe/Moscow",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

  const parsedDate = new Date(`${releaseDate}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(releaseDate) ||
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== releaseDate
  ) {
    throw new Error("VITE_RELEASE_DATE must be a valid date in YYYY-MM-DD format");
  }

  return {
    base: "/blizzless-runewords/",
    plugins: [
      vue(),
      {
        name: "d2r-saver-browser-loader",
        enforce: "pre",
        resolveId(source, importer, options) {
          if (
            !options.ssr &&
            source === "./loader.js" &&
            importer?.endsWith("/d2r-saver/dist/game-data/game-data.js")
          )
            return fileURLToPath(
              new URL("./src/utils/planner-data-loader.ts", import.meta.url)
            );
        },
      },
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.endsWith("/src/shared/planner-affixes.json")) return "planner-affixes";
            if (id.endsWith("/src/shared/planner-item-art.json"))
              return "planner-item-art";
          },
        },
      },
    },
    define: {
      "import.meta.env.VITE_RELEASE_DATE": JSON.stringify(releaseDate),
    },
    resolve: {
      alias: [
        {
          find: "@",
          replacement: fileURLToPath(new URL("./src", import.meta.url)),
        },
      ],
    },
  };
});

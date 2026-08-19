const esbuild = require("esbuild");
const path = require("path");

const watch = process.argv.includes("--watch");

const buildOptions = {
  entryPoints: [
    path.join(__dirname, "..", "webview", "index.tsx"),
    path.join(__dirname, "..", "webview", "dashboard.tsx")
  ],
  outdir: path.join(__dirname, "..", "dist"),
  bundle: true,
  minify: process.env.NODE_ENV === "production",
  sourcemap: true,
  platform: "browser",
  target: "es2020",
  format: "iife",
  loader: {
    ".css": "css",
    ".tsx": "tsx",
    ".ts": "ts",
  },
  logLevel: "info",
  entryNames: "[name]",
};

if (watch) {
  esbuild.context(buildOptions).then(ctx => {
    ctx.watch();
    console.log("Watching webview for changes...");
  });
} else {
  esbuild.buildSync(buildOptions);
  console.log("Webview bundles built successfully");
}

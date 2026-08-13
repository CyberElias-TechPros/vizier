const esbuild = require("esbuild");
const path = require("path");

const watch = process.argv.includes("--watch");

const buildOptions = {
  entryPoints: [path.join(__dirname, "..", "webview", "index.tsx")],
  outfile: path.join(__dirname, "..", "dist", "webview.js"),
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
};

if (watch) {
  esbuild.context(buildOptions).then(ctx => {
    ctx.watch();
    console.log("Watching webview for changes...");
  });
} else {
  esbuild.buildSync(buildOptions);
  console.log("Webview bundle built successfully");
}

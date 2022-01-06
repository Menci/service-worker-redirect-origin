import path from "path";
import fs from "fs";

import * as esbuild from "esbuild";
import terser from "terser";

export const buildPromise = (async () => {
  const distDir = path.resolve(__dirname, "dist");
  fs.rmSync(distDir, { recursive: true, force: true });
  fs.mkdirSync(distDir);

  const result = await esbuild.build({
    entryPoints: ["installer.ts", "service-worker.ts"].map(file => path.resolve(__dirname, "src", file)),
    bundle: true,
    platform: "node",
    outdir: distDir,
    logLevel: "info",
    write: false
  });

  for (const outputFile of result.outputFiles) {
    const minifyOutput = await terser.minify(outputFile.text, { toplevel: true });
    fs.writeFileSync(outputFile.path, minifyOutput.code);
  }
})();

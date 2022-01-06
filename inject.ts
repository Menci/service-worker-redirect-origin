import fs from "fs";
import path from "path";

import cheerio from "cheerio";
import terser from "terser";
import klaw from "klaw";

import { buildPromise } from "./build";

const wwwRoot = process.argv[2];
const targetBaseUrl = process.argv[3];
const serviceWorkerFilename = process.argv[4] || "sw.js";

if (!wwwRoot || !targetBaseUrl) {
  console.error("Usage: inject <wwwRoot> <targetBaseUrl> [serviceWorkerFilename]");
  process.exit(1);
}

function isHtmlFilePath(filePath: string) {
  const normalizedFilePath = filePath.toLowerCase();
  return normalizedFilePath.endsWith(".html") || normalizedFilePath.endsWith(".htm");
}

(async () => {
  // Wait for build
  await buildPromise;

  // Prepare installer script

  const installerTemplate = fs.readFileSync(path.resolve(__dirname, "dist/installer.js"), "utf-8");

  const replacedInstaller = installerTemplate
    .replace("__service_worker__", JSON.stringify(serviceWorkerFilename))
    .replace("__target__", JSON.stringify(encodeURIComponent(targetBaseUrl)));
  const installer = (await terser.minify(replacedInstaller, { toplevel: true })).code;

  // Write service worker JS file

  const serviceWorkerJs = path.resolve(__dirname, "dist/service-worker.js");
  await fs.promises.copyFile(serviceWorkerJs, path.resolve(wwwRoot, serviceWorkerFilename));

  // Inject installer script to HTML files

  async function processFile(filePath: string) {
    const $ = cheerio.load(await fs.promises.readFile(filePath, "utf-8"));
    const scriptTag = $("<script>");
    scriptTag.html(installer);
    $("body").append(scriptTag);
    await fs.promises.writeFile(filePath, $.html());
  }

  klaw(wwwRoot)
    .on("data", async file => {
      if (!(file.stats.isFile() && !file.stats.isSymbolicLink() && isHtmlFilePath(file.path))) return;

      console.log(`Processing file ${JSON.stringify(file.path)}`);
      await processFile(file.path);
    })
    .on("error", err => {
      console.error("Error from klaw():", err.stack);
      process.exit(1);
    });
})();

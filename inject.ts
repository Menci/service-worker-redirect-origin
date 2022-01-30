import fs from "fs";
import path from "path";

import { parse } from "node-html-parser";
import terser from "terser";
import klaw from "klaw";

import { buildPromise } from "./build";

const wwwRoot = process.argv[2];
const targetBaseUrl = process.argv[3];
const _404Page = process.argv[4] || "";
const serviceWorkerFilename = process.argv[5] || "sw.js";

if (!wwwRoot || !targetBaseUrl) {
  console.error("Usage: yarn inject <wwwRoot> <targetBaseUrl> [404Page] [serviceWorkerFilename]");
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
    .split("__service_worker__")
    .join(JSON.stringify(serviceWorkerFilename))
    .split("__target__")
    .join(JSON.stringify(encodeURIComponent(targetBaseUrl)))
    .split("__404_page__")
    .join(JSON.stringify(encodeURIComponent(_404Page)));
  const installer = (await terser.minify(replacedInstaller, { toplevel: true })).code;

  // Write service worker JS file

  const serviceWorkerJs = path.resolve(__dirname, "dist/service-worker.js");
  await fs.promises.copyFile(serviceWorkerJs, path.resolve(wwwRoot, serviceWorkerFilename));

  // Inject installer script to HTML files

  async function processFile(filePath: string) {
    const html = parse(await fs.promises.readFile(filePath, "utf-8"));
    html.querySelector("body").insertAdjacentHTML("beforeend", `<script>${installer}</script>`);
    await fs.promises.writeFile(filePath, html.outerHTML);
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

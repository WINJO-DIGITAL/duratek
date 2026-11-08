// Loads Playwright: from the project if installed, else from PLAYWRIGHT_MODULE
// (a path to an installed playwright package), else a global install.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
function load() {
  for (const id of [process.env.PLAYWRIGHT_MODULE, "playwright", "/opt/node-tools/node_modules/playwright"].filter(Boolean)) {
    try {
      return require(id);
    } catch {}
  }
  throw new Error("Playwright not found. Set PLAYWRIGHT_MODULE to an installed playwright package.");
}
export const { chromium } = load();

// Automated accessibility scan (axe-core, WCAG 2.1 A and AA) of the public
// pages and the forms, at desktop and phone widths. An automated scan finds
// roughly a third of real issues: a screen-reader pass by a person still
// follows. Local stack only. Run: node tests/qa/a11y.mjs
import { chromium } from "../e2e/browser.mjs";
import { readFileSync } from "node:fs";

const BASE = "http://localhost:3000";
const axe = readFileSync(new URL("../../node_modules/axe-core/axe.min.js", import.meta.url), "utf8");
const PAGES = ["/", "/range", "/range/keswick-oak", "/explore", "/inspiration", "/where-to-buy", "/samples", "/contact", "/technology", "/warranty", "/trade", "/trade/login", "/trade/apply", "/trade/forgot-password", "/privacy", "/privacy/request", "/cookies", "/terms", "/saved", "/compare?f=keswick-oak,fellside-oak"];
const browser = await chromium.launch();
const seen = new Map();
let scanned = 0;
for (const [w, h, label] of [[1440, 900, "desktop"], [390, 844, "phone"]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  await ctx.route(/cdn\.shopify\.com/, (r) => r.abort());
  const p = await ctx.newPage();
  for (const path of PAGES) {
    await p.goto(BASE + path, { waitUntil: "networkidle" }).catch(() => {});
    await p.waitForTimeout(600);
    await p.evaluate(axe);
    const res = await p.evaluate(() => window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } }));
    scanned++;
    for (const v of res.violations) {
      for (const n of v.nodes) {
        const key = `${v.id}|${n.target.join(" ")}`;
        const e = seen.get(key) ?? { id: v.id, impact: v.impact, help: v.help, target: n.target.join(" "), html: n.html.slice(0, 160), summary: (n.failureSummary ?? "").split("\n").slice(1, 2).join(" ").trim(), where: new Set() };
        e.where.add(`${path} (${label})`);
        seen.set(key, e);
      }
    }
  }
  await ctx.close();
}
await browser.close();
const list = [...seen.values()].sort((a, b) => ["critical", "serious", "moderate", "minor"].indexOf(a.impact) - ["critical", "serious", "moderate", "minor"].indexOf(b.impact));
for (const v of list) console.log(`${v.impact.toUpperCase()}  ${v.id}: ${v.help}\n   ${v.target}\n   ${v.html}\n   ${v.summary}\n   on ${[...v.where].slice(0, 4).join(", ")}${v.where.size > 4 ? ` and ${v.where.size - 4} more` : ""}`);
console.log(`\n${scanned} page scans, ${list.length} distinct issues (${list.filter((v) => v.impact === "critical" || v.impact === "serious").length} serious or critical)`);
process.exit(list.length ? 1 : 0);

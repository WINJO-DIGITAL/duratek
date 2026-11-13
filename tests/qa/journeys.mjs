// Functional journeys checked against the database: browsing, details, specs,
// public pricing, saved finishes, the sample tray, the stockist locator and the
// copy rules. Needs the postcode stub on :4010 and the server started with
// POSTCODES_API_URL=http://127.0.0.1:4010. Run: node tests/qa/journeys.mjs
import { chromium } from "../e2e/browser.mjs";
import { execSync } from "node:child_process";

const BASE = "http://localhost:3000";
const sql = (q) => execSync(`psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -v ON_ERROR_STOP=1 -tAc "${q.replace(/"/g, '\\"')}"`).toString().trim();
const results = [];
const check = (n, ok, d = "") => { results.push(ok); console.log(`${ok ? "PASS" : "FAIL"}  ${n}${d ? "  — " + d : ""}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pounds = (p) => `£${(p / 100).toFixed(2)}`;

const finishes = sql("select slug || '|' || name || '|' || colour_family || '|' || style || '|' || coalesce(rrp_per_m2_pence::text,'') || '|' || (specs->>'plank_width_mm') || '|' || (specs->>'plank_length_mm') || '|' || (specs->>'pack_coverage_m2') || '|' || (specs->>'thickness_mm') || '|' || (specs->>'wear_layer_mm') from finishes where published and archived_at is null order by sort_order, name")
  .split("\n").map((l) => { const [slug, name, colour, style, rrp, w, len, cov, thick, wear] = l.split("|"); return { slug, name, colour, style, rrp: Number(rrp), w, len, cov: Number(cov), thick: Number(thick), wear: Number(wear) }; });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.route(/cdn\.shopify\.com/, (r) => r.abort());
const p = await ctx.newPage();
const errors = []; p.on("pageerror", (e) => errors.push(String(e)));
const main = async () => (await p.locator("main").innerText()).replace(/\s+/g, " ");

// ------------------------------------------------------------------ browsing
await p.goto(`${BASE}/range`); await sleep(1500);
const links = async () => new Set(await p.locator("main a[href^='/range/']").evaluateAll((as) => as.map((a) => a.getAttribute("href"))));
const all = await links();
check(`1.1 the range lists every published finish (${finishes.length})`, finishes.every((f) => all.has(`/range/${f.slug}`)) && all.size === finishes.length, `${all.size} links`);
const colour = finishes[0].colour;
await p.goto(`${BASE}/range?colour=${colour}`); await sleep(1500);
const wantColour = finishes.filter((f) => f.colour === colour).map((f) => `/range/${f.slug}`);
const gotColour = await links();
check(`1.2 filtering by colour (${colour}) shows exactly those finishes`, wantColour.length === gotColour.size && wantColour.every((l) => gotColour.has(l)), `${gotColour.size} of ${wantColour.length}`);
sql("update finishes set published = false where slug = 'honister-slate-grey'");
await ctx.request.get(`${BASE}/range`); // warm
let hidden = false; for (let i = 0; i < 4 && !hidden; i++) { const r = await ctx.request.get(`${BASE}/range/honister-slate-grey`); hidden = r.status() === 404 || /couldn.t find/i.test(await r.text()); if (!hidden) await sleep(2500); }
sql("update finishes set published = true where slug = 'honister-slate-grey'");
check("1.3 an unpublished finish returns not found", hidden);

// ------------------------------------------------------------------ details, specs, public price, copy
const bad = { h1: [], name: [], rrp: [], specs: [], alt: [], copy: [], disclaimer: [] };
const DISCLAIMER = "WARRANTY DISCLAIMER: Residential Lifetime = 25 years.";
for (const f of finishes) {
  await p.goto(`${BASE}/range/${f.slug}`); await p.locator("main h1").first().waitFor({ timeout: 15000 });
  const h1s = await p.locator("h1").count();
  if (h1s !== 1) bad.h1.push(`${f.slug}:${h1s}`);
  const text = await main(); const body = await p.locator("body").innerText();
  if (!(await p.locator("h1").first().innerText()).includes(f.name)) bad.name.push(f.slug);
  if (f.rrp && !text.includes(pounds(f.rrp))) bad.rrp.push(`${f.slug} wants ${pounds(f.rrp)}`);
  const needs = [`${f.w}`, `${f.len}`, `${f.cov}`, "0.55"];
  const miss = needs.filter((n) => !text.includes(n)); if (miss.length) bad.specs.push(`${f.slug} lacks ${miss.join(",")}`);
  const noAlt = await p.locator("img:not([alt])").count(); if (noAlt) bad.alt.push(`${f.slug}:${noAlt}`);
  if (/(?<!does not mean )(?<!not )scratch[- ]?proof/i.test(body)) bad.copy.push(f.slug);
  if (/warranty/i.test(text) && !text.includes(DISCLAIMER)) bad.disclaimer.push(f.slug);
}
check(`2.1 each of the ${finishes.length} finish pages has exactly one h1 and the right name`, bad.h1.length === 0 && bad.name.length === 0, [...bad.h1, ...bad.name].join(", "));
check("2.2 the public RRP on every finish page equals the database", bad.rrp.length === 0, bad.rrp.join("; "));
check("2.3 plank size, pack coverage and the 0.55 mm wear layer on every page equal the database", bad.specs.length === 0, bad.specs.join("; "));
check("2.4 no image on a finish page lacks an alt attribute", bad.alt.length === 0, bad.alt.join(", "));
check("2.5 'scratch-proof' is never claimed (the brand says scratch-resistant)", bad.copy.length === 0, bad.copy.join(", "));
check("2.6 the warranty disclaimer is shown wherever a finish page mentions warranty", bad.disclaimer.length === 0, bad.disclaimer.join(", "));
const copyBad = [];
for (const path of ["/", "/range", "/explore", "/inspiration", "/technology", "/warranty", "/where-to-buy", "/samples", "/trade", "/contact", "/privacy", "/cookies", "/terms"]) {
  await p.goto(BASE + path); await sleep(700);
  const t = await p.locator("body").innerText(); const m = (await p.locator("main").innerText()).replace(/\s+/g, " ");
  if (/(?<!does not mean )(?<!not )scratch[- ]?proof|lorem ipsum|\bTODO\b|coming soon/i.test(t)) copyBad.push(`${path}: banned phrase`);
  if (/warranty/i.test(m) && !m.includes(DISCLAIMER) && path !== "/privacy" && path !== "/cookies") copyBad.push(`${path}: warranty without disclaimer`);
  const n = await p.locator("h1").count(); if (n !== 1) copyBad.push(`${path}: ${n} h1`);
  if ((await p.locator("html").getAttribute("lang")) !== "en-GB") copyBad.push(`${path}: lang`);
}
check("2.7 all public pages: one h1, language set, no banned phrases, disclaimer with every warranty mention", copyBad.length === 0, copyBad.join("; "));
await p.goto(`${BASE}/warranty`);
const w = await main();
check("2.8 the warranty page states the facts exactly: residential lifetime = 25 years, 10 year commercial, light and medium traffic only", /25 years/.test(w) && /10[- ]year/i.test(w) && /light (and|&) medium/i.test(w) && /heavy traffic/i.test(w));

// ------------------------------------------------------------------ saved finishes
const first = finishes[0], second = finishes[1];
await p.goto(`${BASE}/range/${first.slug}`);
await p.locator("main").getByRole("button", { name: new RegExp(`Save.*${first.name}|^Save$`) }).first().click();
await p.goto(`${BASE}/range/${second.slug}`);
await p.locator("main").getByRole("button", { name: new RegExp(`Save.*${second.name}|^Save$`) }).first().click();
await p.goto(`${BASE}/saved`); await sleep(1500);
check("3.1 saved finishes appear on the Saved page", (await main()).includes(first.name) && (await main()).includes(second.name));
await p.reload(); await sleep(1500);
check("3.2 and are still there after a reload (kept on the device)", (await main()).includes(first.name));
await p.evaluate(() => { try { localStorage.clear(); } catch { /* ignore */ } }); await p.reload(); await sleep(1200);
check("3.4 with storage cleared the page still works and shows an empty state", !(await main()).includes(first.name) && (await p.locator("h1").count()) === 1);

// ------------------------------------------------------------------ the sample tray
const tctx = await browser.newContext(); await tctx.route(/cdn\.shopify\.com/, (r) => r.abort()); const tp = await tctx.newPage();
for (const f of finishes.slice(0, 3)) { await tp.goto(`${BASE}/range/${f.slug}`); await tp.locator("#finish-sample").getByRole("button", { name: "Add to samples" }).click({ timeout: 60000 }); await sleep(400); }
await tp.goto(`${BASE}/range/${finishes[3].slug}`); await sleep(1500);
const fourth = await tp.locator("#finish-sample button").first().innerText();
check("4.1 a fourth sample is not silently added: the button explains the limit", /swap/i.test(fourth), fourth);
await tp.goto(`${BASE}/samples`); await sleep(1200);
const tt = (await tp.locator("main").innerText()).replace(/\s+/g, " ");
check("4.2 the tray keeps the three chosen across pages and says 3 of 3", /3 of 3/.test(tt) && finishes.slice(0, 3).every((f) => tt.includes(f.name)));
await tctx.close();

// ------------------------------------------------------------------ the stockist locator (postcode stub)
sql("delete from stockists where name like 'QA %'");
const mkS = (name, pc, lat, lng, pub, ver) => sql(`insert into stockists (name, type, address, postcode, lat, lng, published, verified_at, phone) values ('${name}', 'showroom', '1 Test St', '${pc}', ${lat}, ${lng}, ${pub}, ${ver ? "now()" : "null"}, '01539 123456')`);
mkS("QA Kendal Floors", "LA9 4DT", 54.325, -2.745, true, true);
mkS("QA Windermere Floors", "LA23 1AA", 54.38, -2.906, true, true);
mkS("QA London Floors", "SW1A 1AA", 51.5, -0.14, true, true);
mkS("QA Draft Kendal", "LA9 4DT", 54.3234, -2.7435, false, false);
mkS("QA Hidden Kendal", "LA9 4DT", 54.3234, -2.7435, false, true);
await ctx.request.post(`${BASE}/api/view`, { data: { slug: "x" } }); // no-op, just keeps the server warm
const search = async (pc) => { await p.goto(`${BASE}/where-to-buy?postcode=${encodeURIComponent(pc)}`); await sleep(2500); return (await p.locator("main").innerText()).replace(/\s+/g, " "); };
const nearK = await search("LA9 4DT");
check("5.1 a postcode lists the nearest stockists first, with distances", nearK.indexOf("QA Kendal Floors") !== -1 && nearK.indexOf("QA Kendal Floors") < nearK.indexOf("QA Windermere Floors") && /miles?/.test(nearK), nearK.slice(0, 200));
check("5.2 a stockist beyond 60 miles is not offered", !nearK.includes("QA London Floors"));
check("5.3 a draft (unverified) or hidden stockist is never listed", !nearK.includes("QA Draft Kendal") && !nearK.includes("QA Hidden Kendal"));
const html = await (await ctx.request.get(`${BASE}/where-to-buy?postcode=LA9%204DT`)).text();
check("5.4 the results are in the page itself, so it works without a map or scripts", /QA Kendal Floors/.test(html));
check("5.5 each result offers phone, directions and 'Ask this stockist', and promises no stock", /Ask this stockist/.test(nearK) && /Directions/.test(nearK) && !/in stock|available now/i.test(nearK));
const lon = await search("SW1A 1AA");
check("5.6 a London postcode finds the London stockist and not Kendal's", lon.includes("QA London Floors") && !lon.includes("QA Kendal Floors"));
const none = await search("AB10 1AA");
check("5.7 where there is no stockist it says so and offers samples, online retailers and an enquiry", /No stockists near AB10 1AA/i.test(none) && /samples/i.test(none) && /Buy online|online/i.test(none) && /enquiry/i.test(none));
check("5.8 an invalid postcode is explained", /doesn.t look like a UK postcode/i.test(await search("nope")));
check("5.9 an unknown postcode and a postcode service that is down are told apart", /couldn.t find BT1 1AA/i.test(await search("BT1 1AA")) && /couldn.t look up/i.test(await search("CF10 1AA")));
const inj = await ctx.request.get(`${BASE}/where-to-buy?postcode=${encodeURIComponent("LA9 4DT'; drop table stockists;--")}`);
check("5.10 an injection attempt in the postcode is just an invalid postcode", inj.status() === 200 && sql("select count(*) from stockists where name like 'QA %'") === "5");
sql("delete from stockists where name like 'QA %'");

// ------------------------------------------------------------------ the finish explorer
await p.goto(`${BASE}/explore`); await sleep(2500);
await p.locator("[aria-roledescription=carousel] [tabindex=\"0\"]").first().focus();
const n1 = await p.locator("h1").first().innerText();
await p.keyboard.press("ArrowRight"); await sleep(1800);
const n2 = await p.locator("h1").first().innerText();
await p.keyboard.press("ArrowLeft"); await sleep(1800);
const n3 = await p.locator("h1").first().innerText();
check("6.1 the explorer moves between finishes with the arrow keys", n1 !== n2 && n3 === n1, `${n1} → ${n2} → ${n3}`);

check("no client-side errors", errors.length === 0, errors.join(" / "));
await browser.close();
console.log(`\n${results.filter(Boolean).length}/${results.length} passed`);
process.exit(results.every(Boolean) ? 0 : 1);

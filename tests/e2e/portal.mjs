// Acceptance: a trade customer's complete journey, from logging in to
// reopening a saved project, with customer mode checked in page source,
// RSC payloads and PDFs. Local stack only (see run.sh).
import { chromium } from "./browser.mjs";
import { execSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { crc32, deflateSync, inflateSync } from "node:zlib";

const BASE = "http://localhost:3000";
const OUT = process.env.OUT ?? tmpdir();
const sql = (q) => execSync(`psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -tAc "${q.replace(/"/g, '\\"')}"`).toString().trim();
const results = [];
const check = (n, ok, d = "") => { results.push(ok); console.log(`${ok ? "PASS" : "FAIL"}  ${n}${d ? "  — " + d : ""}`); };
const text = async (p) => (await p.locator("main").innerText()).replace(/\s+/g, " ");
const pdfText = (buf) => {
  const raw = Buffer.from(buf).toString("latin1");
  let out = "";
  for (const m of raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    try { out += inflateSync(Buffer.from(m[1], "latin1")).toString("latin1"); } catch {}
  }
  return out.replace(/<([0-9A-Fa-f]+)>/g, (_, h) => Buffer.from(h, "hex").toString("latin1"));
};
// A small PNG logo, made here.
const FIX = mkdtempSync(join(tmpdir(), "duratek-portal-"));
const png = (w, h, [r, g, b]) => {
  const raw = Buffer.concat(Array.from({ length: h }, () => Buffer.concat([Buffer.from([0]), Buffer.alloc(w * 3, Buffer.from([r, g, b]))])));
  const chunk = (t, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr.set([8, 2, 0, 0, 0], 8);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
};
writeFileSync(join(FIX, "logo.png"), png(240, 80, [43, 93, 58]));

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true }); // a phone on site
await ctx.route(/cdn\.shopify\.com/, (r) => r.abort());
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

// ---------------------------------------------------------------- 1. log in
await page.goto(`${BASE}/trade/login?next=/trade/account`);
await page.fill("#field-email", "fitter@e2e.local");
await page.fill("#field-password", "Correct-Horse-42");
await page.click("main button[type=submit]");
await page.getByRole("heading", { name: /Hello, Sam/ }).waitFor({ timeout: 15000 });
check("1. trade customer logs in to their dashboard", (await text(page)).includes("Recent quotes"));
check("   dashboard shows account and approval status", (await text(page)).includes("Approved trade account") && (await text(page)).includes("Lakeland Floors"));

// Branding and labour rate first, as a trader would set up once.
await page.goto(`${BASE}/trade/account/settings`);
await page.locator("#field-labour_per_m2").waitFor({ timeout: 10000 });
await page.fill("#field-labour_per_m2", "15.00");
await page.getByRole("button", { name: "Save settings" }).click();
await page.getByText("Saved.", { exact: true }).waitFor({ timeout: 10000 });
await page.fill("#field-display_name", "Lakeland Flooring Ltd");
await page.fill("#field-contact_phone", "01539 222333");
await page.fill("#field-contact_email", "hello@lakeland.example.co.uk");
await page.locator("#field-brand_colour").evaluate((el) => { el.value = "#2b5d3a"; });
await page.getByRole("button", { name: "Save branding" }).click();
await page.getByText(/Saved. New quotes and PDFs/).waitFor({ timeout: 10000 });
await page.setInputFiles("#logo", join(FIX, "logo.png"));
await page.getByRole("button", { name: "Upload logo" }).click();
await page.waitForURL(/notice=logo-saved/, { timeout: 15000, waitUntil: "commit" });
check("   trader sets their branding, logo and labour rate", sql("select display_name || '|' || brand_colour || '|' || labour_per_m2_pence || '|' || (logo_path is not null) from trade_preferences") === "Lakeland Flooring Ltd|#2b5d3a|1500|true");

// ---------------------------------------------------------------- 2-4. finish, buying price, margin
await page.goto(`${BASE}/trade/account/catalogue`);
await page.getByRole("heading", { name: "Keswick Oak" }).waitFor({ timeout: 10000 });
const card = page.locator("li", { has: page.getByRole("heading", { name: "Keswick Oak" }) });
check("   catalogue shows the buying price on each finish", (await card.innerText()).includes("£22.22"));
await card.getByRole("button", { name: /Save/ }).click();
await page.waitForTimeout(800);
check("   a finish is saved to the account", sql("select count(*) from saved_products") === "1");
await card.getByRole("link", { name: "Present" }).click();
await page.getByRole("heading", { name: "Keswick Oak", level: 1 }).waitFor({ timeout: 10000 });
check("2. selects a Duratek finish", page.url().endsWith("/trade/present/keswick-oak"));
let t = await text(page);
check("3. sees their buying price", t.includes("Your buying price per m²") && t.includes("£22.22 ex VAT"));
const sell = page.getByLabel("Your selling price per m², ex VAT");
await sell.fill("32.00");
await page.waitForTimeout(300);
t = await text(page);
// 32.00 - 22.22 = 9.78; 9.78 / 32.00 = 30.56%; 9.78 / 22.22 = 44.01%
check("4. calculates gross profit, gross margin and markup", t.includes("£9.78") && t.includes("30.56%") && t.includes("44.01%"), t.match(/Gross profit per m².{0,140}/)?.[0]);
check("   margin and markup are explained, gross not net", t.includes("gross profit ÷ selling price") && t.includes("gross profit ÷ buying price") && t.includes("isn’t net profit"));

// ---------------------------------------------------------------- customer and project with rooms
await page.goto(`${BASE}/trade/account/customers`);
await page.locator("#c-name").waitFor({ timeout: 10000 });
await page.fill("#c-name", "Mrs Jane Smith");
await page.fill("#c-email", "jane.smith@home.example.co.uk");
await page.fill("#c-phone", "07700 900123");
await page.fill("#c-address", "1 Lake Road, Kendal");
await page.fill("#c-postcode", "la9 4aa");
await page.getByRole("button", { name: "Add customer" }).click();
await page.waitForURL(/\/trade\/account\/customers\/[0-9a-f-]{36}/, { timeout: 15000, waitUntil: "commit" });
check("   creates a customer record", sql("select postcode from customers where name='Mrs Jane Smith'") === "LA9 4AA");
await page.getByRole("link", { name: "New project" }).click();
await page.locator("#p-name").waitFor({ timeout: 10000 });
await page.fill("#p-name", "Smith kitchen and hall");
await page.getByRole("button", { name: "Create project" }).click();
await page.waitForURL(/\/trade\/account\/projects\/[0-9a-f-]{36}/, { timeout: 15000, waitUntil: "commit" });
const projectUrl = page.url().split("?")[0];
check("   creates a project for the customer", sql("select c.name from projects p join customers c on c.id=p.customer_id") === "Mrs Jane Smith");

// ---------------------------------------------------------------- 5-7. rooms, wastage, packs
const addRoom = async (name, l, w, wastage) => {
  await page.locator("#r-new-name").waitFor({ timeout: 10000 });
  await page.fill("#r-new-name", name);
  await page.selectOption("#r-new-finish", { label: "Keswick Oak · 2.21 m²/pack" });
  await page.fill("#r-new-length", l);
  await page.fill("#r-new-width", w);
  await page.fill("#r-new-wastage", wastage);
  await page.getByRole("button", { name: "Add room" }).click();
  await page.getByText(new RegExp(`${name}: .* m² saved`)).waitFor({ timeout: 10000 });
};
await addRoom("Kitchen", "5", "4", "10");
await addRoom("Hall", "420cm", "1.5", "12");
check("5. enters room measurements (including in cm)", sql("select string_agg(room_name || ':' || length_m || 'x' || width_m, ',' order by sort_order) from project_items") === "Kitchen:5.00x4.00,Hall:4.20x1.50");
await page.reload();
await page.locator("table").first().waitFor();
const roomsTable = (await page.locator("table").first().innerText()).replace(/\s+/g, " ");
check("6. adds wastage", roomsTable.includes("22 m² (+10%)") && roomsTable.includes("7.06 m² (+12%)"), roomsTable.slice(0, 300));
// Kitchen 22 m² / 2.21 = 9.95 -> 10 packs; Hall 7.06 / 2.21 = 3.19 -> 4 packs
check("7. calculates required packs, rounded up", roomsTable.includes("10 (22.1 m²)") && roomsTable.includes("4 (8.84 m²)"));
check("   shows the material cost and the assumptions", roomsTable.includes("£687.54") && (await text(page)).includes("always rounded up"), roomsTable.match(/Total.*$/)?.[0]);

// ---------------------------------------------------------------- 8-9. quote with labour and accessories
await page.getByRole("button", { name: "Create a quote from this project" }).click();
await page.waitForURL(/\/trade\/account\/quotes\/[0-9a-f-]{36}/, { timeout: 20000, waitUntil: "commit" });
const quoteUrl = page.url().split("?")[0];
const quoteId = quoteUrl.split("/").pop();
await page.getByRole("heading", { name: "Job costing" }).waitFor({ timeout: 10000 });
check("9. creates a customer quotation from the project", sql(`select count(*) from quote_lines where quote_id='${quoteId}'`) === "4");
check("   flooring per room, priced on the server; fitting at the labour rate",
  sql(`select string_agg(room_name || ':' || kind || ':' || quantity || ':' || unit_cost_pence || ':' || unit_sell_pence, ',' order by sort_order) from quote_lines where quote_id='${quoteId}'`) ===
  "Kitchen:flooring:10.00:4911:6384,Kitchen:labour:20.00:0:1500,Hall:flooring:4.00:4911:6384,Hall:labour:6.30:0:1500");
const addOther = async (kind, desc, qty, unit, cost, price, room = "") => {
  await page.selectOption("#field-kind", kind);
  await page.fill("#field-description", desc);
  await page.fill("#ol-room", room);
  await page.fill("#field-quantity", qty);
  await page.selectOption("#field-unit", unit);
  await page.fill("#field-unit_cost", cost);
  await page.fill("#field-unit_sell", price);
  await page.getByRole("button", { name: "Add line" }).click();
  await page.getByText(`Added ${desc}.`).waitFor({ timeout: 10000 });
};
await addOther("trim", "Door bar, oak", "2", "item", "8.00", "15.00", "Kitchen");
await addOther("adhesive", "Trim adhesive", "1", "item", "6.50", "9.50", "Kitchen");
await addOther("accessory", "Scotia, 2.4 m", "6", "item", "3.20", "6.00", "Hall");
await addOther("delivery", "Delivery", "1", "item", "25.00", "35.00");
await addOther("expense", "Waste removal", "1", "item", "20.00", "30.00");
check("8. adds labour and accessories", sql(`select count(*) from quote_lines where quote_id='${quoteId}'`) === "9");
await page.fill("#field-contingency", "5");
await page.fill("#field-valid_until", new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10));
await page.fill("#field-notes", "Furniture to be cleared before we arrive.");
await page.getByRole("button", { name: "Save details" }).click();
await page.getByText("Saved.", { exact: true }).waitFor({ timeout: 10000 });
// Expected job costing from the stored lines.
const lines = sql(`select kind || ':' || quantity || ':' || unit_cost_pence || ':' || unit_sell_pence from quote_lines where quote_id='${quoteId}'`).split("\n").map((r) => { const [k, q, c, s] = r.split(":"); return { k, q: Number(q), c: Number(c), s: Number(s) }; });
const amt = (q, p) => Math.round(q * p);
const group = { flooring: "m", trim: "m", adhesive: "m", accessory: "m", underlay: "m", labour: "l", delivery: "a", expense: "a", other: "a" };
const cost = (g) => lines.filter((l) => group[l.k] === g).reduce((s, l) => s + amt(l.q, l.c), 0);
const base = cost("m") + cost("l") + cost("a");
const contingency = Math.round(base * 0.05);
const jobCost = base + contingency;
const sellTotal = lines.reduce((s, l) => s + amt(l.q, l.s), 0);
const fmt = (p) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(p / 100);
await page.reload(); await page.getByRole("heading", { name: "Job costing" }).waitFor();
const costing = (await page.locator("aside").innerText()).replace(/\s+/g, " ");
check("   job costing: materials, labour, other, contingency, total job cost",
  [fmt(cost("m")), fmt(cost("a")), fmt(contingency), fmt(jobCost)].every((v) => costing.includes(v)), costing.slice(0, 260));
check("   job costing: selling price, VAT, gross profit, gross margin, markup",
  [fmt(sellTotal), fmt(Math.round(sellTotal * 0.2)), fmt(sellTotal - jobCost), `${((sellTotal - jobCost) / sellTotal * 100).toFixed(2).replace(/\.?0+$/, "")}%`].every((v) => costing.includes(v)));

// ---------------------------------------------------------------- 10-11. customer mode
// Control: the same scan must find the secrets in trade mode, or it proves nothing.
{
  const tradeHtml = await (await page.request.get(`${BASE}/trade/present/keswick-oak`)).text();
  const tradeQuote = await (await page.request.get(quoteUrl)).text();
  check("    control: the leak scan does find buying price and customer in trade mode", tradeHtml.includes("22.22") && tradeQuote.includes("Mrs Jane Smith"));
}
await page.getByRole("button", { name: "Customer mode" }).first().click();
await page.getByText("This is hidden in customer mode.").waitFor({ timeout: 10000 });
check("10. switches to customer presentation mode in one tap", true);
const secrets = ["22.22", "2222", "49.11", "4911", "Mrs Jane Smith", "jane.smith@", "fitter@e2e.local", "Lakeland Floors", "Gross profit", "Your buying price", "Your cost", "Job costing", "contingency"];
const leaks = (s) => secrets.filter((x) => s.includes(x));
const rscHeaders = { RSC: "1" };
let clean = true;
const detail = [];
for (const path of [quoteUrl, projectUrl, "/trade/account", "/trade/account/quotes", "/trade/account/customers", "/trade/account/catalogue", "/trade/present", "/trade/present/keswick-oak", "/trade/account/calculator", "/compare?f=keswick-oak,fellside-oak"]) {
  const url = path.startsWith("http") ? path : BASE + path;
  const html = await (await page.request.get(url)).text();
  const rsc = await (await page.request.get(url, { headers: rscHeaders })).text();
  const found = [...new Set([...leaks(html), ...leaks(rsc)])];
  if (found.length) { clean = false; detail.push(`${path}: ${found.join(", ")}`); }
}
check("11. no buying price, cost, profit, customer or account detail in page source or RSC data, on ten screens", clean, detail.join(" / "));
await page.goto(`${BASE}/trade/present/keswick-oak`);
await page.getByRole("heading", { name: "Keswick Oak", level: 1 }).waitFor({ timeout: 10000 });
t = await text(page);
check("    customer mode still shows photography, specification, benefits and RRP", t.includes("£33.33") && t.includes("0.55 mm") && t.includes("Waterproof") && (await page.locator("main img").count()) > 0);
await page.screenshot({ path: join(OUT, "portal-present-customer-390.png"), fullPage: true });
// Trade mode back on.
await page.getByRole("button", { name: "Trade mode" }).first().click();
await page.getByText("Your buying price per m²").waitFor({ timeout: 10000 });
check("    and back to trade mode in one tap", true);

// ---------------------------------------------------------------- 12. download the quotation
const pdfRes = await page.request.get(`${quoteUrl}/pdf`);
const pdfBuf = await pdfRes.body();
const pt = pdfText(pdfBuf);
check("12. downloads the quotation as a PDF", pdfRes.status() === 200 && pdfBuf.subarray(0, 5).toString() === "%PDF-" && (pdfRes.headers()["content-disposition"] ?? "").includes("attachment"));
check("    PDF carries the trader's branding, the customer, rooms and totals",
  ["Lakeland Flooring Ltd", "01539 222333", "Mrs Jane Smith", "Kitchen", "Hall", "Door bar, oak", fmt(sellTotal), fmt(sellTotal + Math.round(sellTotal * 0.2)), "Furniture to be cleared"].every((s) => pt.includes(s)));
check("    PDF holds no buying price, cost, contingency or profit", !["£49.11", "£22.22", "4911", "Gross profit", "ontingency", "margin", fmt(jobCost)].some((s) => pt.includes(s)));
check("    PDF embeds the trader's logo", Buffer.from(pdfBuf).toString("latin1").includes("/Subtype /Image"));
writeFileSync(join(OUT, "portal-quote.pdf"), pdfBuf);
// The customer's own link and PDF once sent
await page.goto(quoteUrl); await page.getByRole("button", { name: "Mark as sent" }).click();
await page.waitForURL(/notice=sent/, { waitUntil: "commit" });
const token = sql(`select share_token from quotes where id='${quoteId}'`);
const anon = await browser.newContext(); await anon.route(/cdn\.shopify\.com/, (r) => r.abort());
const anonPdf = await anon.request.get(`${BASE}/q/${token}/pdf`);
const apt = pdfText(await anonPdf.body());
check("    the customer downloads the same PDF from their link, with no costs", anonPdf.status() === 200 && apt.includes("Lakeland Flooring Ltd") && !apt.includes("£49.11"));

// ---------------------------------------------------------------- snapshot
sql("update price_list_items set amount_pence = 3000 where variant_id = (select id from product_variants where sku='DT-KESWICK-OAK') and min_quantity = 1 and valid_from is null and price_list_id = (select id from price_lists where tier_id = (select id from price_tiers where name like 'Demo tier A%'))");
await page.goto(quoteUrl); await page.getByRole("heading", { name: "Job costing" }).waitFor();
check("    the quote keeps its prices after a price change (snapshot)", sql(`select string_agg(distinct unit_cost_pence::text, ',') from quote_lines where quote_id='${quoteId}' and kind='flooring'`) === "4911" && (await text(page)).includes(fmt(jobCost)));
const pt2 = pdfText(await (await page.request.get(`${quoteUrl}/pdf`)).body());
check("    and so does its PDF", pt2.includes(fmt(sellTotal + Math.round(sellTotal * 0.2))));

// ---------------------------------------------------------------- 13. reopen the project
await page.goto(`${BASE}/trade/account`);
await page.getByRole("link", { name: /Smith kitchen and hall/ }).click();
await page.waitForURL(projectUrl, { timeout: 10000, waitUntil: "commit" });
await page.locator("table").first().waitFor();
t = await text(page);
check("13. reopens the saved project with customer, rooms, finishes, calculations and quote",
  t.includes("Mrs Jane Smith") && t.includes("Kitchen") && t.includes("Hall") && t.includes("Keswick Oak") && t.includes("10 (22.1 m²)") && t.includes(sql(`select reference from quotes where id='${quoteId}'`)));
await page.screenshot({ path: join(OUT, "portal-project-390.png"), fullPage: true });

// ---------------------------------------------------------------- ownership
const other = await browser.newContext(); const op = await other.newPage();
await op.goto(`${BASE}/trade/login`); await op.fill("#field-email", "other@e2e.local"); await op.fill("#field-password", "Correct-Horse-42");
await Promise.all([op.waitForURL((u) => !u.pathname.startsWith("/trade/login"), { waitUntil: "commit" }), op.click("main button[type=submit]")]);
for (const path of [projectUrl, quoteUrl, `${BASE}/trade/account/customers/${sql("select id from customers limit 1")}`]) {
  await op.goto(path); await op.waitForTimeout(1500);
  check(`    another trader gets not-found: ${path.replace(BASE, "").replace(/[0-9a-f-]{36}/, ":id")}`, /couldn.t find/i.test(await op.locator("main").innerText()) && !(await op.content()).includes("Mrs Jane Smith"));
}
const otherPdf = await op.request.get(`${quoteUrl}/pdf`);
check("    another trader cannot download the PDF", otherPdf.status() === 404);

check("no client-side errors", errors.length === 0, errors.join(" / "));
await browser.close();
console.log(`\n${results.filter(Boolean).length}/${results.length} passed`);
process.exit(results.every(Boolean) ? 0 : 1);

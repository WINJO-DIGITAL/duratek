import { chromium } from "./browser.mjs";
import { execSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deflateSync, crc32 } from "node:zlib";

// Upload fixtures, made here so the suite needs no files on disk.
const FIX = mkdtempSync(join(tmpdir(), "duratek-e2e-"));
const png = (w, h) => {
  const raw = Buffer.concat(Array.from({ length: h }, () => Buffer.concat([Buffer.from([0]), Buffer.alloc(w * 3, Buffer.from([154, 111, 69]))])));
  const chunk = (t, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr.set([8, 2, 0, 0, 0], 8);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
};
writeFileSync(join(FIX, "swatch.png"), png(400, 300));
writeFileSync(join(FIX, "guide.pdf"), "%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
writeFileSync(join(FIX, "fake.pdf"), "MZ this is not a pdf");
const BASE = "http://localhost:3000", S = (process.env.OUT ?? (await import("node:os")).tmpdir());
const sql = (q) => execSync(`psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -tAc "${q.replace(/"/g, '\\"')}"`).toString().trim();
const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); };
const text = async (p) => (await p.locator("main").innerText()).replace(/\s+/g, " ");

async function login(ctx, email) {
  const p = await ctx.newPage();
  await p.goto(`${BASE}/trade/login?next=/trade/account`);
  await p.fill("#field-email", email); await p.fill("#field-password", "Correct-Horse-42");
  await Promise.all([p.waitForURL((u) => !u.pathname.startsWith("/trade/login"), { timeout: 15000, waitUntil: "commit" }), p.click("main button[type=submit]")]);
  return p;
}
const browser = await chromium.launch();
const mk = async () => { const c = await browser.newContext({ viewport: { width: 1440, height: 1000 } }); await c.route(/cdn\.shopify\.com/, (r) => r.abort()); return c; };

// Fixture: a sample request with a formula-looking name.
const keswick = sql("select id from finishes where slug='keswick-oak'");
sql(`insert into sample_requests (name, email, address_line1, town, postcode, finish_ids, marketing_opt_in) values ('=HYPERLINK(1)', 'csv@test.local', '1 High St', 'Kendal', 'LA9 4AA', array['${keswick}']::uuid[], true)`);

// Non-admins
const fitterCtx = await mk(); const fp = await login(fitterCtx, "fitter@e2e.local");
await fp.goto(`${BASE}/admin`); await fp.waitForTimeout(2000);
check("approved trader gets not-found on /admin", (await text(fp)).toLowerCase().includes("couldn't find") || (await text(fp)).toLowerCase().includes("not found"));
let r = await fp.request.get(`${BASE}/admin/samples/export`);
check("approved trader cannot export sample CSV (404)", r.status() === 404);
const anonCtx = await mk(); const ap = await anonCtx.newPage();
r = await ap.request.get(`${BASE}/admin/samples/export`);
check("anonymous cannot export sample CSV (404)", r.status() === 404);

// Owner
const ctx = await mk(); const p = await login(ctx, "owner@e2e.local");
const errors = []; p.on("pageerror", (e) => errors.push(String(e)));
await p.goto(`${BASE}/admin`); await p.getByRole("heading", { name: "Overview" }).waitFor({ timeout: 10000 });
await p.getByText("Last 30 days").waitFor({ timeout: 10000 });
let t = await text(p);
check("overview shows figures", t.includes("Sample requests") && t.includes("Quote win rate"));
check("overview shows quoted m² per finish (Keswick Oak 20 m²)", /Keswick Oak 20 m² · 1 quote/.test(t), t.match(/Most quoted.{0,120}/)?.[0]);
check("overview carries no trader prices", !t.includes("£"));
await p.screenshot({ path: `${S}/admin-overview-1440.png`, fullPage: true });

// Samples
await p.goto(`${BASE}/admin/samples`); await p.getByText("csv@test.local").waitFor({ timeout: 10000 });
check("sample request listed", true);
await p.locator("li", { hasText: "csv@test.local" }).getByRole("button", { name: "Mark sent" }).click();
await p.waitForTimeout(2000);
check("mark sent records status and time", sql("select status || ':' || (sent_at is not null) from sample_requests where email='csv@test.local'") === "sent:true");
r = await p.request.get(`${BASE}/admin/samples/export`);
const csv = await r.text();
check("owner exports CSV", r.status() === 200 && r.headers()["content-type"].includes("text/csv") && csv.includes("csv@test.local"));
check("CSV neutralises formulas", csv.includes(`"'=HYPERLINK(1)"`) && !csv.includes(`,"=HYPERLINK`));
check("CSV names finishes", csv.includes("Keswick Oak"));
check("CSV is not cacheable", (r.headers()["cache-control"] ?? "").includes("no-store"));

// Stockists
await p.goto(`${BASE}/admin/stockists`); await p.locator("#s-new-name").waitFor({ timeout: 10000 });
await p.fill("#s-new-name", "Kendal Flooring Centre"); await p.fill("#s-new-address", "1 Stricklandgate, Kendal"); await p.fill("#s-new-postcode", "nope");
await p.evaluate(() => document.querySelectorAll("form").forEach((f) => (f.noValidate = true)));
await p.getByRole("button", { name: "Add stockist" }).click();
await p.getByText("Enter a valid UK postcode.").waitFor({ timeout: 10000 });
check("stockist rejects a bad postcode and keeps typed values", (await p.inputValue("#s-new-name")) === "Kendal Flooring Centre");
await p.fill("#s-new-postcode", "LA9 4DT"); await p.fill("#s-new-website", "kendalflooring.example.co.uk");
await p.getByRole("button", { name: "Add stockist" }).click();
await p.getByText(/Saved Kendal Flooring Centre/).waitFor({ timeout: 15000 });
const st = sql("select postcode || '|' || website || '|' || published || '|' || coalesce(lat::text,'null') from stockists where name='Kendal Flooring Centre'");
check("stockist saved with normalised postcode and https website", st.startsWith("LA9 4DT|https://kendalflooring.example.co.uk/|true"), st);
// Retailer
await p.fill("#r-new-name", "Test Retailer"); await p.fill("#r-new-url", "http://insecure.example.com");
await p.getByRole("button", { name: "Add retailer" }).click();
await p.getByText("Enter a web address starting https://").first().waitFor({ timeout: 10000 });
check("retailer refuses a non-https link", true);

// RRP through the price grid, then the public page; then a finish edit keeps unshown specs.
const kid = keswick;
const rrpList = sql("select id from price_lists where kind='rrp'");
const kvar = sql(`select id from product_variants where finish_id='${kid}' and is_default`);
await p.goto(`${BASE}/admin/prices`); await p.locator(`input[name="base:${rrpList}:${kvar}"]`).waitFor({ timeout: 10000 });
await p.fill(`input[name="base:${rrpList}:${kvar}"]`, "39.99");
await p.getByRole("button", { name: "Save prices" }).click();
await p.getByText(/Saved 1 change/).waitFor({ timeout: 10000 });
check("finish RRP saved", sql(`select rrp_per_m2_pence from finishes where id='${kid}'`) === "3999");
await p.goto(`${BASE}/admin/finishes/${kid}`); await p.locator("#field-name").waitFor({ timeout: 10000 });
await p.getByRole("button", { name: "Save finish" }).click();
await p.getByText(/Saved. Public pages update/).waitFor({ timeout: 10000 });
check("finish specs not shown in the form are kept", sql(`select specs->>'core' from finishes where id='${kid}'`) === "Rigid SPC, waterproof");
await ap.goto(`${BASE}/range/keswick-oak`); await ap.waitForTimeout(1500);
check("public finish page shows the new RRP", (await ap.content()).includes("£39.99"));
// Bad slug keeps values
await p.fill("#field-slug", "Bad Slug!"); await p.evaluate(() => document.querySelectorAll("form").forEach((f) => (f.noValidate = true)));
await p.getByRole("button", { name: "Save finish" }).click();
await p.getByText(/Use lower-case letters/).waitFor({ timeout: 10000 });
check("finish rejects a bad web address and keeps values", (await p.inputValue("#field-name")) === "Keswick Oak");
// Image upload
await p.goto(`${BASE}/admin/finishes/${kid}`); await p.locator("#image-file").waitFor({ timeout: 10000 });
await p.setInputFiles("#image-file", join(FIX, "swatch.png")); await p.waitForTimeout(500);
await p.selectOption("#image-kind", "closeup"); await p.fill("#image-alt", "Keswick Oak grain, close up");
await p.getByRole("button", { name: "Upload" }).click();
await p.waitForURL(/notice=image-added/, { timeout: 15000, waitUntil: "commit" });
const img = sql(`select kind || '|' || width || 'x' || height || '|' || (url like '${kid}/%') from finish_images where alt='Keswick Oak grain, close up'`);
check("photograph uploaded to storage with its pixel size", img === "closeup|400x300|true", img);
// New finish (hidden)
await p.goto(`${BASE}/admin/finishes/new`); await p.locator("#field-name").waitFor({ timeout: 10000 });
await p.fill("#field-name", "Test Draft Oak"); await p.locator("#field-name").blur();
check("web address suggested from the name", (await p.inputValue("#field-slug")) === "test-draft-oak");
await p.fill("#field-pack_coverage_m2", "2.21");
await p.getByRole("button", { name: "Create finish" }).click();
await p.waitForURL(/notice=created/, { timeout: 15000, waitUntil: "commit" });
check("new finish created hidden with shared construction specs", sql("select published || '|' || (specs->>'wear_layer_mm') from finishes where slug='test-draft-oak'") === "false|0.55");
await ap.goto(`${BASE}/range`); await ap.waitForTimeout(1500);
check("hidden finish is not on the public range", !(await ap.content()).includes("Test Draft Oak"));

// Documents
await p.goto(`${BASE}/admin/documents`); await p.locator("#doc-file").waitFor({ timeout: 10000 });
await p.setInputFiles("#doc-file", join(FIX, "fake.pdf")); await p.fill("#doc-title", "Fake");
await p.evaluate(() => { const i = document.querySelector("#doc-file"); i.removeAttribute("accept"); });
await p.getByRole("button", { name: "Upload" }).click(); await p.waitForURL(/notice=/, { timeout: 15000, waitUntil: "commit" });
check("a file that isn't a PDF is refused", p.url().includes("notice=pdf"), p.url());
await p.setInputFiles("#doc-file", join(FIX, "guide.pdf")); await p.fill("#doc-title", "Fitting guide");
await p.selectOption("#doc-type", "fitting_guide");
await p.getByRole("button", { name: "Upload" }).click(); await p.waitForURL(/notice=added/, { timeout: 15000, waitUntil: "commit" });
const docId = sql("select id from documents where title='Fitting guide'");
check("trade-only PDF uploaded", sql(`select trade_only from documents where id='${docId}'`) === "t");
r = await ap.request.get(`${BASE}/documents/${docId}`, { maxRedirects: 0 });
check("anonymous cannot download a trade-only document (404)", r.status() === 404);
const pend = await mk(); const pp = await login(pend, "pending@e2e.local");
r = await pp.request.get(`${BASE}/documents/${docId}`, { maxRedirects: 0 });
check("pending applicant cannot download it (404)", r.status() === 404);
r = await fp.request.get(`${BASE}/documents/${docId}`, { maxRedirects: 0 });
const loc = r.headers()["location"] ?? "";
check("approved trader gets a 303 to a signed link", r.status() === 303 && loc.includes("/object/sign/documents/") && loc.includes("token="), `${r.status()}`);
const pdf = await fp.request.get(loc);
check("the signed link serves the PDF", (await pdf.body()).subarray(0, 5).toString() === "%PDF-");
await fp.goto(`${BASE}/trade/account/documents`); await fp.getByText("Fitting guide").first().waitFor({ timeout: 10000 });
check("approved trader sees it in their documents", true);

// Account prices
const fitterId = sql("select id from auth.users where email='fitter@e2e.local'");
await p.goto(`${BASE}/admin/accounts/${fitterId}`); await p.locator(`input[name="override:${kid}"]`).waitFor({ timeout: 10000 });
await p.fill(`input[name="override:${kid}"]`, "abc");
await p.getByRole("button", { name: "Save account prices" }).click(); await p.waitForURL(/notice=invalid/, { timeout: 10000, waitUntil: "commit" });
check("account price rejects a typo and saves nothing", sql(`select count(*) from price_overrides where profile_id='${fitterId}'`) === "0");
await p.locator(`input[name="override:${kid}"]`).waitFor({ timeout: 10000 });
await p.fill(`input[name="override:${kid}"]`, "19.50");
await p.getByRole("button", { name: "Save account prices" }).click(); await p.waitForURL(/notice=saved/, { timeout: 10000, waitUntil: "commit" });
await fp.goto(`${BASE}/trade/account`); await fp.getByText("Your prices").first().waitFor({ timeout: 10000 });
check("the fitter sees their account price", (await text(fp)).includes("£19.50"));
const otherCtx = await mk(); const op = await login(otherCtx, "other@e2e.local");
await op.goto(`${BASE}/trade/account`); await op.getByText("Your prices").first().waitFor({ timeout: 10000 });
check("another trader on the same tier does not", !(await text(op)).includes("£19.50") && (await text(op)).includes("£22.22"));
sql(`delete from price_overrides where profile_id='${fitterId}'`);

check("no client-side errors (owner)", errors.length === 0, errors.join(" / "));
await browser.close();
const failed = results.filter((x) => !x.ok); console.log(`\n${results.length - failed.length}/${results.length} passed`); process.exit(failed.length ? 1 : 0);

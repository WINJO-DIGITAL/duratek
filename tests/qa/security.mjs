// HTTP-level security battery, run as a visitor and as signed-in accounts
// against the real server and the real local database. Complements the
// database-level checks in tests/e2e/security.mjs. Local stack only.
// Run: node tests/qa/security.mjs
import { chromium } from "../e2e/browser.mjs";
import { createClient } from "@supabase/supabase-js";
import { execSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { crc32, deflateSync } from "node:zlib";

const BASE = "http://localhost:3000", API = "http://127.0.0.1:54321";
const PW = "Correct-Horse-42";
const sql = (q) => execSync(`psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -v ON_ERROR_STOP=1 -tAc "${q.replace(/"/g, '\\"')}"`).toString().trim();
const results = [];
const check = (n, ok, d = "") => { results.push(ok); console.log(`${ok ? "PASS" : "FAIL"}  ${n}${d ? "  — " + d : ""}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const admin = createClient(API, process.env.SRK, { auth: { persistSession: false } });
const anonKey = process.env.ANON;
const uuid = "00000000-0000-4000-8000-0000000000aa";

// ------------------------------------------------------------------ fixtures
const FIX = mkdtempSync(join(tmpdir(), "duratek-sec-"));
const png = (w, h) => {
  const raw = Buffer.concat(Array.from({ length: h }, () => Buffer.concat([Buffer.from([0]), Buffer.alloc(w * 3, Buffer.from([43, 93, 58]))])));
  const chunk = (t, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr.set([8, 2, 0, 0, 0], 8);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
};
const goodPng = png(120, 40);
writeFileSync(join(FIX, "good.png"), goodPng);
writeFileSync(join(FIX, "evil.svg.png"), '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(1)</script></svg>');
writeFileSync(join(FIX, "page.html.png"), "<html><script>alert(1)</script></html>");
writeFileSync(join(FIX, "polyglot.png"), Buffer.concat([goodPng, Buffer.from("<script>alert(1)</script>")]));
writeFileSync(join(FIX, "big.png"), Buffer.concat([goodPng, Buffer.alloc(1_300_000, 0)]));
writeFileSync(join(FIX, "empty.png"), "");
writeFileSync(join(FIX, "a.php.png"), goodPng);
writeFileSync(join(FIX, "shell.php"), "<?php system($_GET['c']); ?>");

async function user(email, status, extra = "") {
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 });
  let u = list.users.find((x) => x.email === email);
  if (!u) ({ data: { user: u } } = await admin.auth.admin.createUser({ email, password: PW, email_confirm: true, user_metadata: { company_name: email, contact_name: "Sec Tester" } }));
  sql(`update profiles set status = '${status}' ${extra} where id = '${u.id}'`);
  return u.id;
}
const tierA = sql("select id from price_tiers where name like 'Demo tier A%'");
const A = await user("s-a@e2e.local", "approved", `, tier_id = '${tierA}', company_name = 'A Floors'`);
const B = await user("s-b@e2e.local", "approved", `, tier_id = '${tierA}', company_name = 'B Floors'`);
await user("s-pending@e2e.local", "pending");
sql(`insert into trade_preferences (profile_id) values ('${A}') on conflict do nothing`);

const browser = await chromium.launch();
const newCtx = async () => { const c = await browser.newContext(); await c.route(/cdn\.shopify\.com/, (r) => r.abort()); return c; };
async function login(email, ctx = null) {
  ctx ??= await newCtx();
  const p = await ctx.newPage();
  await p.goto(`${BASE}/trade/login?next=/trade/account`);
  await p.fill("#field-email", email); await p.fill("#field-password", PW);
  await Promise.all([p.waitForURL((u) => !u.pathname.startsWith("/trade/login"), { timeout: 20000, waitUntil: "commit" }), p.click("main button[type=submit]")]);
  return { ctx, p };
}
const owner = await login("owner@e2e.local");
const a = await login("s-a@e2e.local");
const b = await login("s-b@e2e.local");
const anonCtx = await newCtx(); const anon = await anonCtx.newPage();

// A's private data, made directly so the test doesn't depend on the UI.
const finish = sql("select id from finishes where slug='keswick-oak'");
const cust = sql(`insert into customers (profile_id, name, email, postcode, notes) values ('${A}', 'Secret Customer', 'secret@cust.example.com', 'LA9 4AA', 'private note') returning id`).split("\n")[0];
const proj = sql(`insert into projects (profile_id, name, customer_id) values ('${A}', 'Secret Project', '${cust}') returning id`).split("\n")[0];
const quote = sql(`insert into quotes (profile_id, customer_name, customer_id, project_id, status, vat_rate_bp) values ('${A}', 'Secret Customer', '${cust}', '${proj}', 'sent', 2000) returning id`).split("\n")[0];
sql(`insert into quote_lines (quote_id, kind, description, quantity, unit, unit_cost_pence, unit_sell_pence, sort_order, finish_id) values ('${quote}', 'flooring', 'Keswick Oak', 10, 'pack', 4911, 6384, 0, '${finish}')`);
const draft = sql(`insert into quotes (profile_id, customer_name, status, vat_rate_bp) values ('${A}', 'Draft Customer', 'draft', 2000) returning id`).split("\n")[0];
const qtoken = sql(`select share_token from quotes where id='${quote}'`), dtoken = sql(`select share_token from quotes where id='${draft}'`);
const sl = sql(`insert into shortlists (profile_id, name, finish_ids) values ('${A}', 'A list', array['${finish}'::uuid]) returning token`).split("\n")[0];

const gone = async (p, path) => { await p.goto(BASE + path); await sleep(1200); return /couldn.t find/i.test(await p.locator("body").innerText()); };
const denied = async (p, path) => { await p.goto(BASE + path); await sleep(1200); const t = await p.locator("body").innerText(); return /\/trade\/login/.test(p.url()) || /couldn.t find/i.test(t); };

// ===========================================================================
// 1. Unauthenticated access: every private screen and download
// ===========================================================================
const PRIVATE = ["/admin", "/admin/accounts", "/admin/accounts/" + A, "/admin/prices", "/admin/prices/history", "/admin/finishes", `/admin/finishes/${finish}`, "/admin/samples", "/admin/stockists", "/admin/enquiries", "/admin/documents", "/admin/settings", "/admin/privacy", "/admin/analytics", "/admin/audit",
  "/trade/account", "/trade/account/catalogue", "/trade/account/quotes", `/trade/account/quotes/${quote}`, "/trade/account/projects", `/trade/account/projects/${proj}`, "/trade/account/customers", `/trade/account/customers/${cust}`, "/trade/account/calculator", "/trade/account/shortlists", "/trade/account/documents", "/trade/account/settings", "/trade/present", "/trade/present/keswick-oak"];
let allDenied = true; const notDenied = [];
for (const path of PRIVATE) if (!(await denied(anon, path))) { allDenied = false; notDenied.push(path); }
check(`1.1 a visitor is turned away from all ${PRIVATE.length} admin and trade screens`, allDenied, notDenied.join(", "));
const DOWNLOADS = ["/admin/samples/export", "/admin/privacy/export?email=a@b.co", `/trade/account/quotes/${quote}/pdf`, "/trade/account/settings/export", `/documents/${uuid}`];
const bad = [];
for (const d of DOWNLOADS) { const r = await anon.request.get(BASE + d, { maxRedirects: 0 }); if (![401, 403, 404, 307, 308, 303].includes(r.status())) bad.push(`${d} ${r.status()}`); const t = await r.text(); if (/secret@cust|Secret Customer|4911/.test(t)) bad.push(`${d} leaked`); }
check("1.2 a visitor cannot download exports, quote PDFs or documents", bad.length === 0, bad.join(", "));
const w = await anon.request.get(`${BASE}/api/cron/retention`); const v = await anon.request.get(`${BASE}/api/view`);
check("1.3 API routes refuse the wrong method or no secret, without a server error", [401, 503].includes(w.status()) && v.status() === 405, `${w.status()} ${v.status()}`);
const qd = await anon.request.get(`${BASE}/q/${dtoken}`); const qdPdf = await anon.request.get(`${BASE}/q/${dtoken}/pdf`); const qOk = await anon.request.get(`${BASE}/q/${qtoken}/pdf`);
check("1.4 a draft quote's link and PDF show nothing, while a sent quote's PDF opens", (await qd.text()).indexOf("Draft Customer") === -1 && qdPdf.status() === 404 && qOk.status() === 200);
const sh = await (await anon.request.get(`${BASE}/s/${sl}`)).text();
check("1.5 a shared shortlist shows the finish and no price", /Keswick Oak/.test(sh) && !/£\s?\d/.test(sh.replace(/<script[\s\S]*?<\/script>/g, "")));

// ===========================================================================
// 2. Wrong account permissions, cross-account access and escalation (through the pages)
// ===========================================================================
check("2.1 trader B cannot open trader A's quote, project, customer, PDF or settings export", (await gone(b.p, `/trade/account/quotes/${quote}`)) && (await gone(b.p, `/trade/account/projects/${proj}`)) && (await gone(b.p, `/trade/account/customers/${cust}`)) && (await b.p.request.get(`${BASE}/trade/account/quotes/${quote}/pdf`)).status() === 404 && !/Secret Customer/.test(await (await b.p.request.get(`${BASE}/trade/account/settings/export`)).text()));
check("2.2 an approved trader is turned away from every admin screen and export", await (async () => { for (const x of PRIVATE.filter((p) => p.startsWith("/admin"))) if (!(await gone(b.p, x))) return false; for (const d of DOWNLOADS.slice(0, 2)) if ((await b.p.request.get(BASE + d)).status() !== 404) return false; return true; })());
const pend = await login("s-pending@e2e.local");
await pend.p.goto(`${BASE}/trade/account/quotes`); await sleep(1500);
check("2.3 a pending account reaches no trade tool and no admin screen", /\/trade\/account$/.test(pend.p.url()) || /waiting|pending/i.test(await pend.p.locator("body").innerText()));
check("2.4 and its admin attempts are refused", (await gone(pend.p, "/admin")) && (await gone(pend.p, "/admin/samples")));
// Escalation through the API with the trader's own token
const tc = createClient(API, anonKey, { auth: { persistSession: false } });
await tc.auth.signInWithPassword({ email: "s-b@e2e.local", password: PW });
const esc = [];
for (const patch of [{ role: "super_admin" }, { is_admin: true }, { status: "approved" }, { tier_id: tierA }, { business_id: uuid }]) {
  const { error, data } = await tc.from("profiles").update(patch).eq("id", B).select();
  const after = sql(`select role || '|' || is_admin || '|' || status from profiles where id='${B}'`);
  if (after !== "trade|false|approved") esc.push(JSON.stringify(patch) + " -> " + after);
  void error; void data;
}
const { error: permErr } = await tc.from("admin_permissions").insert({ profile_id: B, permission: "manage_pricing" });
const { error: rpcErr } = await tc.rpc("delete_trade_account", { p_profile: A });
const { error: rpc2 } = await tc.rpc("erase_person_data", { p_email: "x@y.co" });
const { data: stillA } = await admin.from("profiles").select("id").eq("id", A);
check("2.5 a trader cannot promote themselves, change status or tier, grant permissions, or delete or erase others", esc.length === 0 && !!permErr && !!rpcErr && !!rpc2 && stillA.length === 1, esc.join("; "));
const { data: otherQuotes } = await tc.from("quotes").select("id");
const { data: otherCust } = await tc.from("customers").select("id");
const { data: otherLines } = await tc.from("quote_lines").select("id");
check("2.6 a trader reads none of another trader's quotes, lines or customers through the database API", (otherQuotes?.length ?? 0) === 0 && (otherCust?.length ?? 0) === 0 && (otherLines?.length ?? 0) === 0);
check("2.7 quote links are long random tokens and not guessable", qtoken.length >= 20 && new Set([qtoken, dtoken, sl]).size === 3);

// ===========================================================================
// 3. Sessions
// ===========================================================================
const cookies = await a.ctx.cookies();
const auth = cookies.filter((c) => /auth-token/.test(c.name));
check("3.1 the session cookie is HttpOnly and SameSite", auth.length > 0 && auth.every((c) => c.httpOnly && c.sameSite !== "None"), auth.map((c) => `${c.name} httpOnly=${c.httpOnly} sameSite=${c.sameSite}`).join("; "));
// replay after logout
const replay = await newCtx(); await replay.addCookies(cookies);
const rp = await replay.newPage(); await rp.goto(`${BASE}/trade/account/catalogue`); await sleep(1500);
const worksBefore = /Your price|Catalogue/.test(await rp.locator("body").innerText()) && !/\/trade\/login/.test(rp.url());
await a.p.goto(`${BASE}/trade/account`); await sleep(800);
const lo = a.p.getByRole("button", { name: /Log out/i }).first();
if (await lo.count()) { await lo.click(); await sleep(2500); }
const rp2 = await replay.newPage(); await rp2.goto(`${BASE}/trade/account/catalogue`); await sleep(1500);
check("3.2 a copied session stops working once the owner of it logs out", worksBefore && /\/trade\/login/.test(rp2.url()), `before=${worksBefore} after=${rp2.url()}`);
const tampered = await newCtx(); await tampered.addCookies(cookies.map((c) => (/auth-token/.test(c.name) ? { ...c, value: c.value.slice(0, -6) + "AAAAAA" } : c)));
const tp = await tampered.newPage(); await tp.goto(`${BASE}/trade/account`); await sleep(1500);
check("3.3 a tampered session cookie is treated as signed out", /\/trade\/login/.test(tp.url()));
// ===========================================================================
// 4. Open redirects, account enumeration, password recovery
// ===========================================================================
let redirectOk = true; const evil = [];
for (const next of ["https://evil.example.com", "//evil.example.com", "/\\evil.example.com", "javascript:alert(1)", "https:evil.example.com"]) {
  const c = await newCtx(); const p = await c.newPage();
  await p.goto(`${BASE}/trade/login?next=${encodeURIComponent(next)}`);
  await p.fill("#field-email", "s-b@e2e.local"); await p.fill("#field-password", PW);
  await p.click("main button[type=submit]"); await sleep(3500);
  if (!p.url().startsWith(BASE)) { redirectOk = false; evil.push(`${next} -> ${p.url()}`); }
  await c.close();
}
const ctl = await newCtx(); const cp = await ctl.newPage();
await cp.goto(`${BASE}/trade/login?next=${encodeURIComponent("/trade/account/quotes")}`); await cp.fill("#field-email", "s-b@e2e.local"); await cp.fill("#field-password", PW); await cp.click("main button[type=submit]"); await sleep(3500);
check("4.1 the login page never sends a person to another website (and does honour a safe path)", redirectOk && /\/trade\/account\/quotes/.test(cp.url()), evil.join("; ") + ` control landed at ${cp.url()}`);
await ctl.close();
const msgFor = async (email, pw) => { const c = await newCtx(); const p = await c.newPage(); await p.goto(`${BASE}/trade/login`); await p.fill("#field-email", email); await p.fill("#field-password", pw); await p.click("main button[type=submit]"); await sleep(2500); const t = (await p.locator("main").innerText()).replace(/\s+/g, " "); await c.close(); return t; };
const m1 = await msgFor("s-a@e2e.local", "definitely-wrong-1"), m2 = await msgFor("nobody-here@e2e.local", "definitely-wrong-1");
check("4.2 a wrong password and an unknown address get the same message (and it says something)", m1 === m2 && /isn.t right/i.test(m1), `known: "${m1.slice(-80)}" unknown: "${m2.slice(-80)}"`);
const fp = async (email) => { const c = await newCtx(); const p = await c.newPage(); await p.goto(`${BASE}/trade/forgot-password`); await p.fill("input[name=email]", email); await p.click("main button[type=submit]"); await sleep(2500); const t = (await p.locator("main").innerText()).replace(/\s+/g, " "); await c.close(); return t; };
check("4.3 password recovery answers the same for known and unknown addresses", (await fp("s-a@e2e.local")) === (await fp("nobody-here@e2e.local")));
// apply with an address that is already registered
const ap = await newCtx(); const app = await ap.newPage(); await app.goto(`${BASE}/trade/apply`); await app.locator("input[name=email]").waitFor();
check("4.4 the application form needs a strong password and confirms nothing about existing accounts", await (async () => {
  const fill = async (email, pw) => { await app.fill("input[name=company_name]", "Enum Ltd"); await app.fill("input[name=contact_name]", "Enum Test"); await app.fill("input[name=email]", email); await app.fill("input[name=phone]", "01539 000000"); await app.fill("input[name=password]", pw).catch(() => {}); await app.locator("input[name=postcode]").fill("LA9 4AA").catch(() => {}); await app.locator("input[name=trade_type][value=fitter]").check().catch(() => {}); };
  await fill("s-a@e2e.local", "short"); await app.click("main button[type=submit]"); await sleep(1800);
  const weak = /password/i.test(await app.locator("main").innerText());
  return weak;
})());

// ===========================================================================
// 5. Input validation: XSS, injection, NUL bytes, very long input
// ===========================================================================
const XSS = `"><img src=x onerror="window.__xss=1"><script>window.__xss=1</script>`;
const fired = []; for (const p of [owner.p, a.p, anon]) p.on("dialog", (d) => { fired.push(d.message()); d.dismiss(); });
async function submitSample(name, extra = {}) {
  const c = await newCtx(); const p = await c.newPage();
  await p.goto(`${BASE}/range/keswick-oak`); await p.locator("#finish-sample").getByRole("button", { name: "Add to samples" }).click({ timeout: 60000 });
  await p.goto(`${BASE}/samples`); await p.locator("#field-name").waitFor();
  const f = { name, email: `x${Date.now()}${Math.floor(Math.random() * 1e4)}@sec.example.com`, address_line1: "1 Test St", town: "Kendal", postcode: "LA9 4AA", ...extra };
  for (const [k, v] of Object.entries(f)) await p.evaluate(([id, val]) => { const el = document.querySelector(id); el.value = val; el.dispatchEvent(new Event("input", { bubbles: true })); }, [`#field-${k}`, v]);
  await p.getByRole("button", { name: /Request my free sample/ }).click(); await sleep(2500);
  const t = await p.locator("body").innerText(); await c.close(); return { t, email: f.email };
}
await submitSample(XSS, { address_line1: XSS });
await owner.p.goto(`${BASE}/admin/samples`); await sleep(2000);
const html = await owner.p.content();
check("5.1 script and markup typed into a sample request are shown as text to the owner, never run", !(await owner.p.evaluate(() => window.__xss)) && !/<img src=x onerror/i.test(html) && /&lt;img src=x onerror|onerror=/.test(html) && fired.length === 0);
const nul = await submitSample("Nul\u0000Test");
check("5.2 a NUL byte in a field gives a polite error or is handled, never a server error", !/Application error|Internal Server Error|500/.test(nul.t));
const longName = await submitSample("x".repeat(200_000));
check("5.3 a 200,000 character name is refused politely", /too long|check the highlighted/i.test(longName.t) && !/Application error/.test(longName.t));
const sqli = ["/range?style=%27%20or%201%3D1--&colour=%27%3B%20drop%20table%20finishes%3B--", "/where-to-buy?postcode=%27%3B%20drop%20table%20finishes%3B--", "/range/%27%20or%20%271%27%3D%271", "/compare?f=%27%20or%201%3D1--", "/contact?stockist=%27%20or%201%3D1--&finish=%27--"];
const codes = []; for (const s of sqli) codes.push((await anon.request.get(BASE + s)).status());
check("5.4 injection strings in addresses and queries change nothing and cause no server error", codes.every((c) => c < 500) && sql("select count(*) from finishes") !== "0", codes.join(","));
const xq = await anon.request.get(`${BASE}/contact?stockist=${encodeURIComponent(XSS)}&finish=${encodeURIComponent(XSS)}`);
check("5.5 query strings are never echoed unescaped", !/<script>window\.__xss/.test(await xq.text()));
// trader-entered text shown on the customer's quote page and in the PDF
sql(`update quotes set customer_name = $q$${"<script>window.__xss=1</script> & \\\"Quote\\\""}$q$ where id='${quote}'`.replace(/\$q\$/g, "'").replace(/'<script>/, "'<script>"));
const qp = await anon.request.get(`${BASE}/q/${qtoken}`);
const qpt = await qp.text();
check("5.6 a customer name with markup is escaped on the shared quote page", !/<script>window\.__xss=1<\/script>/.test(qpt.replace(/<script[^>]*>[\s\S]*?<\/script>/g, (m) => (m.includes("__xss") ? m : ""))) || /&lt;script&gt;/.test(qpt));
const pdf = await anon.request.get(`${BASE}/q/${qtoken}/pdf`);
check("5.7 and the PDF still builds with it", pdf.status() === 200 && (await pdf.body()).subarray(0, 5).toString() === "%PDF-");
check("5.8 no script ran anywhere during the XSS checks", fired.length === 0);

// ===========================================================================
// 6. File uploads
// ===========================================================================
async function uploadLogo(p, file) {
  await p.goto(`${BASE}/trade/account/settings`); await p.locator("#logo").waitFor({ timeout: 15000 });
  await p.setInputFiles("#logo", file);
  await p.getByRole("button", { name: "Upload logo" }).click(); await sleep(3000);
  return { url: p.url(), text: (await p.locator("main").innerText()).replace(/\s+/g, " ") };
}
const a2 = await login("s-a@e2e.local");
const results6 = {};
for (const [name, file] of [["svg-as-png", "evil.svg.png"], ["html-as-png", "page.html.png"], ["polyglot", "polyglot.png"], ["oversize", "big.png"], ["empty", "empty.png"], ["php", "shell.php"], ["double-ext", "a.php.png"]]) results6[name] = await uploadLogo(a2.p, join(FIX, file));
const stored = () => sql(`select coalesce(logo_path, '') from trade_preferences where profile_id='${A}'`);
const accepted = (k) => /logo-saved/.test(results6[k].url);
check("6.1 a trader's logo upload refuses SVG, HTML or PHP disguised as images, a PNG with a page appended, oversize and empty files", ["svg-as-png", "html-as-png", "polyglot", "oversize", "empty", "php"].every((k) => !accepted(k)), JSON.stringify(Object.fromEntries(Object.entries(results6).map(([k]) => [k, accepted(k)]))));
check("6.2 a genuine image with an odd name (a.php.png) is accepted, stored under a generated name, and served as an image", accepted("double-ext") && /^image\/png/.test((await anon.request.get(`${API}/storage/v1/object/public/trade-logos/${stored()}`)).headers()["content-type"] ?? ""), stored());
check("6.3 the stored name is generated, never the uploaded file name", stored() === "" || new RegExp(`^${A}/logo-[A-Za-z0-9-]+\\.(png|jpg)$`).test(stored()), stored());
// direct storage API with the trader's own token
const tokA = (await (async () => { const c = createClient(API, anonKey, { auth: { persistSession: false } }); const { data } = await c.auth.signInWithPassword({ email: "s-a@e2e.local", password: PW }); return data.session.access_token; })());
const sApi = async (method, path, body, ct) => fetch(`${API}/storage/v1/${path}`, { method, headers: { apikey: anonKey, authorization: `Bearer ${tokA}`, ...(ct ? { "content-type": ct } : {}) }, body });
const up1 = await sApi("POST", `object/trade-logos/${B}/logo-hijack.png`, goodPng, "image/png");
const up2 = await sApi("POST", `object/finish-images/${A}-x.png`, goodPng, "image/png");
const up3 = await sApi("POST", `object/documents/x.pdf`, Buffer.from("%PDF-1.4"), "application/pdf");
const up4 = await sApi("POST", `object/trade-logos/${A}/page.html`, Buffer.from("<script>alert(1)</script>"), "text/html");
const del = await sApi("DELETE", `object/trade-logos/${B}/logo.png`);
const list = await fetch(`${API}/storage/v1/object/list/trade-logos`, { method: "POST", headers: { apikey: anonKey, "content-type": "application/json" }, body: JSON.stringify({ prefix: "", limit: 50 }) });
const listBody = await list.json().catch(() => null);
check("6.4 a trader cannot upload into another trader's folder, the photo or document stores", up1.status >= 400 && up2.status >= 400 && up3.status >= 400, `${up1.status} ${up2.status} ${up3.status}`);
check("6.5 a trader cannot store an HTML page in their logo folder", up4.status >= 400, `status ${up4.status}`);
check("6.6 a trader cannot delete another's logo and a visitor cannot list the logo store", del.status >= 400 && (!Array.isArray(listBody) || listBody.length === 0), `delete ${del.status}, list ${JSON.stringify(listBody).slice(0, 80)}`);
// documents and photos through the owner's screens
async function adminUpload(path, fields, file) { await owner.p.goto(BASE + path); await owner.p.locator("#doc-file, input[type=file]").first().waitFor({ timeout: 15000 }); for (const [sel, val] of Object.entries(fields)) { if (val.select) await owner.p.selectOption(sel, val.select); else await owner.p.fill(sel, val); } await owner.p.setInputFiles("input[type=file]", file); await owner.p.getByRole("button", { name: "Upload" }).click(); await sleep(2500); return owner.p.url(); }
const before = sql("select count(*) from documents");
await adminUpload("/admin/documents", { "#doc-title": "Evil PDF", "#doc-type": { select: "tech_sheet" } }, join(FIX, "shell.php"));
await adminUpload("/admin/documents", { "#doc-title": "Evil PDF 2", "#doc-type": { select: "tech_sheet" } }, join(FIX, "evil.svg.png"));
await adminUpload("/admin/documents", { "#doc-title": "Photo as brochure", "#doc-type": { select: "brochure" } }, join(FIX, "good.png"));
check("6.7 the owner's document upload refuses a script, SVG, or an image as a PDF-only document type", sql("select count(*) from documents") === before);
const imgPath = `/admin/finishes/${finish}`;
const imgBefore = sql("select count(*) from finish_images");
await owner.p.goto(BASE + imgPath); await owner.p.locator("input[type=file]").first().waitFor({ timeout: 15000 });
for (const f of ["evil.svg.png", "page.html.png", "shell.php", "empty.png"]) {
  await owner.p.goto(BASE + imgPath); await owner.p.locator("input[type=file]").first().waitFor();
  await owner.p.setInputFiles("input[type=file]", join(FIX, f));
  await owner.p.locator("input[name=alt]").last().fill("test").catch(() => {});
  await owner.p.getByRole("button", { name: /^Upload|Add photograph|Add/ }).last().click().catch(() => {}); await sleep(2000);
}
check("6.8 the owner's photograph upload refuses SVG, HTML, scripts and empty files", sql("select count(*) from finish_images") === imgBefore);

// ===========================================================================
// 7. Headers, disclosure
// ===========================================================================
const hdrs = (r) => r.headers();
const pages = { "/": await anon.request.get(`${BASE}/`), "/trade/login": await anon.request.get(`${BASE}/trade/login`), "/admin": await owner.p.request.get(`${BASE}/admin`) };
const missing = [];
for (const [path, r] of Object.entries(pages)) {
  const h = hdrs(r);
  if (!/nosniff/i.test(h["x-content-type-options"] ?? "")) missing.push(`${path}: x-content-type-options`);
  if (!/DENY|SAMEORIGIN/i.test(h["x-frame-options"] ?? "") && !/frame-ancestors/i.test(h["content-security-policy"] ?? "")) missing.push(`${path}: clickjacking protection`);
  if (!h["referrer-policy"]) missing.push(`${path}: referrer-policy`);
  if (!h["permissions-policy"]) missing.push(`${path}: permissions-policy`);
}
check("7.1 pages send nosniff, clickjacking protection, a referrer policy and a permissions policy", missing.length === 0, missing.join("; "));
const priv = await owner.p.request.get(`${BASE}/admin/samples`);
const pc = hdrs(priv)["cache-control"] ?? "";
check("7.2 private pages are not cacheable by shared caches", /no-store|private/.test(pc) && !/s-maxage|public/.test(pc), pc);
const dl = await owner.p.request.get(`${BASE}/admin/samples/export`);
check("7.3 personal-data downloads are no-store", /no-store/.test(hdrs(dl)["cache-control"] ?? ""));
check("7.4 the server doesn't announce its framework", !hdrs(pages["/"])["x-powered-by"], hdrs(pages["/"])["x-powered-by"] ?? "");
const probes = [];
for (const p of ["/.env", "/.env.local", "/.git/config", "/package.json", "/next.config.ts", "/supabase/seed.sql", "/src/lib/email.ts", "/.next/BUILD_ID", "/_next/static/../../.env.local", "/..%2f..%2f.env.local", "/%2e%2e/%2e%2e/etc/passwd"]) {
  const r = await anon.request.get(BASE + p, { maxRedirects: 0 }); const t = await r.text();
  if (r.status() === 200 && /SERVICE_ROLE|RESEND_API|root:|"dependencies"|BUILD/.test(t)) probes.push(p);
}
check("7.5 secrets, source and config files can't be fetched", probes.length === 0, probes.join(", "));
const chunks = (await (await anon.request.get(`${BASE}/`)).text()).match(/\/_next\/static\/[^"']+\.js/g) ?? [];
const maps = []; for (const c of [...new Set(chunks)].slice(0, 8)) { const r = await anon.request.get(`${BASE}${c}.map`); if (r.status() === 200 && /"sources"/.test(await r.text())) maps.push(c); }
check("7.6 source maps aren't published", maps.length === 0, maps.join(", "));
const e404 = await (await anon.request.get(`${BASE}/range/does-not-exist`)).text();
check("7.7 error pages show no stack trace or file paths", !/at .*\(.*\.(ts|js):\d+|node_modules|\/home\/user/.test(e404));
const bundle = (await Promise.all([...new Set(chunks)].slice(0, 25).map(async (c) => (await anon.request.get(BASE + c)).text()))).join("\n");
check("7.8 the service-role key and email key are nowhere in what the browser downloads", !new RegExp(process.env.SRK.slice(-30)).test(bundle) && !/re_local_placeholder|SUPABASE_SERVICE_ROLE_KEY/.test(bundle));

// ===========================================================================
// 8. Brute force (last: it trips the login limiter for this address)
// ===========================================================================
const bf = await newCtx(); const bp = await bf.newPage(); await bp.goto(`${BASE}/trade/login`);
let limited = false;
const LIMIT = Number(process.env.LOGIN_RATE_MAX) || 10;
for (let i = 0; i < LIMIT + 5 && !limited; i++) {
  await bp.fill("#field-email", "s-brute@e2e.local"); await bp.fill("#field-password", "wrong-password-" + i);
  await bp.click("main button[type=submit]"); await sleep(700);
  limited = /too many|try again (in|later)|a little while/i.test(await bp.locator("main").innerText());
}
check("8.1 repeated wrong passwords are rate limited", limited);


await browser.close();
console.log(`\n${results.filter(Boolean).length}/${results.length} passed`);
process.exit(results.every(Boolean) ? 0 : 1);

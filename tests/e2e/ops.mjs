// Administration, samples, stockists and privacy: the public journeys (sample
// request, stockist enquiry, privacy request), the admin screens that handle
// them, and what each permission may and may not open. Local stack only.
import { chromium } from "./browser.mjs";
import { createClient } from "@supabase/supabase-js";
import { execSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { crc32, deflateSync } from "node:zlib";

const BASE = "http://localhost:3000";
const CRON = process.env.CRON_SECRET ?? "e2e-cron-secret-not-real";
const sql = (q) => execSync(`psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -tAc "${q.replace(/"/g, '\\"')}"`).toString().trim();
const results = [];
const check = (n, ok, d = "") => { results.push(ok); console.log(`${ok ? "PASS" : "FAIL"}  ${n}${d ? "  — " + d : ""}`); };
const notice = (p, re) => p.locator("[role=status]").filter({ hasText: re }).first().waitFor({ timeout: 20000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms = 15000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await sleep(300); } return false; };
const text = async (p) => (await p.locator("main").innerText()).replace(/\s+/g, " ");
const notFound = async (p, path) => { await p.goto(BASE + path); await sleep(1200); return /couldn.t find/i.test(await p.locator("body").innerText()); };

// Fixtures, made here.
const FIX = mkdtempSync(join(tmpdir(), "duratek-ops-"));
const png = (w, h) => {
  const raw = Buffer.concat(Array.from({ length: h }, () => Buffer.concat([Buffer.from([0]), Buffer.alloc(w * 3, Buffer.from([154, 111, 69]))])));
  const chunk = (t, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr.set([8, 2, 0, 0, 0], 8);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
};
writeFileSync(join(FIX, "scene.png"), png(300, 200));
writeFileSync(join(FIX, "fake.png"), '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>');

// Two restricted administrators: samples only, and stockists only.
const admin = createClient("http://127.0.0.1:54321", process.env.SRK, { auth: { persistSession: false } });
for (const [email, perm] of [["samples@e2e.local", "manage_samples"], ["stockists@e2e.local", "manage_stockists"]]) {
  const { data } = await admin.auth.admin.createUser({ email, password: "Correct-Horse-42", email_confirm: true, user_metadata: { company_name: email } });
  sql(`update profiles set role = 'admin', status = 'approved' where id = '${data.user.id}'`);
  sql(`insert into admin_permissions (profile_id, permission) values ('${data.user.id}', '${perm}')`);
}

const browser = await chromium.launch();
const newCtx = async (vp = { width: 1280, height: 900 }) => { const c = await browser.newContext({ viewport: vp }); await c.route(/cdn\.shopify\.com/, (r) => r.abort()); return c; };
async function login(ctx, email) {
  const p = await ctx.newPage();
  await p.goto(`${BASE}/trade/login?next=/trade/account`);
  await p.fill("#field-email", email); await p.fill("#field-password", "Correct-Horse-42");
  await Promise.all([p.waitForURL((u) => !u.pathname.startsWith("/trade/login"), { timeout: 15000, waitUntil: "commit" }), p.click("main button[type=submit]")]);
  return p;
}
const errors = [];
const owner = await login(await newCtx(), "owner@e2e.local");
const samplesAdmin = await login(await newCtx(), "samples@e2e.local");
const stockistAdmin = await login(await newCtx(), "stockists@e2e.local");
for (const p of [owner, samplesAdmin, stockistAdmin]) p.on("pageerror", (e) => errors.push(String(e)));

const kes = sql("select id from finishes where slug='keswick-oak'");
const kirk = sql("select id from finishes where slug='kirkstone-grey-oak'");

// ===========================================================================
// A. The sample request journey
// ===========================================================================
async function requestSample(slug, who) {
  const ctx = await newCtx();
  const p = await ctx.newPage();
  await p.goto(`${BASE}/range/${slug}`);
  await p.locator("#finish-sample").getByRole("button", { name: "Add to samples" }).click({ timeout: 60000 });
  await p.goto(`${BASE}/samples`);
  await p.locator("#field-name").waitFor({ timeout: 10000 });
  await p.fill("#field-name", who.name); await p.fill("#field-email", who.email); await p.fill("#field-phone", "01539 111222");
  await p.fill("#field-address_line1", who.line1); await p.fill("#field-town", "Kendal"); await p.fill("#field-postcode", who.postcode);
  if (who.marketing) await p.check("input[name=marketing_opt_in]");
  await p.getByRole("button", { name: /Request my free sample/ }).click();
  return { ctx, p };
}
const jane = { name: "Jane Public", email: "jane@public.example.com", line1: "5 Lake Road", postcode: "la9 4aa", marketing: true };
await requestSample("keswick-oak", jane);
check("A1. a customer chooses a sample, enters delivery details and submits", await until(() => sql("select count(*) from sample_requests where email='jane@public.example.com'") === "1"));
check("    the postcode is normalised and the request saved as new", sql("select postcode || '|' || status from sample_requests where email='jane@public.example.com'") === "LA9 4AA|new");
check("    their marketing consent is recorded in the words they saw", sql("select count(*) from consent_records where email='jane@public.example.com' and purpose='marketing' and granted and wording like 'Send me occasional news%'") === "1");
check("    confirmation emails are logged honestly (no provider reachable: never 'sent')", await until(() => sql("select count(*) from notification_log where kind in ('sample_confirmation','sample_owner')") === "2") && sql("select count(*) from notification_log where status='sent'") === "0", sql("select string_agg(kind||':'||status, ', ') from notification_log"));

const dup = await requestSample("keswick-oak", { ...jane, line1: "9 Other Road" });
check("A2. asking again for the same sample is declined kindly", await until(async () => /already asked for one of these samples/.test(await dup.p.locator("body").innerText())) && sql("select count(*) from sample_requests where email='jane@public.example.com'") === "1");

const hp = await newCtx(); const hpp = await hp.newPage();
await hpp.goto(`${BASE}/range/keswick-oak`); await hpp.getByRole("button", { name: "Add to samples" }).first().click(); await hpp.goto(`${BASE}/samples`);
await hpp.locator("#field-name").waitFor();
for (const [k, v] of [["name", "Bot"], ["email", "bot@public.example.com"], ["address_line1", "1 Bot St"], ["town", "Kendal"], ["postcode", "LA9 4AA"]]) await hpp.fill(`#field-${k}`, v);
await hpp.locator("#company_website").evaluate((el) => { el.value = "spam.example"; });
await hpp.getByRole("button", { name: /Request my free sample/ }).click(); await sleep(2500);
check("A3. a bot filling the hidden field is ignored without a record", sql("select count(*) from sample_requests where email='bot@public.example.com'") === "0");

// Availability
const stale = await newCtx(); const sp = await stale.newPage();
await sp.goto(`${BASE}/range/kirkstone-grey-oak`); await sp.locator("#finish-sample").getByRole("button", { name: "Add to samples" }).click({ timeout: 60000 });
await samplesAdmin.goto(`${BASE}/admin/samples`);
await samplesAdmin.locator("li", { hasText: "Kirkstone Grey Oak" }).filter({ has: samplesAdmin.getByRole("button", { name: "Mark out of stock" }) }).getByRole("button", { name: "Mark out of stock" }).click();
await notice(samplesAdmin, /Sample availability updated/);
check("A4. an administrator marks a finish's samples out of stock", sql("select sample_available from finishes where slug='kirkstone-grey-oak'") === "f");
let shown = false;
const viewer = await (await newCtx()).newPage();
for (let i = 0; i < 4 && !shown; i++) { await viewer.goto(`${BASE}/range/kirkstone-grey-oak`); await sleep(600); shown = /Samples out of stock just now/.test(await viewer.locator("body").innerText()); }
check("    the site stops offering it as a free sample", shown);
await sp.goto(`${BASE}/samples`); await sp.locator("#field-name").waitFor({ timeout: 10000 });
for (const [k, v] of [["name", "Stale Sam"], ["email", "stale@public.example.com"], ["address_line1", "2 Fell Rd"], ["town", "Kendal"], ["postcode", "LA9 4AA"]]) await sp.fill(`#field-${k}`, v);
await sp.getByRole("button", { name: /Request my free sample/ }).click();
check("    and a request that still includes it is refused by the server", await until(async () => /aren.t available just now/.test(await sp.locator("body").innerText())) && sql("select count(*) from sample_requests where email='stale@public.example.com'") === "0");
await samplesAdmin.goto(`${BASE}/admin/samples`);
await samplesAdmin.locator("li", { hasText: "Kirkstone Grey Oak" }).filter({ has: samplesAdmin.getByRole("button", { name: "Mark available" }) }).getByRole("button", { name: "Mark available" }).click();
await notice(samplesAdmin, /Sample availability updated/);

// Fulfilment
await samplesAdmin.goto(`${BASE}/admin/samples`);
const card = samplesAdmin.locator("li", { hasText: "Jane Public" }).first();
await card.waitFor({ timeout: 10000 });
check("A5. the administrator sees the request with its requested finish", /Keswick Oak/.test(await card.innerText()) && /LA9 4AA/.test(await card.innerText()));
await card.getByRole("button", { name: "Start packing" }).click();
await notice(samplesAdmin, /^Saved\.$/);
check("    and moves it to packing", sql("select status from sample_requests where email='jane@public.example.com'") === "processing");
const card2 = samplesAdmin.locator("li", { hasText: "Jane Public" }).first();
await card2.locator("input[name=carrier]").fill("Royal Mail"); await card2.locator("input[name=tracking_ref]").fill("AB123456789GB"); await card2.locator("input[name=dispatch_note]").fill("Second class, no signature");
await card2.getByRole("button", { name: "Mark sent" }).click();
await notice(samplesAdmin, /Marked sent, but the email to the customer failed/);
check("A6. dispatch details are recorded when marked sent", sql("select status || '|' || carrier || '|' || tracking_ref || '|' || (sent_at is not null) || '|' || (dispatched_by is not null) from sample_requests where email='jane@public.example.com'") === "sent|Royal Mail|AB123456789GB|true|true");
check("    the failed dispatch email is reported, not claimed as sent", sql("select (customer_notified_at is null) from sample_requests where email='jane@public.example.com'") === "t" && sql("select status from notification_log where kind='sample_dispatched'") === "failed");
const csv = await samplesAdmin.request.get(`${BASE}/admin/samples/export`);
check("    the CSV export carries the dispatch details", csv.status() === 200 && /Royal Mail/.test(await csv.text()));

// ===========================================================================
// B. Stockists, verification and the enquiry journey
// ===========================================================================
async function addStockist(p, { name, postcode, verified, published, lead, range }) {
  await p.goto(`${BASE}/admin/stockists`); await p.locator("#s-new-name").waitFor({ timeout: 10000 });
  await p.fill("#s-new-name", name); await p.fill("#s-new-address", "1 Test Street, Kendal"); await p.fill("#s-new-postcode", postcode);
  await p.fill("#s-new-email", `hello@${name.toLowerCase().replace(/\W+/g, "")}.example.co.uk`);
  await p.fill("#s-new-hours", "Mon to Fri 9 to 5, as confirmed by phone");
  for (const f of range ?? []) await p.locator(`input[name=finish_ids][value="${f}"]`).first().check();
  if (verified) await p.locator("input[name=verified]").first().check();
  if (published) await p.locator("input[name=published]").first().check();
  if (lead) { await p.locator("summary", { hasText: "Private: leads" }).first().click(); await p.fill("#s-new-lead", lead); }
  await p.getByRole("button", { name: "Add stockist" }).click();
}
await addStockist(stockistAdmin, { name: "Ops Floors", postcode: "LA9 4DT", verified: true, published: true, lead: "leads@opsfloors.example.co.uk", range: [kes] });
await stockistAdmin.getByText(/Saved Ops Floors/).waitFor({ timeout: 20000 });
const ops = sql("select id from stockists where name='Ops Floors'");
check("B1. an administrator adds a verified stockist with its range and a private lead address", sql(`select (verified_at is not null)::text || '|' || published || '|' || coalesce(email,'') from stockists where id='${ops}'`) === "true|true|hello@opsfloors.example.co.uk");
check("    the range and private detail are stored", sql(`select count(*) from stockist_products where stockist_id='${ops}'`) === "1" && sql(`select lead_email from stockist_private where stockist_id='${ops}'`) === "leads@opsfloors.example.co.uk");
await addStockist(stockistAdmin, { name: "Draft Tiles Test", postcode: "LA9 4DT", verified: false, published: false });
await stockistAdmin.getByText(/Saved Draft Tiles Test/).waitFor({ timeout: 20000 });
const draft = sql("select id from stockists where name='Draft Tiles Test'");
check("    a stockist can be saved as an unverified draft that is not public", sql(`select published::text || '|' || (verified_at is null)::text from stockists where id='${draft}'`) === "false|true");

// What the public can read
const pub = await newCtx(); const pp = await pub.newPage();
const rest = (path) => pp.request.get(`http://127.0.0.1:54321/rest/v1/${path}`, { headers: { apikey: process.env.ANON, authorization: `Bearer ${process.env.ANON}` } });
const rows = async (path) => { const r = await rest(path); return r.status() === 200 ? await r.json() : { status: r.status() }; };
check("B2. the public API shows the published stockist and not the draft", JSON.stringify(await rows("stockists?select=name")) === '[{"name":"Ops Floors"}]');
check("    private stockist detail, enquiries and consent are unreadable to the public", (await rows("stockist_private?select=*")).length === 0 && (await rows("enquiries?select=*")).length === 0 && (await rows("consent_records?select=*")).length === 0 && (await rows("notification_log?select=*")).length === 0);

// The enquiry
async function enquire(path, who, { consent = true, hp = false } = {}) {
  const ctx = await newCtx(); const p = await ctx.newPage();
  await p.goto(BASE + path); await p.locator("input[name=name]").waitFor({ timeout: 10000 });
  await p.fill("input[name=name]", who.name); await p.fill("input[name=email]", who.email); await p.fill("textarea[name=message]", who.message ?? "Do you carry Keswick Oak, and when are you open?");
  if (consent && (await p.locator("input[name=share_with_stockist]").count())) await p.check("input[name=share_with_stockist]");
  if (hp) await p.locator("#company_website").evaluate((el) => { el.value = "spam.example"; });
  await p.getByRole("button", { name: "Send message" }).click();
  return p;
}
const ep = await enquire(`/contact?stockist=${ops}`, { name: "Jane Public", email: "jane@public.example.com" }, { consent: false });
check("B3. the enquiry form names the stockist and needs consent to pass the message on", /Your message is for\s*Ops Floors/.test(await text(ep)) && await ep.getByText("Tick the box so we can pass your message on.").waitFor({ timeout: 10000 }).then(() => true, () => false) && sql("select count(*) from enquiries") === "0");
await ep.check("input[name=share_with_stockist]"); await ep.getByRole("button", { name: "Send message" }).click();
check("    with consent it is recorded", await until(() => sql("select count(*) from enquiries where kind='stockist'") === "1"), await text(ep));
await ep.getByText("Thank you. We’ve got your message.").waitFor({ timeout: 15000 });
check("    it says it will pass the message on (not that it has), and promises no stock", /will pass it on to Ops Floors/.test(await ep.locator("body").innerText()) && /Nothing here confirms that any product is in stock/.test(await text(ep)));
check("    the consent is recorded with the wording they agreed to", sql("select count(*) from consent_records where purpose='stockist_contact' and wording like '%Ops Floors%'") === "1");
check("    forwarding is logged as failed, forwarded_at stays empty", await until(() => sql("select count(*) from notification_log where kind='enquiry_stockist' and status='failed'") === "1") && sql("select (forwarded_at is null)::text from enquiries where kind='stockist'") === "true");
const dpc = await newCtx(); const dp = await dpc.newPage();
await dp.goto(`${BASE}/contact?stockist=${draft}`); await dp.locator("input[name=name]").waitFor({ timeout: 10000 });
check("B4. a stockist that isn't live can't be enquired about", !/Your message is for/.test(await text(dp)) && (await dp.locator("input[name=stockist_id]").count()) === 0);
await enquire("/contact?finish=keswick-oak", { name: "Pat Product", email: "pat@public.example.com", message: "Is Keswick Oak suitable for a conservatory?" });
check("B5. a product enquiry about a finish is recorded", await until(() => sql("select count(*) from enquiries where kind='product' and finish_id is not null") === "1"));
await enquire("/contact", { name: "Bot", email: "bot2@public.example.com" }, { hp: true }); await sleep(2000);
check("B6. a bot filling the hidden field is ignored", sql("select count(*) from enquiries where email='bot2@public.example.com'") === "0");
await enquire("/contact", { name: "Jane Public", email: "jane@public.example.com", message: "One more" }); await until(() => sql("select count(*) from enquiries where email='jane@public.example.com'") === "2");
await enquire("/contact", { name: "Jane Public", email: "jane@public.example.com", message: "And another" }); await until(() => sql("select count(*) from enquiries where email='jane@public.example.com'") === "3");
const rl = await enquire("/contact", { name: "Jane Public", email: "jane@public.example.com", message: "A fourth" });
check("B7. the same person is rate limited after three messages in a day", await until(async () => /already received your messages today/.test(await rl.locator("body").innerText())) && sql("select count(*) from enquiries where email='jane@public.example.com'") === "3");

// Admin handles it
await stockistAdmin.goto(`${BASE}/admin/enquiries`);
const ecard = stockistAdmin.locator("li", { hasText: "Do you carry Keswick Oak" }).first();
await ecard.waitFor({ timeout: 10000 });
check("B8. the administrator sees the enquiry, who it is for and the consent given", /for a stockist: ops floors/i.test(await ecard.innerText()) && /agreed to share/i.test(await ecard.innerText()));
await ecard.getByRole("button", { name: /Pass to Ops Floors by email/ }).click();
await notice(stockistAdmin, /The email didn.t send/);
check("    passing it on reports a failed email instead of claiming success", sql("select (forwarded_at is null)::text from enquiries where kind='stockist' and message like 'Do you carry%'") === "true");
await stockistAdmin.locator("li", { hasText: "Do you carry Keswick Oak" }).first().getByRole("button", { name: "Mark contacted" }).click();
await notice(stockistAdmin, /^Saved\.$/);
check("    and marks it contacted", sql("select status || '|' || (handled_by is not null)::text from enquiries where kind='stockist' and message like 'Do you carry%'") === "contacted|true");

// ===========================================================================
// C. Permissions
// ===========================================================================
check("C1. a samples manager cannot open enquiries, stockists, privacy or analytics", (await notFound(samplesAdmin, "/admin/enquiries")) && (await notFound(samplesAdmin, "/admin/stockists")) && (await notFound(samplesAdmin, "/admin/privacy")) && (await notFound(samplesAdmin, "/admin/analytics")));
check("C2. a stockist manager cannot open samples, the CSV, privacy or the export", (await notFound(stockistAdmin, "/admin/samples")) && (await stockistAdmin.request.get(`${BASE}/admin/samples/export`)).status() === 404 && (await stockistAdmin.request.get(`${BASE}/admin/privacy/export?email=jane@public.example.com`)).status() === 404 && (await notFound(stockistAdmin, "/admin/privacy")));
check("    nor edit finishes, prices or documents", (await notFound(stockistAdmin, `/admin/finishes/${kes}`)) && (await notFound(stockistAdmin, "/admin/prices/history")) && (await notFound(stockistAdmin, "/admin/documents")));
const fitter = await login(await newCtx(), "fitter@e2e.local");
check("C3. an approved trader cannot open any admin screen or admin download", (await notFound(fitter, "/admin")) && (await notFound(fitter, "/admin/enquiries")) && (await notFound(fitter, "/admin/privacy")) && (await fitter.request.get(`${BASE}/admin/privacy/export?email=jane@public.example.com`)).status() === 404);
const anon = await (await newCtx()).newPage();
await anon.goto(`${BASE}/admin/privacy`); await sleep(1500);
check("    and a visitor is sent to log in", /\/trade\/login/.test(anon.url()));
check("C4. the retention job refuses without its secret and with the wrong one", (await anon.request.get(`${BASE}/api/cron/retention`)).status() === 401 && (await anon.request.get(`${BASE}/api/cron/retention`, { headers: { authorization: "Bearer wrong" } })).status() === 401);
const cron = await anon.request.get(`${BASE}/api/cron/retention`, { headers: { authorization: `Bearer ${CRON}` } });
check("    and runs with it", cron.status() === 200 && (await cron.json()).ok === true);
check("C5. direct writes to enquiries, consent and the email log are refused to a signed-in trader", await (async () => {
  const { data: s } = await createClient("http://127.0.0.1:54321", process.env.ANON, { auth: { persistSession: false } }).auth.signInWithPassword({ email: "fitter@e2e.local", password: "Correct-Horse-42" });
  const c = createClient("http://127.0.0.1:54321", process.env.ANON, { global: { headers: { authorization: `Bearer ${s.session.access_token}` } }, auth: { persistSession: false } });
  const a = await c.from("enquiries").insert({ kind: "contact", name: "x", email: "x@x.local", message: "x" });
  const b = await c.from("notification_log").insert({ kind: "x", recipient: "x@x.local", subject: "x", status: "sent" });
  const d = await c.from("consent_records").insert({ email: "x@x.local", purpose: "marketing", granted: true, wording: "x", source: "x" });
  const e = await c.rpc("erase_person_data", { p_email: "jane@public.example.com" });
  return !!a.error && !!b.error && !!d.error && !!e.error;
})());

// ===========================================================================
// D. Views, analytics and the overview
// ===========================================================================
const UA = { "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36" };
await anon.request.post(`${BASE}/api/view`, { data: { slug: "keswick-oak" }, headers: UA });
await anon.request.post(`${BASE}/api/view`, { data: { slug: "keswick-oak" }, headers: { "user-agent": "Googlebot/2.1" } });
const bad = await anon.request.post(`${BASE}/api/view`, { data: { slug: "'; drop table finishes" }, headers: UA });
check("D1. a finish view is counted once; bots and bad input are ignored without error", sql("select coalesce(sum(views),0) from finish_views") === "1" && bad.status() === 204);
await owner.goto(`${BASE}/admin/analytics`); await owner.getByRole("heading", { name: "Analytics" }).waitFor({ timeout: 10000 });
const at = await text(owner);
check("D2. analytics separates views, samples, enquiries, quotes and sales", /Finish page views/.test(at) && /Sample requests/.test(at) && /Enquiries/.test(at) && /Trade quotes/.test(at) && /Actual sales\s*Not tracked/.test(at));
check("    states that an accepted quote is not a Duratek sale, and shows no revenue", /Not a Duratek sale/.test(at) && !/£/.test(at));
check("    counts the journeys that just happened", /Sample requests\s*1/.test(at) && /Enquiries\s*[3-9]/.test(at), at.slice(at.indexOf("What each number means"), at.indexOf("What each number means") + 420));
await owner.goto(`${BASE}/admin`); await owner.getByText("At a glance").waitFor({ timeout: 10000 });
const ot = await text(owner);
check("D3. the overview shows products, accounts, stockists, samples, enquiries and activity", /Products/.test(ot) && /Trade accounts/.test(ot) && /Stockists live\s*1/.test(ot) && /Sample requests/.test(ot) && /Enquiries/.test(ot) && /Recent activity/.test(ot));
check("    quotes are labelled as the traders' own, not sales", /not Duratek sales/.test(ot));

// ===========================================================================
// E. Privacy: request, export, erase, retention, self-service
// ===========================================================================
const priv = await (await newCtx()).newPage();
await priv.goto(`${BASE}/privacy/request`); await priv.locator("input[name=email]").waitFor();
await priv.fill("input[name=email]", "jane@public.example.com"); await priv.selectOption("select[name=kind]", "erase"); await priv.fill("textarea[name=details]", "Please delete everything.");
await priv.getByRole("button", { name: "Send request" }).click();
check("E1. a person can ask to see or delete their information", await until(() => sql("select kind || '|' || status from privacy_requests where email='jane@public.example.com'") === "erase|new"));
await owner.goto(`${BASE}/admin/privacy`); await owner.getByText("jane@public.example.com").first().waitFor({ timeout: 10000 });
check("    the owner sees it with a one-month deadline", /reply by/.test(await text(owner)) && sql("select (due_at > now() + interval '27 days')::text from privacy_requests where email='jane@public.example.com'") === "true");
const exp = await owner.request.get(`${BASE}/admin/privacy/export?email=Jane@Public.example.com`);
const expJson = exp.status() === 200 ? await exp.json() : {};
check("E2. the owner can export everything held about an email address", exp.status() === 200 && /attachment/.test(exp.headers()["content-disposition"] ?? "") && expJson.sample_requests?.[0]?.name === "Jane Public" && expJson.enquiries?.length === 3 && expJson.consent_records?.length >= 2 && Array.isArray(expJson.emails_sent), `${exp.status()} ${JSON.stringify(expJson).slice(0, 300)}`);
check("    the export is not cached and holds no admin notes", /no-store/.test(exp.headers()["cache-control"] ?? "") && !JSON.stringify(expJson).includes("admin_note"));
await owner.locator("form", { hasText: "Erase their data" }).locator("input[name=email]").fill("jane@public.example.com");
await owner.locator("form", { hasText: "Erase their data" }).getByRole("button", { name: "Erase" }).click();
await notice(owner, /Tick the box to confirm/);
check("E3. erasing needs an explicit confirmation", sql("select count(*) from sample_requests where email='jane@public.example.com'") === "1");
await owner.locator("form", { hasText: "Erase their data" }).locator("input[name=email]").fill("jane@public.example.com");
await owner.locator("form", { hasText: "Erase their data" }).locator("input[name=confirm]").check();
await owner.locator("form", { hasText: "Erase their data" }).getByRole("button", { name: "Erase" }).click();
await notice(owner, /Erased: 1 sample requests, 3 enquiries/);
check("    and then anonymises their sample requests, enquiries and consent", sql("select count(*) from sample_requests where lower(email) like '%jane%' or name='Jane Public'") === "0" && sql("select count(*) from enquiries where name='Jane Public' or lower(email)='jane@public.example.com'") === "0" && sql("select count(*) from consent_records where lower(email)='jane@public.example.com'") === "0");
check("    the dispatch record survives without the person, and the open request is closed", sql("select carrier || '|' || name from sample_requests where tracking_ref='AB123456789GB'") === "Royal Mail|Removed" && sql("select status from privacy_requests where kind='erase' and anonymised_at is null limit 1") !== "new");
check("    nothing personal remains in the audit log", sql("select count(*) from audit_log where (old_data::text ilike '%jane%' or new_data::text ilike '%jane%' or old_data::text ilike '%Lake Road%')") === "0");
sql("insert into sample_requests (name, email, address_line1, town, postcode, finish_ids, created_at) select 'Old Customer', 'old@public.example.com', '1 Old Rd', 'Kendal', 'LA9 4AA', array[id], now() - interval '30 months' from finishes where slug='keswick-oak'");
await owner.goto(`${BASE}/admin/privacy`);
await owner.getByRole("button", { name: "Run retention now" }).click();
await notice(owner, /Retention run: 1 sample requests/);
check("E4. the retention job anonymises personal data past its period and keeps recent data", sql("select count(*) from sample_requests where email='old@public.example.com'") === "0" && sql("select count(*) from sample_requests where anonymised_at is not null") === "2" && sql("select count(*) from sample_requests where name='Kate Kirk' or email='stale@public.example.com'") === "0");
const pt = await text(owner);
check("E5. consent and the email log are visible to the owner, with honest results", /What people agreed to/.test(pt) && /Email log/.test(pt) && /Failed/.test(pt) && !/>Sent</.test(await owner.locator("main").innerHTML()));

// A trader's own information
const other = await login(await newCtx(), "other@e2e.local");
const mine = await other.request.get(`${BASE}/trade/account/settings/export`);
const mineJson = mine.status() === 200 ? await mine.json() : {};
check("E6. a trader can download their own information", mine.status() === 200 && mineJson.email === "other@e2e.local" && mineJson.profile?.company_name === "Other Floors" && JSON.stringify(mineJson).indexOf("fitter@e2e.local") === -1);
check("    a visitor cannot", (await anon.request.get(`${BASE}/trade/account/settings/export`)).status() === 404);
await other.goto(`${BASE}/trade/account/settings`); await other.locator("#delete-confirm").waitFor({ timeout: 10000 });
await other.fill("#delete-confirm", "delete"); await other.getByRole("button", { name: "Delete my account" }).click();
await notice(other, /Type DELETE in capitals/);
check("E7. deleting your account needs the word DELETE", sql("select count(*) from profiles where company_name='Other Floors'") === "1");
await other.fill("#delete-confirm", "DELETE"); await other.getByRole("button", { name: "Delete my account" }).click();
await other.waitForURL(/\/trade\?notice=account-deleted/, { timeout: 15000, waitUntil: "commit" });
check("    and then removes the account and its data", sql("select count(*) from profiles where company_name='Other Floors'") === "0" && sql("select count(*) from auth.users where email='other@e2e.local'") === "0");
const relog = await (await newCtx()).newPage();
await relog.goto(`${BASE}/trade/login`); await relog.fill("#field-email", "other@e2e.local"); await relog.fill("#field-password", "Correct-Horse-42"); await relog.click("main button[type=submit]"); await sleep(2500);
check("    and they can no longer log in", /\/trade\/login/.test(relog.url()));
check("    the audit log records the deletion without the person's details", sql("select count(*) from audit_log where action='delete_account'") === "1" && sql("select count(*) from audit_log where old_data::text ilike '%Other Floors%' or new_data::text ilike '%Other Floors%'") === "0");

// ===========================================================================
// F. Documents: photography and brand assets
// ===========================================================================
await owner.goto(`${BASE}/admin/documents`); await owner.locator("#doc-file").waitFor({ timeout: 10000 });
await owner.setInputFiles("#doc-file", join(FIX, "fake.png")); await owner.fill("#doc-title", "Not really a photo"); await owner.selectOption("#doc-type", "marketing_photo");
await owner.getByRole("button", { name: "Upload" }).click();
await notice(owner, /Photography must be a PNG/);
check("F1. a script disguised as an image is refused by its content, not its name", sql("select count(*) from documents where title='Not really a photo'") === "0");
await owner.setInputFiles("#doc-file", join(FIX, "scene.png")); await owner.fill("#doc-title", "Keswick Oak kitchen"); await owner.selectOption("#doc-type", "marketing_photo");
await owner.locator("input[name=trade_only]").first().uncheck();
await owner.getByRole("button", { name: "Upload" }).click();
await owner.getByText("Keswick Oak kitchen").first().waitFor({ timeout: 15000 });
check("F2. marketing photography uploads, with its real type recorded", sql("select type || '|' || content_type || '|' || trade_only from documents where title='Keswick Oak kitchen'") === "marketing_photo|image/png|false");
const docId = sql("select id from documents where title='Keswick Oak kitchen'");
const dl = await anon.request.get(`${BASE}/documents/${docId}`, { maxRedirects: 0 });
check("F3. a public document downloads through a short-lived signed link", dl.status() === 303 && /\/storage\/v1\/object\/sign\//.test(dl.headers().location ?? "") && /no-store/.test(dl.headers()["cache-control"] ?? ""), `${dl.status()} ${dl.headers().location} ${dl.headers()["cache-control"]}`);
sql("update documents set trade_only = true where id = '" + docId + "'");
const gated = await anon.request.get(`${BASE}/documents/${docId}`, { maxRedirects: 0 });
check("    and a trade-only one is not available to a visitor", gated.status() === 404);

// ===========================================================================
// G. Variants and archive
// ===========================================================================
await owner.goto(`${BASE}/admin/finishes/${kirk}`); await owner.locator("#v-new-name").waitFor({ timeout: 10000 });
await owner.fill("#v-new-name", "Extra pack"); await owner.fill("#v-new-sku", "dt-kirk-xp"); await owner.fill("#v-new-cov", "3.3"); await owner.fill("#v-new-len", "1524"); await owner.fill("#v-new-wid", "228");
await owner.getByRole("button", { name: "Add variant" }).click();
await owner.getByText("Saved Extra pack.").waitFor({ timeout: 15000 });
check("G1. an administrator adds a variant with its pack coverage", sql("select sku || '|' || pack_coverage_m2 || '|' || length_mm || '|' || is_default::text from product_variants where name='Extra pack'") === "DT-KIRK-XP|3.300|1524|false");
await owner.fill("#v-new-name", "Bad pack"); await owner.fill("#v-new-sku", "DT-KIRK-BAD");
await owner.getByRole("button", { name: "Add variant" }).click();
await owner.getByText("A pack needs the area it covers.").waitFor({ timeout: 10000 });
check("    a pack without its coverage is refused", sql("select count(*) from product_variants where name='Bad pack'") === "0");
await owner.goto(`${BASE}/admin/finishes/${kirk}`);
await owner.getByRole("button", { name: "Archive finish" }).click();
await owner.waitForURL(/\/admin\/finishes\?notice=archived/, { timeout: 15000, waitUntil: "commit" });
check("G2. archiving a finish unpublishes it and keeps its history", sql("select (archived_at is not null)::text || '|' || published::text from finishes where slug='kirkstone-grey-oak'") === "true|false" && sql("select count(*) from product_variants where finish_id = '" + kirk + "'") !== "0");
let gone = false;
for (let i = 0; i < 4 && !gone; i++) { const pg = await (await newCtx()).newPage(); await pg.goto(`${BASE}/range/kirkstone-grey-oak`); await sleep(800); gone = /couldn.t find/i.test(await pg.locator("body").innerText()); }
check("    it disappears from the public site", gone);
await owner.goto(`${BASE}/admin/finishes`); await owner.getByRole("heading", { name: "Archived" }).waitFor({ timeout: 10000 }); check("    and is listed as archived for the owner", /Archived/.test(await text(owner)) && /Kirkstone Grey Oak/.test(await text(owner)));
await owner.goto(`${BASE}/admin/finishes/${kirk}`); await owner.getByRole("button", { name: "Restore" }).click(); await notice(owner, /Restored/);
check("    restoring it leaves it hidden until published", sql("select (archived_at is null)::text || '|' || published::text from finishes where slug='kirkstone-grey-oak'") === "true|false");

// Price history
await owner.goto(`${BASE}/admin/prices/history`); await owner.getByRole("heading", { name: "Price history" }).waitFor({ timeout: 10000 });
check("G3. price history shows who changed which price", /Who/.test(await text(owner)) && (/Added|Changed/.test(await text(owner))));

check("no client-side errors", errors.length === 0, errors.join(" / "));
await browser.close();
console.log(`\n${results.filter(Boolean).length}/${results.length} passed`);
process.exit(results.every(Boolean) ? 0 : 1);

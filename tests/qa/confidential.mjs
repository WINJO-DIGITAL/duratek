// Trade price confidentiality. For every kind of caller, every page (HTML and
// RSC data) and every raw database API route: nobody sees a trade price that
// isn't theirs. Local stack only. Run: node tests/qa/confidential.mjs
import { chromium } from "../e2e/browser.mjs";
import { createClient } from "@supabase/supabase-js";
import { execSync } from "node:child_process";

const BASE = "http://localhost:3000", API = "http://127.0.0.1:54321";
const sql = (q) => execSync(`psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -v ON_ERROR_STOP=1 -tAc "${q.replace(/"/g, '\\"')}"`).toString().trim();
const results = [];
const check = (n, ok, d = "") => { results.push(ok); console.log(`${ok ? "PASS" : "FAIL"}  ${n}${d ? "  — " + d : ""}`); };
const admin = createClient(API, process.env.SRK, { auth: { persistSession: false } });
const PW = "Correct-Horse-42";

// ------------------------------------------------------------------ fixtures
async function user(email, status, extra = "") {
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 });
  let u = list.users.find((x) => x.email === email);
  if (!u) ({ data: { user: u } } = await admin.auth.admin.createUser({ email, password: PW, email_confirm: true, user_metadata: { company_name: email } }));
  sql(`update profiles set status = '${status}' ${extra} where id = '${u.id}'`);
  return u.id;
}
const tierA = sql("select id from price_tiers where name like 'Demo tier A%'"), tierB = sql("select id from price_tiers where name like 'Demo tier B%'");
const ids = {
  pending: await user("c-pending@e2e.local", "pending"),
  rejected: await user("c-rejected@e2e.local", "rejected"),
  suspended: await user("c-suspended@e2e.local", "suspended", `, tier_id = '${tierA}'`),
  tierA: await user("c-tiera@e2e.local", "approved", `, tier_id = '${tierA}'`),
  tierB: await user("c-tierb@e2e.local", "approved", `, tier_id = '${tierB}'`),
  acct: await user("c-acct@e2e.local", "approved", `, tier_id = '${tierA}'`),
  noTier: await user("c-notier@e2e.local", "approved"),
};
// Distinct secret prices: standard trade 1999, this account's own price 1888. (Tier A 2222, tier B 1111 are seeded.)
const V = sql("select v.id from product_variants v join finishes f on f.id = v.finish_id where f.slug='keswick-oak' and v.is_default");
const stdList = sql("select id from price_lists where kind='trade' and is_default");
sql(`insert into price_list_items (price_list_id, variant_id, amount_pence, price_unit) values ('${stdList}', '${V}', 1999, 'm2') on conflict do nothing`);
const acctList = sql(`insert into price_lists (code, name, kind, profile_id, prices_include_vat) values ('c-account', 'c-account', 'account', '${ids.acct}', false) on conflict (code) do update set name = excluded.name returning id`).split("\n")[0];
sql(`insert into price_list_items (price_list_id, variant_id, amount_pence, price_unit) values ('${acctList}', '${V}', 1888, 'm2') on conflict do nothing`);

const SECRET = { 2222: "tier A", 1111: "tier B", 1999: "standard trade", 1888: "account price" };
const OWN = { anon: [], pending: [], rejected: [], suspended: [], tierA: [2222], tierB: [1111], acct: [1888, 2222], noTier: [1999] };
const forbidden = (who) => Object.keys(SECRET).map(Number).filter((n) => !OWN[who].includes(n));
const fmt = (p) => `${Math.floor(p / 100)}.${String(p % 100).padStart(2, "0")}`;
/** Where a pence value would show up as a price: "£22.22", "22.22", or a JSON price field. */
const leaksOf = (body, pence) => {
  const m = [];
  if (new RegExp(`£\\s?${fmt(pence).replace(".", "\\.")}(?!\\d)`).test(body) || new RegExp(`\\\\u00a3${fmt(pence).replace(".", "\\.")}(?!\\d)`).test(body)) m.push(`shows £${fmt(pence)}`);
  if (new RegExp(`"[A-Za-z_]*(price|amount|pence|Pence|net|gross)[A-Za-z_]*"\\s*:\\s*${pence}(?![\\d.])`).test(body)) m.push(`has ${pence} in a price field`);
  return m;
};

// ------------------------------------------------------------------ raw database API, as each caller
const anonClient = () => createClient(API, process.env.ANON, { auth: { persistSession: false } });
async function client(who) {
  if (who === "anon") return anonClient();
  const email = { pending: "c-pending", rejected: "c-rejected", suspended: "c-suspended", tierA: "c-tiera", tierB: "c-tierb", acct: "c-acct", noTier: "c-notier" }[who] + "@e2e.local";
  const c = anonClient();
  const { error } = await c.auth.signInWithPassword({ email, password: PW });
  if (error) throw new Error(`login ${who}: ${error.message}`);
  return c;
}
const TABLES = ["prices", "price_overrides", "price_list_items", "price_lists", "product_variants", "finishes", "quote_lines"];
for (const who of Object.keys(OWN)) {
  const c = await client(who);
  const seen = [];
  for (const t of TABLES) {
    const { data, error } = await c.from(t).select("*").limit(5000);
    if (!error) seen.push([t, JSON.stringify(data)]);
  }
  for (const rpc of [["price_for", { p_variant: V, p_quantity: 1 }], ["catalogue_prices", {}], ["price_for_account", { p_profile: ids.tierA, p_variant: V, p_quantity: 1 }], ["price_for", { p_variant: V, p_quantity: 1, p_at: new Date(Date.now() + 864e5 * 40).toISOString() }]]) {
    const { data, error } = await c.rpc(rpc[0], rpc[1]);
    if (!error) seen.push([`rpc ${rpc[0]}`, JSON.stringify(data)]);
    if (rpc[0] === "price_for_account") check(`API ${who}: price_for_account (another account's price) is refused`, !!error);
  }
  const leaks = [];
  for (const [where, body] of seen) for (const p of forbidden(who)) for (const m of leaksOf(body, p)) leaks.push(`${where} ${m} (${SECRET[p]})`);
  check(`API ${who}: no trade price that isn't theirs from any table or function`, leaks.length === 0, leaks.slice(0, 3).join("; "));
  if (who === "anon" || who === "pending" || who === "rejected" || who === "suspended") {
    const { data: pf } = await c.rpc("price_for", { p_variant: V, p_quantity: 1 });
    check(`API ${who}: the price function returns only the RRP (3333 inc VAT)`, pf?.length === 1 && pf[0].source === "rrp" && pf[0].gross_pence === 3333);
    const { data: pa } = await c.rpc("price_for", { p_variant: V, p_quantity: 1, p_at: new Date(Date.now() + 864e5 * 40).toISOString() });
    check(`API ${who}: asking about a future date is ignored`, pa?.length === 1 && pa[0].source === "rrp");
  }
  if (who === "tierA") {
    const { data } = await c.rpc("price_for", { p_variant: V, p_quantity: 1 });
    check("API tier A: sees tier A's price 22.22 ex VAT and 26.66 inc VAT", data?.[0]?.net_pence === 2222 && data[0].gross_pence === 2666 && data[0].source === "trade");
  }
  if (who === "acct") {
    const { data } = await c.rpc("price_for", { p_variant: V, p_quantity: 1 });
    check("API account: the account price (18.88) wins over its tier (22.22)", data?.[0]?.net_pence === 1888 && data[0].source === "account");
  }
  if (who === "noTier") {
    const { data } = await c.rpc("price_for", { p_variant: V, p_quantity: 1 });
    check("API no tier: approved account without a tier gets the standard trade price (19.99)", data?.[0]?.net_pence === 1999 && data[0].source === "trade");
  }
}

// ------------------------------------------------------------------ pages, HTML and RSC data
const PAGES = ["/", "/range", "/range/keswick-oak", "/range/fellside-oak", "/compare?f=keswick-oak,fellside-oak", "/saved", "/explore", "/where-to-buy", "/samples", "/inspiration", "/technology", "/warranty", "/trade", "/contact", "/privacy", "/sitemap.xml", "/robots.txt"];
async function login(who) {
  const b = browser, ctx = await b.newContext(); await ctx.route(/cdn\.shopify\.com/, (r) => r.abort());
  if (who === "anon") return ctx;
  const p = await ctx.newPage();
  const email = { pending: "c-pending", rejected: "c-rejected", suspended: "c-suspended", tierA: "c-tiera", tierB: "c-tierb", acct: "c-acct", noTier: "c-notier" }[who] + "@e2e.local";
  await p.goto(`${BASE}/trade/login`); await p.fill("#field-email", email); await p.fill("#field-password", PW);
  await p.click("main button[type=submit]"); await p.waitForTimeout(2500);
  await p.close();
  return ctx;
}
const browser = await chromium.launch();
for (const who of Object.keys(OWN)) {
  const ctx = await login(who);
  const page = await ctx.newPage();
  const leaks = []; let bodies = 0;
  for (const path of PAGES) {
    for (const hdr of [{}, { RSC: "1" }]) {
      const res = await page.request.get(BASE + path, { headers: hdr });
      const body = await res.text(); bodies++;
      for (const p of forbidden(who)) for (const m of leaksOf(body, p)) leaks.push(`${path}${hdr.RSC ? " (RSC)" : ""} ${m} (${SECRET[p]})`);
    }
  }
  check(`pages ${who}: ${bodies} responses (HTML and RSC) carry no trade price that isn't theirs`, leaks.length === 0, leaks.slice(0, 3).join("; "));
  if (OWN[who].length) {
    const html = await (await page.request.get(`${BASE}/range/keswick-oak`)).text();
    const own = OWN[who][0];
    check(`pages ${who}: their own price (${fmt(own)}) does show on the finish page`, new RegExp(`(?<![\\d.])${fmt(own).replace(".", "\\.")}(?!\\d)`).test(html));
  } else {
    const html = await (await page.request.get(`${BASE}/range/keswick-oak`)).text();
    const hit = html.match(/Your price|Your buying price/);
    check(`pages ${who}: sees the public RRP £33.33 and no trade price block`, /33\.33/.test(html) && !hit, hit ? `matched "${hit[0]}": …${html.slice(Math.max(0, hit.index - 80), hit.index + 60).replace(/\s+/g, " ")}…` : "");
  }
  await ctx.close();
}
// Trade-only pages for people who aren't approved trade
for (const who of ["anon", "pending", "rejected", "suspended"]) {
  const ctx = await login(who); const p = await ctx.newPage(); let ok = true; const det = [];
  for (const path of ["/trade/account", "/trade/account/catalogue", "/trade/account/quotes", "/trade/account/calculator", "/trade/present", "/trade/present/keswick-oak"]) {
    await p.goto(BASE + path); await p.waitForTimeout(1500);
    const body = await p.content();
    const onLogin = /\/trade\/login/.test(p.url());
    const pend = /\/trade\/account$/.test(p.url()) && who !== "anon";
    const leak = Object.keys(SECRET).some((s) => leaksOf(body, Number(s)).length);
    const hit = body.match(/Gross profit|Your buying price|Your price, ex VAT/);
    if (leak || hit) { ok = false; det.push(`${path} (${leak ? "price" : hit[0]})`); }
    if (!(onLogin || pend || /couldn.t find|waiting|pending|not.*approved|suspended/i.test(await p.locator("body").innerText()))) { ok = false; det.push(path + ` (no gate; at ${p.url()})`); }
  }
  check(`gates ${who}: trade pages show no price, buying price or profit`, ok, det.join(", "));
  await ctx.close();
}
await browser.close();
console.log(`\n${results.filter(Boolean).length}/${results.length} passed`);
process.exit(results.every(Boolean) ? 0 : 1);

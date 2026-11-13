#!/usr/bin/env node
// Read-only smoke test for a deployed site. It only sends GET requests: it
// never submits a form, logs in or writes data, so it is safe to run against
// production after every deploy.
//   node scripts/smoke-live.mjs https://duratek.vercel.app
const BASE = (process.argv[2] ?? process.env.BASE_URL ?? "").replace(/\/+$/, "");
if (!/^https?:\/\//.test(BASE)) { console.error("Usage: node scripts/smoke-live.mjs https://your-site"); process.exit(2); }
const results = [];
const check = (name, ok, detail = "") => { results.push(ok); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); };
const get = async (path, init = {}) => {
  try { const r = await fetch(BASE + path, { redirect: "manual", ...init, signal: AbortSignal.timeout(20000) }); return { status: r.status, headers: r.headers, text: await r.text() }; }
  catch (e) { return { status: 0, headers: new Headers(), text: "", error: String(e) }; }
};

// Public pages respond
const pages = ["/", "/range", "/explore", "/inspiration", "/where-to-buy", "/samples", "/contact", "/technology", "/warranty", "/trade", "/trade/login", "/trade/apply", "/privacy", "/privacy/request", "/cookies", "/robots.txt", "/sitemap.xml"];
const bad = [];
for (const p of pages) { const r = await get(p); if (r.status !== 200) bad.push(`${p} ${r.status || r.error}`); }
check(`${pages.length} public pages respond`, bad.length === 0, bad.join(", "));

// The range lists finishes, and a finish page shows a public price and no trade price
const range = await get("/range");
const slugs = [...new Set([...range.text.matchAll(/href="\/range\/([a-z0-9-]+)"/g)].map((m) => m[1]))];
check("the range lists finishes", slugs.length > 0, `${slugs.length} found`);
if (slugs.length) {
  const f = await get(`/range/${slugs[0]}`);
  check(`a finish page responds (${slugs[0]})`, f.status === 200);
  check("it shows a public price", /£\s?\d+\.\d{2}/.test(f.text) || /\\u00a3\d+\.\d{2}/.test(f.text));
  check("it carries no trade price, cost or margin to a visitor", !/Your trade price|Your account price|Your buying price|unit_cost|Gross profit/.test(f.text));
  check("no 'scratch-proof' claim", !/(?<!does not mean )(?<!not )scratch[- ]?proof/i.test(f.text));
}

// Private areas are closed to a visitor
const closed = [];
for (const p of ["/admin", "/admin/samples", "/admin/privacy", "/trade/account", "/trade/account/quotes"]) {
  const r = await get(p);
  const gated = [301, 302, 303, 307, 308, 401, 403, 404].includes(r.status) || /\/trade\/login|couldn.t find/i.test(r.text);
  // The page title may name the screen; what must never arrive is its content.
  if (!gated || /Download all as CSV|Mark sent|Your price, ex VAT|Erase their data/.test(r.text)) closed.push(`${p} ${r.status}`);
}
check("admin and trade screens are closed to a visitor", closed.length === 0, closed.join(", "));
for (const p of ["/admin/samples/export", "/admin/privacy/export?email=a@b.co", "/trade/account/settings/export"]) {
  const r = await get(p);
  check(`${p.split("?")[0]} is refused`, [401, 403, 404, 307, 308].includes(r.status), String(r.status));
}
const cron = await get("/api/cron/retention");
check("the retention job refuses without its secret", [401, 409, 503].includes(cron.status), String(cron.status));

// Security headers and no leaks
const home = await get("/");
const h = home.headers;
check("security headers are set", /nosniff/i.test(h.get("x-content-type-options") ?? "") && /DENY|SAMEORIGIN/i.test(h.get("x-frame-options") ?? "") && Boolean(h.get("referrer-policy")), [...["x-content-type-options", "x-frame-options", "referrer-policy"]].map((k) => `${k}=${h.get(k) ?? "missing"}`).join(" "));
check("the framework is not announced", !h.get("x-powered-by"));
const leaks = [];
for (const p of ["/.env", "/.env.local", "/.git/config", "/package.json"]) { const r = await get(p); if (r.status === 200 && /SERVICE_ROLE|RESEND_API|"dependencies"|\[core\]/.test(r.text)) leaks.push(p); }
check("secrets and source files can't be fetched", leaks.length === 0, leaks.join(", "));
const robots = await get("/robots.txt");
check("robots.txt keeps admin and account pages out of search", /Disallow: \/admin/.test(robots.text) && /Disallow: \/trade\/account/.test(robots.text));

console.log(`\n${results.filter(Boolean).length}/${results.length} passed against ${BASE}`);
process.exit(results.every(Boolean) ? 0 : 1);

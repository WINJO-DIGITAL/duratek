import { createClient } from "@supabase/supabase-js";
import { createHmac } from "node:crypto";

import { execSync } from "node:child_process";
import { chromium } from "./browser.mjs";
const URL_ = "http://127.0.0.1:54321", ANON = process.env.ANON, SRK = process.env.SRK, BASE = "http://localhost:3000";
const JWT_SECRET = "super-secret-jwt-token-with-at-least-32-characters-long"; // local development stack only
const sql = (q) => execSync(`psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -tAc "${q.replace(/"/g, '\\"')}"`).toString().trim();
const results = []; const check = (n, ok, d = "") => { results.push(ok); console.log(`${ok ? "PASS" : "FAIL"}  ${n}${d ? "  — " + d : ""}`); };
const denied = (r) => Boolean(r.error) || (Array.isArray(r.data) && r.data.length === 0) || r.data === null;
const client = () => createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
const as = async (email, password = "Correct-Horse-42") => { const c = client(); const { error } = await c.auth.signInWithPassword({ email, password }); if (error) throw new Error(email + ": " + error.message); return c; };
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = (claims) => { const h = b64({ alg: "HS256", typ: "JWT" }), p = b64(claims); return `${h}.${p}.${createHmac("sha256", JWT_SECRET).update(`${h}.${p}`).digest("base64url")}`; };
const rest = (path, token) => fetch(`${URL_}/rest/v1/${path}`, { headers: { apikey: ANON, authorization: `Bearer ${token}` } });

const kv = sql("select id from product_variants where sku='DT-KESWICK-OAK'");
const fitterId = sql("select id from auth.users where email='fitter@e2e.local'");
const otherId = sql("select id from auth.users where email='other@e2e.local'");
// Fixtures: other@ has negotiated prices; a suspended account exists.
sql(`insert into price_lists (code,name,kind,profile_id,prices_include_vat) values ('account-sec','Other','account','${otherId}',false) on conflict do nothing`);
sql(`insert into price_list_items (price_list_id,variant_id,amount_pence,price_unit) select id,'${kv}',1777,'m2' from price_lists where code='account-sec' on conflict do nothing`);
const admin = createClient(URL_, SRK, { auth: { persistSession: false } });
const { data: sus } = await admin.auth.admin.createUser({ email: "suspended@e2e.local", password: "Correct-Horse-42", email_confirm: true, user_metadata: { company_name: "Suspended Ltd" } });
sql(`update profiles set status='suspended', tier_id=(select id from price_tiers where name like 'Demo tier A%') where id='${sus.user.id}'`);

console.log("-- Unauthenticated API access");
const anon = client();
for (const t of ["quotes", "quote_lines", "price_lists", "price_list_items", "prices", "price_overrides", "audit_log", "businesses", "trade_applications", "admin_permissions", "projects", "saved_products", "sample_requests", "profiles", "trade_preferences"]) {
  const r = await anon.from(t).select("*").limit(1);
  check(`anon cannot read ${t}`, denied(r), r.error?.code ?? `${r.data?.length} rows`);
}
let r = await anon.rpc("price_for", { p_variant: kv });
check("anon price is the RRP only", r.data?.[0]?.source === "rrp" && r.data.length === 1);
r = await anon.rpc("catalogue_prices");
check("anon catalogue holds no trade source", (r.data ?? []).every((x) => x.source === "rrp" || (x.source === "promotion")));
for (const fn of ["_resolve_price", "backfill_foundation", "refresh_legacy_prices", "admin_dashboard_stats", "price_for_account"]) {
  const res = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: ANON, "content-type": "application/json" }, body: JSON.stringify(fn === "_resolve_price" ? { p_uid: fitterId, p_variant: kv, p_quantity: 1, p_at: new Date().toISOString() } : fn === "refresh_legacy_prices" ? { p_finish: kv } : fn === "price_for_account" ? { p_profile: fitterId, p_variant: kv } : {}) });
  check(`anon cannot call ${fn}()`, res.status >= 400, String(res.status));
}

console.log("-- Attempts to retrieve private trade pricing");
const fitter = await as("fitter@e2e.local");
r = await fitter.rpc("price_for", { p_variant: kv });
check("fitter gets their own tier price", r.data?.[0]?.source === "trade" && r.data[0].amount_pence === 2222, JSON.stringify(r.data?.[0]?.amount_pence));
r = await fitter.rpc("price_for_account", { p_profile: otherId, p_variant: kv });
check("fitter cannot ask what another account pays", Boolean(r.error), r.error?.code);
r = await fitter.from("price_overrides").select("*");
check("fitter cannot read another account's negotiated prices", (r.data ?? []).every((x) => x.profile_id === fitterId));
r = await fitter.from("price_list_items").select("amount_pence");
check("fitter cannot read raw price lists", denied(r));
r = await fitter.from("prices").select("tier_id");
check("fitter sees only their own tier's legacy prices", new Set((r.data ?? []).map((x) => x.tier_id)).size <= 1);
r = await fitter.rpc("price_for", { p_variant: kv, p_at: new Date(Date.now() + 400 * 864e5).toISOString() });
check("fitter cannot look ahead to unannounced prices", r.data?.[0]?.amount_pence === 2222);

console.log("-- Privilege escalation");
r = await fitter.from("profiles").update({ role: "super_admin" }).eq("id", fitterId).select();
check("fitter cannot make themselves super admin", Boolean(r.error), r.error?.message);
r = await fitter.from("profiles").update({ is_admin: true }).eq("id", fitterId).select();
check("fitter cannot set the legacy admin flag", Boolean(r.error) || sql(`select is_admin from profiles where id='${fitterId}'`) === "f", r.error?.message);
r = await fitter.from("profiles").update({ tier_id: null }).eq("id", fitterId).select();
check("fitter cannot change their tier", Boolean(r.error));
r = await fitter.from("admin_permissions").insert({ profile_id: fitterId, permission: "manage_pricing" });
check("fitter cannot grant themselves permissions", Boolean(r.error));
r = await fitter.from("price_list_items").insert({ price_list_id: sql("select id from price_lists where kind='rrp'"), variant_id: kv, amount_pence: 1, price_unit: "m2", min_quantity: 2 });
check("fitter cannot write prices", Boolean(r.error));
r = await fitter.from("system_settings").update({ value: 0 }).eq("key", "default_vat_rate_bp").select();
check("fitter cannot change the VAT rate", denied(r) && sql("select value from system_settings where key='default_vat_rate_bp'") === "2000");
r = await fitter.from("audit_log").insert({ action: "x", table_name: "x" });
check("fitter cannot write the audit log", Boolean(r.error));
r = await fitter.from("finishes").update({ published: false }).eq("slug", "keswick-oak").select();
check("fitter cannot change products", denied(r));
const forged = jwt({ sub: fitterId, role: "service_role", aud: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 });
let res = await rest("sample_requests?select=email", "x" + forged.slice(1));
check("a tampered token is rejected", res.status === 401, String(res.status));
const wrongKey = (() => { const h = b64({ alg: "HS256", typ: "JWT" }), p = b64({ sub: fitterId, role: "service_role", exp: Math.floor(Date.now() / 1000) + 3600 }); return `${h}.${p}.${createHmac("sha256", "guess").update(`${h}.${p}`).digest("base64url")}`; })();
res = await rest("sample_requests?select=email", wrongKey);
check("a token signed with the wrong key is rejected", res.status === 401, String(res.status));

console.log("-- Cross-account access");
const other = await as("other@e2e.local");
const q = await fitter.from("quotes").insert({ customer_name: "Private" }).select("id, share_token").single();
const pr = await fitter.from("projects").insert({ name: "Private project" }).select("id").single();
await fitter.from("saved_products").insert({ finish_id: sql("select id from finishes where slug='keswick-oak'") });
check("fitter creates a quote, a project and a saved product", !q.error && !pr.error);
check("other trader cannot read the quote", denied(await other.from("quotes").select("*").eq("id", q.data.id)));
check("other trader cannot read its lines or costs", denied(await other.from("quote_lines").select("unit_cost_pence").eq("quote_id", q.data.id)));
check("other trader cannot read the project", denied(await other.from("projects").select("*").eq("id", pr.data.id)));
check("other trader cannot read saved products", (await other.from("saved_products").select("*")).data?.length === 0);
r = await other.from("quotes").insert({ customer_name: "Hijack", project_id: pr.data.id });
check("other trader cannot attach to the project", Boolean(r.error), r.error?.code);
r = await other.from("quotes").delete().eq("id", q.data.id).select();
check("other trader cannot delete the quote", denied(r) && sql(`select count(*) from quotes where id='${q.data.id}'`) === "1");
r = await other.rpc("price_for", { p_variant: kv });
check("other trader gets their own negotiated price, not the fitter's", r.data?.[0]?.source === "account" && r.data[0].amount_pence === 1777);
r = await anon.rpc("get_shared_quote", { p_token: q.data.share_token });
check("a draft quote cannot be opened by its link", r.data === null);

console.log("-- Direct database access");
res = await fetch(`${URL_}/rest/v1/audit_log?id=gt.0`, { method: "DELETE", headers: { apikey: SRK, authorization: `Bearer ${SRK}` } });
check("even the service role cannot delete audit records", res.status >= 400 && Number(sql("select count(*) from audit_log")) > 0, String(res.status));
let dbErr = "";
try { sql("update audit_log set action='forged'"); } catch (e) { dbErr = String(e.stderr ?? e); }
check("even the database owner cannot edit audit records", /cannot be changed/.test(dbErr));

console.log("-- Invalid input (database constraints, beneath the app's validation)");
const owner = await as("owner@e2e.local");
r = await owner.from("businesses").insert({ name: "X", vat_number: "FR12345" });
check("a non-UK VAT number is refused", r.error?.code === "23514", r.error?.code);
r = await owner.from("businesses").insert({ name: "X", company_number: "123" });
check("a malformed company number is refused", r.error?.code === "23514", r.error?.code);
r = await owner.from("price_list_items").insert({ price_list_id: sql("select id from price_lists where kind='rrp'"), variant_id: kv, amount_pence: -5, price_unit: "m2", min_quantity: 3 });
check("a negative price is refused", r.error?.code === "23514", r.error?.code);
r = await owner.from("price_lists").insert({ code: "bad", name: "Bad", kind: "trade", prices_include_vat: false, currency: "EUR" });
check("a currency other than GBP is refused", r.error?.code === "23514", r.error?.code);
r = await owner.from("price_lists").insert({ code: "bad-dates", name: "Bad", kind: "promotion", audience: "public", prices_include_vat: true, valid_from: "2027-02-01T00:00:00Z", valid_to: "2027-01-01T00:00:00Z" });
check("a promotion ending before it starts is refused", r.error?.code === "23514", r.error?.code);
r = await owner.from("product_variants").insert({ finish_id: sql("select id from finishes where slug='keswick-oak'"), sku: "lower case", name: "x", unit_of_sale: "item" });
check("a malformed stock code is refused", r.error?.code === "23514", r.error?.code);
r = await anon.rpc("respond_to_quote", { p_token: "' or 1=1 --aaaaaaaaaaaaaaaaaa", p_decision: "accepted" });
check("an injection-shaped token changes nothing", r.data === null);

console.log("-- Session expiry");
const valid = jwt({ sub: fitterId, role: "authenticated", aud: "authenticated", exp: Math.floor(Date.now() / 1000) + 600 });
const expired = jwt({ sub: fitterId, role: "authenticated", aud: "authenticated", exp: Math.floor(Date.now() / 1000) - 60 });
res = await rest("prices?select=price_per_m2_pence", valid);
const validOk = res.status === 200 && (await res.json()).length > 0;
check("a current session token for the fitter reads their prices (control)", validOk, String(res.status));
res = await rest("prices?select=price_per_m2_pence", expired);
check("the same token, expired, is rejected", res.status === 401, String(res.status));
const b = await chromium.launch(); const ctx = await b.newContext();
await ctx.addCookies([{ name: "sb-127-auth-token", value: "base64-" + Buffer.from(JSON.stringify({ access_token: expired, refresh_token: "nope", expires_at: 1, token_type: "bearer", user: { id: fitterId } })).toString("base64url"), url: BASE }]);
const pg = await ctx.newPage(); const resp = await pg.goto(`${BASE}/trade/account`);
await pg.waitForURL(/\/trade\/login/, { timeout: 10000, waitUntil: "commit" }).catch(() => {});
check("the site treats an expired session (bad refresh) as signed out, no error", resp.status() < 500 && pg.url().includes("/trade/login"), pg.url());
await b.close();

console.log("-- Account suspension");
const susp = await as("suspended@e2e.local");
r = await susp.rpc("price_for", { p_variant: kv });
check("suspended account gets only the RRP", r.data?.[0]?.source === "rrp");
check("suspended account reads no trade prices", (await susp.from("prices").select("*")).data?.length === 0);
check("suspended account cannot create quotes", Boolean((await susp.from("quotes").insert({ customer_name: "X" })).error));
check("suspended account cannot read trade documents", (await susp.from("documents").select("*").eq("trade_only", true)).data?.length === 0);
r = await susp.from("profiles").update({ status: "approved" }).eq("id", sus.user.id).select();
check("suspended account cannot reinstate itself", Boolean(r.error));

console.log("-- Prices from the browser are never trusted");
const bb = await chromium.launch(); const c2 = await bb.newContext(); await c2.route(/cdn\.shopify\.com/, (x) => x.abort());
const fp = await c2.newPage();
await fp.goto(`${BASE}/trade/login?next=/trade/account/quotes/${q.data.id}`);
await fp.fill("#field-email", "fitter@e2e.local"); await fp.fill("#field-password", "Correct-Horse-42");
await fp.click("main button[type=submit]"); await fp.locator("#field-finish_id").waitFor({ timeout: 15000 });
await fp.selectOption("#field-finish_id", { label: "Keswick Oak · 2.21 m² per pack" }); await fp.fill("#field-area_m2", "10");
await fp.evaluate(() => {
  const f = document.querySelector("#field-area_m2").form;
  for (const [n, v] of [["unit_cost_pence", "1"], ["unit_cost", "0.01"], ["cost", "0.01"], ["amount_pence", "1"], ["price_per_m2", "0.01"]]) {
    const i = document.createElement("input"); i.type = "hidden"; i.name = n; i.value = v; f.appendChild(i);
  }
});
await fp.click("main button:has-text('Add flooring')"); await fp.getByText(/Added 5 packs/).waitFor({ timeout: 10000 });
check("forged cost fields are ignored: cost is the server price (49.11 a pack)", sql(`select unit_cost_pence from quote_lines where quote_id='${q.data.id}'`) === "4911");
await bb.close();

console.log(`\n${results.filter(Boolean).length}/${results.length} passed`); process.exit(results.every(Boolean) ? 0 : 1);

import { chromium } from "./browser.mjs";
import { execSync } from "node:child_process";
const BASE = "http://localhost:3000", MAIL = "http://127.0.0.1:54324", S = (process.env.OUT ?? (await import("node:os")).tmpdir());
const sql = (q) => execSync(`psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -tAc "${q.replace(/"/g, '\\"')}"`).toString().trim();
const results = []; const check = (n, ok, d = "") => { results.push(ok); console.log(`${ok ? "PASS" : "FAIL"}  ${n}${d ? "  — " + d : ""}`); };
const text = async (p) => (await p.locator("main").innerText()).replace(/\s+/g, " ");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function mailTo(addr, subjectRe, after = 0) {
  for (let i = 0; i < 20; i++) {
    const list = await (await fetch(`${MAIL}/api/v1/messages?limit=50`)).json();
    const m = list.messages.filter((x) => x.To.some((t) => t.Address === addr) && subjectRe.test(x.Subject) && Date.parse(x.Created) > after);
    if (m.length) {
      const full = await (await fetch(`${MAIL}/api/v1/message/${m[0].ID}`)).json();
      return { count: m.length, html: full.HTML, subject: m[0].Subject };
    }
    await sleep(500);
  }
  return null;
}
const linkIn = (html) => (html.match(/href="([^"]*\/auth\/confirm[^"]*)"/)?.[1] ?? "").replace(/&amp;/g, "&");
const browser = await chromium.launch();
const mk = async (w = 1440) => { const c = await browser.newContext({ viewport: { width: w, height: 1000 } }); await c.route(/cdn\.shopify\.com/, (r) => r.abort()); return c; };
async function login(ctx, email, password = "Correct-Horse-42", next = "/trade/account") {
  const p = await ctx.newPage();
  await p.goto(`${BASE}/trade/login?next=${encodeURIComponent(next)}`);
  await p.fill("#field-email", email); await p.fill("#field-password", password);
  await p.click("main button[type=submit]");
  await p.waitForURL((u) => !u.pathname.startsWith("/trade/login"), { timeout: 8000, waitUntil: "commit" }).catch(() => {});
  return p;
}
const t0 = Date.now();

// ---------------------------------------------------------------- registration
const a = await mk(390); const ap = await a.newPage();
await ap.goto(`${BASE}/trade/apply`); await ap.locator("#trade-company_name").waitFor();
await ap.check("input[name=trade_type][value=fitter]", { force: true });
for (const [k, v] of Object.entries({ company_name: "Fell Floors Ltd", contact_name: "Fran Fell", email: "apply@e2e.local", phone: "01539 111222", address_line1: "2 Market Place", town: "Kendal", postcode: "la9 4tn", company_number: "sc123456", vat_number: "123456789", website: "fellfloors.example.co.uk", password: "Original-Pass-1" })) await ap.fill(`#trade-${k}`, v);
await ap.fill("#trade-additional_info", "Fitting across Cumbria for 12 years");
await ap.click("main button[type=submit]");
await ap.getByText(/Thank you, Fran/).waitFor({ timeout: 15000 });
check("registration with business details is accepted", true);
const row = sql("select p.status||'|'||p.role||'|'||b.postcode||'|'||b.company_number||'|'||b.vat_number||'|'||b.website||'|'||ta.additional_info from profiles p join businesses b on b.id=p.business_id join trade_applications ta on ta.profile_id=p.id join auth.users u on u.id=p.id where u.email='apply@e2e.local'");
check("account is pending with a normalised business record", row === "pending|trade|LA9 4TN|SC123456|GB123456789|https://fellfloors.example.co.uk|Fitting across Cumbria for 12 years", row);
const confirm = await mailTo("apply@e2e.local", /Confirm your email/, t0 - 5000);
check("a confirmation email is sent", Boolean(confirm), confirm?.subject);
const confirmLink = linkIn(confirm?.html ?? "");
check("its link goes to our confirm route with a token hash", /\/auth\/confirm\?token_hash=.+&type=signup/.test(confirmLink), confirmLink.slice(0, 80));

// Login before confirming
let p = await login(await mk(), "apply@e2e.local", "Original-Pass-1");
check("login before confirming is held, with a clear message", (await text(p)).includes("Please confirm your email address first"));
const before = Date.now();
await p.getByRole("button", { name: "Send the link again" }).click();
await p.getByText("We’ve sent the link again").waitFor({ timeout: 10000 });
const again = await mailTo("apply@e2e.local", /Confirm your email/, before - 1000);
check("the confirmation can be sent again", Boolean(again));
// A new link replaces the old one (Auth issues a fresh token), so the first link no longer works.
const latestLink = linkIn(again?.html ?? "");
const stale = await (await mk()).newPage();
await stale.goto(confirmLink.replace("http://127.0.0.1:3000", BASE)); await stale.waitForLoadState("networkidle");
check("the earlier link stops working once a new one is sent", stale.url().includes("notice=link"), stale.url());

// Confirm (in a different browser from the one that applied: token-hash links work anywhere)
const cctx = await mk(); const cp = await cctx.newPage();
await cp.goto(latestLink.replace("http://127.0.0.1:3000", BASE)); await cp.waitForLoadState("networkidle");
check("the link confirms and signs in, in any browser", new URL(cp.url()).pathname === "/trade/account" && (await text(cp)).includes("Your email address is confirmed"), cp.url());
check("then the account waits for approval", (await text(cp)).includes("waiting for approval"));
check("email confirmed in Auth", sql("select email_confirmed_at is not null from auth.users where email='apply@e2e.local'") === "t");
const used = await (await mk()).newPage();
await used.goto(latestLink.replace("http://127.0.0.1:3000", BASE)); await used.waitForLoadState("networkidle");
check("a used link is refused politely (fresh browser, not signed in)", used.url().includes("/trade/login?notice=link") && (await text(used)).includes("expired"), used.url());

// ---------------------------------------------------------------- owner approves; suspension
const o = await mk(); const op = await login(o, "owner@e2e.local", "Correct-Horse-42", "/admin/accounts");
await op.goto(`${BASE}/admin/accounts?filter=pending`); await op.getByText("Fell Floors Ltd").first().waitFor({ timeout: 10000 });
const card = op.locator("li", { hasText: "Fell Floors Ltd" }).first();
check("owner sees the business details", (await card.innerText()).includes("GB123456789") && (await card.innerText()).includes("SC123456"));
await card.locator("select[name=tier]").selectOption({ label: "Demo tier A (placeholder prices)" });
await card.getByRole("button", { name: "Approve" }).click();
await op.waitForURL(/notice=approved/, { waitUntil: "commit" });
check("owner approves with a tier", sql("select status from profiles p join auth.users u on u.id=p.id where u.email='apply@e2e.local'") === "approved");

const fctx = await mk(); const fp = await login(fctx, "fitter@e2e.local");
await fp.goto(`${BASE}/trade/account`); await fp.getByText("Your prices").first().waitFor({ timeout: 10000 });
check("fitter sees trade prices before suspension", (await text(fp)).includes("£22.22"));
await op.goto(`${BASE}/admin/accounts?filter=approved`); await op.getByText("Lakeland Floors").first().waitFor({ timeout: 10000 });
const fcard = op.locator("li", { hasText: "Lakeland Floors" }).first();
await fcard.getByRole("button", { name: "Suspend" }).click();
await op.waitForURL(/notice=reason/, { waitUntil: "commit" });
check("suspending needs a reason", true);
await op.getByText("Lakeland Floors").first().waitFor();
await op.goto(`${BASE}/admin/accounts?filter=approved`); await op.getByText("Lakeland Floors").first().waitFor();
const fcard2 = op.locator("li", { hasText: "Lakeland Floors" }).first();
await fcard2.locator("input[name=reason]").fill("Account on hold");
await fcard2.getByRole("button", { name: "Suspend" }).click();
await op.waitForURL(/notice=suspended/, { waitUntil: "commit" });
await fp.goto(`${BASE}/trade/account`); await fp.waitForLoadState("networkidle"); await sleep(500);
check("an already signed-in suspended account loses trade prices at once", (await text(fp)).includes("suspended") && !(await text(fp)).includes("£22.22"));
await fp.goto(`${BASE}/trade/account/quotes`); await fp.waitForURL((u) => u.pathname === "/trade/account", { timeout: 8000, waitUntil: "commit" }).catch(() => {});
check("a suspended account cannot open quotes", new URL(fp.url()).pathname === "/trade/account");
await fp.goto(`${BASE}/range/keswick-oak`); await fp.waitForLoadState("networkidle"); await sleep(800);
check("finish page: suspended, no trade price", (await fp.content()).includes("suspended") && !(await fp.content()).includes("22.22"));
check("the suspension is in the audit log", sql("select count(*) from audit_log a join auth.users u on u.id=a.actor_id where u.email='owner@e2e.local' and a.table_name='profiles' and a.new_data->>'status'='suspended' and a.new_data->>'status_reason'='Account on hold'") === "1");
await op.goto(`${BASE}/admin/accounts?filter=suspended`); await op.getByText("Lakeland Floors").first().waitFor();
await op.locator("li", { hasText: "Lakeland Floors" }).first().getByRole("button", { name: "Reinstate" }).click();
await op.waitForURL(/notice=reinstated/, { waitUntil: "commit" });
await fp.goto(`${BASE}/trade/account`); await fp.getByText("Your prices").first().waitFor({ timeout: 10000 });
check("reinstated: prices are back", (await text(fp)).includes("£22.22"));

// ---------------------------------------------------------------- roles and permissions
await op.goto(`${BASE}/admin/accounts?filter=approved`); await op.getByText("Other Floors").first().waitFor();
const ocard = op.locator("li", { hasText: "Other Floors" }).first();
await ocard.locator("summary", { hasText: "Role and permissions" }).click();
await ocard.locator("select[name=role]").selectOption("admin");
await ocard.locator("input[name=permission][value=manage_pricing]").check();
await ocard.getByRole("button", { name: "Save role" }).click();
await op.waitForURL(/notice=role/, { waitUntil: "commit" });
check("super admin makes an administrator with only pricing", sql("select p.role||':'||string_agg(ap.permission::text, ',') from profiles p join auth.users u on u.id=p.id left join admin_permissions ap on ap.profile_id=p.id where u.email='other@e2e.local' group by p.role") === "admin:manage_pricing");
const pctx = await mk(); const pp = await login(pctx, "other@e2e.local");
await pp.goto(`${BASE}/admin`); await pp.waitForURL(/\/admin\/prices/, { timeout: 8000, waitUntil: "commit" }).catch(() => {});
check("a pricing-only administrator lands on Prices", new URL(pp.url()).pathname === "/admin/prices", pp.url());
await pp.getByRole("heading", { name: "Prices", exact: true }).waitFor({ timeout: 10000 });
const tabs = (await pp.locator("nav[aria-label=Admin]").innerText()).replace(/\s+/g, " ").trim();
check("and sees only the Prices tab", tabs === "Prices", tabs);
for (const path of ["/admin/accounts", "/admin/audit", "/admin/samples", "/admin/settings"]) {
  await pp.goto(BASE + path); await sleep(1200);
  check(`pricing-only administrator gets not-found at ${path}`, /couldn.t find/i.test(await pp.locator("main").innerText()));
}
const csv = await pp.request.get(`${BASE}/admin/samples/export`);
check("and cannot export customers' details", csv.status() === 404);

// ---------------------------------------------------------------- pricing admin
// A public promotion on Keswick Oak, a tier A volume break, and a future price.
await pp.goto(`${BASE}/admin/prices`); await pp.locator("#list-name").waitFor();
await pp.fill("#list-name", "Spring offer"); await pp.selectOption("#list-kind", "promotion"); await pp.selectOption("#list-audience", "public");
await pp.getByRole("button", { name: "Create" }).click(); await pp.waitForURL(/\/admin\/prices\/lists\/.+notice=created/, { waitUntil: "commit" });
await pp.locator("#i-variant").waitFor();
await pp.selectOption("#i-variant", { label: "Keswick Oak · DT-KESWICK-OAK" }); await pp.fill("#i-amount", "29.99");
await pp.getByRole("button", { name: "Add price" }).click(); await pp.waitForURL(/notice=item-added/, { waitUntil: "commit" });
const anon = await mk(); const an = await anon.newPage();
await an.goto(`${BASE}/range/keswick-oak`); await an.waitForLoadState("networkidle"); await sleep(800);
let h = await an.content();
check("public finish page shows the offer and the RRP", h.includes("£29.99") && h.includes("£33.33") && h.includes("Offer"));
await pp.selectOption("#i-variant", { label: "Keswick Oak · DT-KESWICK-OAK" }); await pp.fill("#i-amount", "1.00"); await pp.selectOption("#i-unit", "item");
await pp.getByRole("button", { name: "Add price" }).click(); await pp.waitForURL(/notice=unit-mismatch/, { waitUntil: "commit" });
check("a unit that doesn't fit the product is refused", true);

const tierA = sql("select id from price_lists where tier_id=(select id from price_tiers where name like 'Demo tier A%')");
await pp.goto(`${BASE}/admin/prices/lists/${tierA}`); await pp.locator("#i-variant").waitFor();
await pp.selectOption("#i-variant", { label: "Keswick Oak · DT-KESWICK-OAK" }); await pp.fill("#i-amount", "20.00"); await pp.fill("#i-min", "100");
await pp.getByRole("button", { name: "Add price" }).click(); await pp.waitForURL(/notice=item-added/, { waitUntil: "commit" });
await pp.selectOption("#i-variant", { label: "Keswick Oak · DT-KESWICK-OAK" }); await pp.fill("#i-amount", "25.00");
const nextYear = new Date(Date.now() + 400 * 864e5).toISOString().slice(0, 10);
await pp.fill("#i-from", nextYear);
await pp.getByRole("button", { name: "Add price" }).click(); await pp.waitForURL(/notice=item-added/, { waitUntil: "commit" });
// The URL already says item-added after the first add, so wait for the second row itself.
let vf = "";
for (let i = 0; i < 40; i++) {
  vf = sql(`select count(*) from price_list_items where price_list_id='${tierA}' and (min_quantity=100 or valid_from is not null)`);
  if (vf === "2") break;
  await sleep(250);
}
check("volume break and future price saved", vf === "2", `${vf} rows; last page ${pp.url()}`);

// Base grid: change tier A Keswick to 22.50 and see it in the legacy copy and for the fitter.
await pp.goto(`${BASE}/admin/prices`); await pp.locator("form input[name^='base:']").first().waitFor();
const kv = sql("select id from product_variants where sku='DT-KESWICK-OAK'");
await pp.fill(`input[name="base:${tierA}:${kv}"]`, "22.50");
await pp.getByRole("button", { name: "Save prices" }).click(); await pp.getByText(/Saved 1 change/).waitFor({ timeout: 10000 });
check("base price saved through the grid", sql(`select amount_pence from price_list_items where price_list_id='${tierA}' and variant_id='${kv}' and min_quantity=1 and valid_from is null`) === "2250");
check("legacy copy follows", sql(`select price_per_m2_pence from prices where tier_id=(select id from price_tiers where name like 'Demo tier A%') and finish_id=(select finish_id from product_variants where id='${kv}')`) === "2250");
await fp.goto(`${BASE}/trade/account`); await fp.getByText("Your prices").first().waitFor();
check("fitter sees the new price, not the future one", (await text(fp)).includes("£22.50") && !(await text(fp)).includes("£25.00"));

// A quote over the volume break uses the break price, decided on the server.
await fp.goto(`${BASE}/trade/account/quotes`); await fp.locator("#field-customer_name").waitFor();
await fp.fill("#field-customer_name", "Volume customer");
await Promise.all([fp.waitForURL(/\/trade\/account\/quotes\/[0-9a-f-]{36}/, { waitUntil: "commit" }), fp.click("text=Create quote")]);
await fp.locator("#field-finish_id").waitFor();
await fp.selectOption("#field-finish_id", { label: "Keswick Oak · 2.21 m² per pack" }); await fp.fill("#field-area_m2", "100");
await fp.click("main button:has-text('Add flooring')"); await fp.getByText(/Added 50 packs/).waitFor({ timeout: 10000 });
const cost = sql("select unit_cost_pence from quote_lines where description like 'Keswick Oak, 50 packs%'");
check("50 packs (110.5 m²) are costed at the 20.00 volume price: 44.20 per pack", cost === "4420", cost);
await fp.fill("#field-area_m2", "10"); await fp.selectOption("#field-finish_id", { label: "Keswick Oak · 2.21 m² per pack" });
await fp.click("main button:has-text('Add flooring')"); await fp.getByText(/Added 5 packs/).waitFor({ timeout: 10000 });
check("5 packs are costed at the base 22.50: 49.73 per pack", sql("select unit_cost_pence from quote_lines where description like 'Keswick Oak, 5 packs%'") === "4973");

// Audit: the pricing admin's changes, with who.
check("price changes are in the audit log with the administrator's id",
  Number(sql("select count(*) from audit_log a join auth.users u on u.id=a.actor_id where u.email='other@e2e.local' and a.table_name in ('price_lists','price_list_items')")) >= 4);
await op.goto(`${BASE}/admin/audit?area=pricing`); await op.getByRole("heading", { name: "Audit log" }).waitFor();
check("owner reads it, with names", (await text(op)).includes("other@e2e.local") && (await text(op)).includes("Price"));

// ---------------------------------------------------------------- password reset and sessions
const otherSession = await mk(); const os = await login(otherSession, "apply@e2e.local", "Original-Pass-1");
await os.goto(`${BASE}/trade/account`); await os.getByText("Your prices").first().waitFor({ timeout: 10000 });
check("a second device is signed in", true);
const rp = await (await mk()).newPage();
await rp.goto(`${BASE}/trade/forgot-password`); await rp.fill("#field-email", "nobody-here@e2e.local"); await rp.click("main button[type=submit]");
const unknownMsg = await rp.getByRole("status").innerText();
await rp.goto(`${BASE}/trade/forgot-password`); await rp.fill("#field-email", "apply@e2e.local");
const sentAt = Date.now(); await rp.click("main button[type=submit]");
const knownMsg = await rp.getByRole("status").innerText();
check("forgot password gives the same answer for unknown and known addresses", unknownMsg === knownMsg && knownMsg.includes("If there's a Duratek trade account"));
const reset = await mailTo("apply@e2e.local", /Reset your Duratek password/, sentAt - 2000);
const resetLink = linkIn(reset?.html ?? "");
check("a reset email with a token-hash link is sent", /type=recovery/.test(resetLink));
check("no email is sent for an unknown address", !(await mailTo("nobody-here@e2e.local", /.*/, 0)));
await rp.goto(resetLink.replace("http://127.0.0.1:3000", BASE)); await rp.locator("#field-password").waitFor({ timeout: 10000 });
await rp.fill("#field-password", "New-Pass-2026"); await rp.fill("#field-confirm", "Different-2026"); await rp.click("main button[type=submit]");
await rp.getByText("The two passwords don't match.").first().waitFor({ timeout: 10000 });
check("mismatched new passwords are refused", true);
await rp.fill("#field-password", "short"); await rp.fill("#field-confirm", "short"); await rp.click("main button[type=submit]");
await rp.getByText("Use at least 10 characters.").first().waitFor({ timeout: 10000 });
check("a short password is refused", true);
await rp.fill("#field-password", "New-Pass-2026"); await rp.fill("#field-confirm", "New-Pass-2026"); await rp.click("main button[type=submit]");
await rp.waitForURL(/notice=password/, { timeout: 10000, waitUntil: "commit" });
check("password changed", true);
check("a 'password changed' notice email is sent", Boolean(await mailTo("apply@e2e.local", /password has been changed/, sentAt - 2000)));
await os.goto(`${BASE}/trade/account`); await os.waitForURL(/\/trade\/login/, { timeout: 10000, waitUntil: "commit" }).catch(() => {});
check("the other device is signed out", os.url().includes("/trade/login"), os.url());
const oldTry = await login(await mk(), "apply@e2e.local", "Original-Pass-1");
check("the old password no longer works", oldTry.url().includes("/trade/login"));
const newTry = await login(await mk(), "apply@e2e.local", "New-Pass-2026");
check("the new password works", !newTry.url().includes("/trade/login"), newTry.url());
await rp.goto(resetLink.replace("http://127.0.0.1:3000", BASE)); await rp.waitForLoadState("networkidle");
check("a used reset link is refused", rp.url().includes("notice=link") || !(await rp.locator("#field-password").count()));

// Sign out everywhere
const d1 = await mk(); const p1 = await login(d1, "apply@e2e.local", "New-Pass-2026");
const d2 = await mk(); const p2 = await login(d2, "apply@e2e.local", "New-Pass-2026");
await p1.goto(`${BASE}/trade/account`); await p1.getByRole("button", { name: "Log out everywhere" }).click();
await p1.waitForURL(/notice=signedout/, { waitUntil: "commit" });
await p2.goto(`${BASE}/trade/account`); await p2.waitForURL(/\/trade\/login/, { timeout: 10000, waitUntil: "commit" }).catch(() => {});
check("log out everywhere signs out the other device", p2.url().includes("/trade/login"), p2.url());

// Session tampering
const t = await mk(); const tp = await t.newPage();
await t.addCookies([{ name: "sb-127-auth-token", value: "base64-eyJhY2Nlc3NfdG9rZW4iOiJub3BlIn0", url: BASE }]);
const tr = await tp.goto(`${BASE}/trade/account`); await tp.waitForURL(/\/trade\/login/, { timeout: 10000, waitUntil: "commit" }).catch(() => {});
check("a forged session cookie is treated as signed out (no error)", tr.status() < 500 && tp.url().includes("/trade/login"), `${tr.status()} ${tp.url()}`);

await browser.close();
console.log(`\n${results.filter(Boolean).length}/${results.length} passed`); process.exit(results.every(Boolean) ? 0 : 1);

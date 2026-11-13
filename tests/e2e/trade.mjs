import { chromium } from "./browser.mjs";
const BASE = "http://localhost:3000";
const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok, detail }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); };

async function login(page, email, next = "/trade/account") {
  await page.goto(`${BASE}/trade/login?next=${encodeURIComponent(next)}`);
  await page.fill("#field-email", email);
  await page.fill("#field-password", "Correct-Horse-42");
  await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/trade/login"), { timeout: 15000 }), page.click("main button[type=submit]")]);
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
// Demo photography is on cdn.shopify.com, which this sandbox cannot reach: skip it.
await ctx.route(/cdn\.shopify\.com|_next\/image/, (r) => r.abort());

// Logged out: trade pages redirect to login.
await page.goto(`${BASE}/trade/account/quotes`);
await page.waitForURL(/\/trade\/login/, { timeout: 10000 }).catch(() => {});
check("logged-out visitor is sent to login from quotes", page.url().includes("/trade/login"));
check("logged-out visitor is never sent quote content", !(await page.content()).includes("Your quotes"));

// Pending account: no quotes.
await login(page, "pending@e2e.local", "/trade/account/quotes");
await page.waitForURL((u) => u.pathname === "/trade/account", { timeout: 10000 }).catch(() => {});
check("pending applicant is sent back to the account page", new URL(page.url()).pathname === "/trade/account", page.url());
check("pending applicant sees the waiting message", await page.getByText(/waiting for approval/).waitFor({ timeout: 10000 }).then(() => true, () => false));
await page.goto(`${BASE}/trade/account/calculator`);
await page.waitForURL((u) => u.pathname === "/trade/account", { timeout: 10000 }).catch(() => {});
check("pending applicant cannot open the calculator", new URL(page.url()).pathname === "/trade/account");
await ctx.clearCookies();

// Approved fitter.
await login(page, "fitter@e2e.local");
await page.goto(`${BASE}/trade/account/catalogue`);
await page.getByText("Your price, ex VAT").first().waitFor({ timeout: 10000 });
let html = await page.content();
check("approved fitter sees their prices", html.includes("Your price, ex VAT") && html.includes("£22.22"));

// Settings
await page.goto(`${BASE}/trade/account/settings`);
await page.locator("#field-default_markup").waitFor({ timeout: 10000 });
await page.fill("#field-default_markup", "40");
await page.fill("#field-default_wastage", "10");
await page.fill("#quote_footer", "Payment within 14 days. Thank you.");
await page.click("text=Save settings");
await page.getByText("Saved.", { exact: true }).waitFor({ timeout: 10000 });
check("settings save", true);
await page.reload();
await page.locator("#field-default_markup").waitFor({ timeout: 10000 });
check("settings persist", (await page.inputValue("#field-default_markup")) === "40");

// Create quote: validation first
await page.goto(`${BASE}/trade/account/quotes`);
await page.locator("#field-customer_name").waitFor({ timeout: 10000 });
await page.fill("#field-customer_name", "Mrs Smith");
await page.fill("#field-customer_email", "not-an-email");
await page.evaluate(() => document.querySelectorAll("form").forEach((f) => (f.noValidate = true)));
await page.click("text=Create quote");
await page.getByText("Enter a valid email address.").waitFor({ timeout: 10000 });
check("quote form rejects a bad email on the server", true);
check("regression: typed values survive a validation error", (await page.inputValue("#field-customer_name")) === "Mrs Smith" && (await page.inputValue("#field-customer_email")) === "not-an-email");
await page.fill("#field-customer_email", "smith@home.local");
await page.fill("#field-site_postcode", "la94aa");
await Promise.all([page.waitForURL(/\/trade\/account\/quotes\/[0-9a-f-]{36}/, { timeout: 15000, waitUntil: "commit" }), page.click("text=Create quote")]);
await page.getByText("Q-0001").first().waitFor({ timeout: 10000 });
const quoteUrl = page.url();
check("quote created", true, quoteUrl);
html = await page.content();
check("quote gets reference Q-0001", html.includes("Q-0001"));

// Flooring line: 20 m² Keswick Oak at 10% => 10 packs; cost 2.21*22.22=49.11; sell at +40% = 31.11/m2 -> 68.75/pack
await page.selectOption("#field-finish_id", { label: "Keswick Oak · 2.21 m² per pack" });
await page.fill("#field-area_m2", "20");
await page.click("main button:has-text('Add flooring')");
await page.getByText(/Added 10 packs of Keswick Oak/).waitFor({ timeout: 10000 }).catch(async () => {
  console.log("DEBUG form:", (await page.locator("#flooring-heading").locator("..").innerText()).replace(/\s+/g, " ").slice(0, 500));
});
html = await page.content();
check("flooring line adds 10 packs for 20 m² + 10%", html.includes("Keswick Oak, 10 packs of 2.21 m² (22.1 m²)"));
check("line priced from the fitter's own trade price (cost £491.10)", html.includes("£491.10"));
check("sell price uses default 40% markup (£68.75 per pack)", html.includes("£68.75"), "");

// Other line
await page.selectOption("#field-kind", "labour");
await page.fill("#field-description", "Fitting");
await page.fill("#field-quantity", "20");
await page.selectOption("#field-unit", "m2");
await page.fill("#field-unit_sell", "12");
await page.click("text=Add line");
await page.getByText("Added Fitting.").waitFor({ timeout: 10000 });
html = await page.content();
// subtotal = 687.50 + 240 = 927.50; VAT 185.50; total 1113.00; cost 491.10; profit 436.40
check("subtotal £927.50", html.includes("£927.50"));
check("VAT £185.50 and total £1,113.00", html.includes("£185.50") && html.includes("£1,113.00"));
check("trader sees profit £436.40", html.includes("£436.40"));

// Bad other line
await page.fill("#field-description", "Door bar");
await page.fill("#field-unit_sell", "abc");
await page.click("text=Add line");
await page.getByText("Enter the price, like 6.99.").waitFor({ timeout: 10000 });
check("other line rejects a bad price", true);

// Customer mode: the quote (cost, profit) is not rendered at all; the catalogue and calculator carry no trade price
await page.getByRole("button", { name: "Customer mode" }).first().click();
const cvOn = await page.getByText("This is hidden in customer mode.").waitFor({ timeout: 10000 }).then(() => true, () => false);
check("Customer mode turns on", cvOn);
html = await page.content();
check("Customer mode on: the quote page shows no cost, profit or customer total", !html.includes("£491.10") && !html.includes("£436.40") && !html.includes("£1,113.00") && !html.includes("Your profit"));
await page.goto(`${BASE}/trade/account/catalogue`);
await page.getByRole("heading", { name: "The Duratek range" }).waitFor({ timeout: 10000 });
html = await page.content();
check("Customer mode on: catalogue hides trade price", !html.includes("£22.22") && !html.includes("2222"));
await page.goto(`${BASE}/trade/account/calculator`);
await page.getByRole("heading", { name: "You need" }).waitFor({ timeout: 10000 });
html = await page.content();
check("Customer mode on: calculator page carries no trade price", !html.includes("2222") && !html.includes("tradePence"));
await page.getByRole("button", { name: "Trade mode" }).first().click();
await page.waitForLoadState("networkidle");

// Share
await page.goto(quoteUrl);
await page.getByText("Mark as sent").waitFor({ timeout: 10000 });
// draft link should not work
await page.click("text=Mark as sent");
await page.waitForURL(/notice=sent/, { waitUntil: "commit" }); await page.locator("input[readonly]").waitFor();
const link = await page.inputValue("input[readonly]");
check("sent quote shows the customer link", /\/q\/[A-Za-z0-9_-]{20,}$/.test(link), link);

// Customer copy in a fresh context (anonymous)
const anon = await browser.newContext({ viewport: { width: 390, height: 844 } });
const cp = await anon.newPage();
await cp.goto(link);
await cp.getByText("Quotation", { exact: true }).waitFor({ timeout: 10000 });
const ch = await cp.content();
check("customer copy opens anonymously", ch.includes("Q-0001") && ch.includes("Mrs Smith"));
check("customer copy shows total £1,113.00", ch.includes("£1,113.00"));
check("customer copy hides cost (£491.10, £49.11) and profit", !ch.includes("491.10") && !ch.includes("49.11") && !ch.includes("436.40") && !/margin/i.test(ch));
check("customer copy hides customer email", !ch.includes("smith@home.local"));
check("customer copy shows the trader's footer", ch.includes("Payment within 14 days"));
check("customer copy is noindex", /<meta name="robots" content="noindex, nofollow"/.test(ch));
await cp.click("text=Accept this quote");
await cp.waitForURL(/notice=thanks/, { waitUntil: "commit" }); await cp.getByText("You accepted this quote.").waitFor({ timeout: 10000 }).catch(() => {});
check("customer can accept", (await cp.content()).includes("You accepted this quote."));
await cp.goto(link.replace(/.$/, (c) => (c === "A" ? "B" : "A")));
check("a wrong token is a 404", (await cp.content()).toLowerCase().includes("not found") || (await cp.title()).toLowerCase().includes("not found"));
await cp.screenshot({ path: (process.env.OUT ?? (await import("node:os")).tmpdir()) + "/customer-quote-390.png", fullPage: true });

await page.goto(quoteUrl);
await page.getByText("Lines").first().waitFor({ timeout: 10000 });
check("trader sees the quote accepted", (await page.content()).includes("Accepted"));
await page.screenshot({ path: (process.env.OUT ?? (await import("node:os")).tmpdir()) + "/quote-1440.png", fullPage: true });

// Another trader cannot open the quote
const other = await browser.newContext();
const op = await other.newPage();
await login(op, "other@e2e.local");
await op.goto(quoteUrl);
await op.waitForTimeout(2500);
check("another trader gets a 404 on someone else's quote", (await op.content()).toLowerCase().includes("not found") && !(await op.content()).includes("Mrs Smith"));

// Shortlist
await page.goto(`${BASE}/trade/account/shortlists`);
await page.locator("#field-name").waitFor({ timeout: 10000 });
await page.fill("#field-name", "Smith kitchen");
const boxes = page.locator("input[name=finish_id]");
await boxes.nth(0).check(); await boxes.nth(3).check();
await page.click("text=Save shortlist");
await page.getByText(/Saved “Smith kitchen”/).waitFor({ timeout: 10000 });
const slink = await page.locator("input[readonly]").first().inputValue();
await cp.goto(slink);
await cp.getByText("Your shortlist", { exact: true }).waitFor({ timeout: 10000 });
const sh = (await cp.locator("main").innerText()).replace(/\s+/g, " ");
check("shared shortlist opens anonymously with 2 finishes", sh.includes("Smith kitchen") && sh.includes("2 Duratek finishes"));
check("shared shortlist shows no prices", !/£\d/.test(sh));

// Calculator
await page.goto(`${BASE}/trade/account/calculator`);
await page.getByRole("heading", { name: "You need" }).waitFor({ timeout: 10000 });
await page.locator("input[inputmode=decimal]").nth(0).fill("5");
await page.locator("input[inputmode=decimal]").nth(1).fill("4");
await page.getByRole("heading", { name: "You need" }).waitFor();
const calc = await page.locator("aside").innerText();
check("calculator: 20 m² +10% = 10 packs", /10\s*packs/.test(calc), calc.replace(/\n/g, " | ").slice(0, 200));
check("calculator: cost matches the quote line to the penny (£491.10)", calc.includes("£491.10"));
await page.screenshot({ path: (process.env.OUT ?? (await import("node:os")).tmpdir()) + "/calculator-1440.png", fullPage: true });

check("no client-side errors", errors.length === 0, errors.join(" / "));
await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);

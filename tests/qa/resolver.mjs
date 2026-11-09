// Differential test of the price resolver: random price configurations, every
// kind of caller, compared with an independent model of the documented rules
// (docs/PRICING.md). Local stack only. Run: node tests/qa/resolver.mjs
import { createClient } from "@supabase/supabase-js";
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PSQL = "psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -v ON_ERROR_STOP=1 -At -F'|'";
const run = (q) => execSync(`${PSQL} -c "${q.replace(/"/g, '\\"')}"`).toString().trim();
const admin = createClient("http://127.0.0.1:54321", process.env.SRK, { auth: { persistSession: false } });

// ------------------------------------------------------------------ fixtures
async function user(email, status, extra = "") {
  let { data: list } = await admin.auth.admin.listUsers({ perPage: 200 });
  let u = list.users.find((x) => x.email === email);
  if (!u) ({ data: { user: u } } = await admin.auth.admin.createUser({ email, password: "Correct-Horse-42", email_confirm: true, user_metadata: { company_name: email } }));
  run(`update profiles set status = '${status}' ${extra} where id = '${u.id}'`);
  return u.id;
}
const tierA = run("select id from price_tiers where name like 'Demo tier A%'");
const tierB = run("select id from price_tiers where name like 'Demo tier B%'");
const U = {
  pending: await user("qa-pending@e2e.local", "pending"),
  rejected: await user("qa-rejected@e2e.local", "rejected"),
  suspended: await user("qa-suspended@e2e.local", "suspended", `, tier_id = '${tierA}'`),
  tierA: await user("qa-tiera@e2e.local", "approved", `, tier_id = '${tierA}'`),
  tierB: await user("qa-tierb@e2e.local", "approved", `, tier_id = '${tierB}'`),
  acct: await user("qa-acct@e2e.local", "approved", `, tier_id = '${tierA}'`),
  stockist: await user("qa-stockist@e2e.local", "approved", `, tier_id = '${tierB}', role = 'stockist'`),
  noTier: await user("qa-notier@e2e.local", "approved"),
};
const V = run("select v.id from product_variants v join finishes f on f.id = v.finish_id where f.slug = 'keswick-oak' and v.is_default");
const COVER_X100 = 221n; // the variant's 2.21 m² pack
const VAT_BP = BigInt(run(`select vat_rate_bp from product_variants where id = '${V}'`));

// Lists. Existing: RRP, standard trade, tier A, tier B.
const L = {
  rrp: run("select id from price_lists where kind = 'rrp'"),
  std: run("select id from price_lists where kind = 'trade' and is_default"),
  A: run(`select id from price_lists where kind = 'trade' and tier_id = '${tierA}'`),
  B: run(`select id from price_lists where kind = 'trade' and tier_id = '${tierB}'`),
};
const mk = (code, kind, cols) => {
  const id = run(`select id from price_lists where code = '${code}'`);
  if (id) return id;
  return run(`insert into price_lists (code, name, kind, ${Object.keys(cols).join(", ")}) values ('${code}', '${code}', '${kind}', ${Object.values(cols).join(", ")}) returning id`).split("\n")[0];
};
L.acct = mk("qa-account", "account", { profile_id: `'${U.acct}'`, prices_include_vat: "false" });
L.stock = mk("qa-stockist", "stockist", { prices_include_vat: "false" });
L.promoPublic = mk("qa-promo-public", "promotion", { audience: "'public'", prices_include_vat: "true" });
L.promoTrade = mk("qa-promo-trade", "promotion", { audience: "'trade'", prices_include_vat: "false" });
L.promoStock = mk("qa-promo-stockist", "promotion", { audience: "'stockist'", prices_include_vat: "false" });
const INCLUDES_VAT = { rrp: true, promoPublic: true };

// ------------------------------------------------------------------ the model
const divRound = (n, d) => (2n * n + d) / (2n * d);
function rng(seed) { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32); }
const pick = (r, xs) => xs[Math.floor(r() * xs.length)];
const MINQ = [1, 5, 20, 50, 100];
const WINDOWS = [
  { sql: ["null", "null"], when: "always" },
  { sql: ["null", "null"], when: "always" },
  { sql: ["null", "null"], when: "always" },
  { sql: ["now() - interval '2 days'", "now() - interval '1 day'"], when: "past" },
  { sql: ["now() + interval '1 day'", "null"], when: "future" },
  { sql: ["now() - interval '1 day'", "now() + interval '1 day'"], when: "now" },
];

function scenario(r) {
  const lists = {};
  for (const key of Object.keys(L)) {
    const active = r() < 0.92;
    const items = [];
    if (r() < 0.62) {
      const n = 1 + Math.floor(r() * 3);
      const mins = [...MINQ].sort(() => r() - 0.5).slice(0, n);
      for (const minq of mins) {
        const w = pick(r, WINDOWS);
        items.push({ minq, amount: r() < 0.7 ? pick(r, [1000, 1200, 2000, 2400, 2778, 3333, 4000, 5000]) : 400 + Math.floor(r() * 8600), from: w.sql[0], to: w.sql[1], when: w.when });
      }
    }
    lists[key] = { active, items };
  }
  return lists;
}
const inForce = (it) => it.when === "always" || it.when === "now";
/** Best item of a list for a quantity (in m², x100): the largest volume break at or below it, in force. */
function bestItem(list, qtyM2x100) {
  if (!list.active) return null;
  const ok = list.items.filter((i) => inForce(i) && BigInt(i.minq) * 100n <= qtyM2x100);
  return ok.sort((a, b) => b.minq - a.minq)[0] ?? null;
}
const netOf = (key, amount) => (INCLUDES_VAT[key] ? divRound(BigInt(amount) * 10000n, 10000n + VAT_BP) : BigInt(amount));
function expected(lists, caller, packs) {
  const qty = BigInt(packs) * COVER_X100;
  const item = (k) => bestItem(lists[k], qty);
  const approved = caller.approved;
  const order = [];
  if (approved && caller.acct) order.push("acct");
  if (approved && caller.role === "stockist") order.push("stock");
  if (approved && caller.tier === "A") order.push("A");
  if (approved && caller.tier === "B") order.push("B");
  if (approved) order.push("std");
  order.push("rrp");
  const baseKey = order.find((k) => item(k));
  const promoKeys = ["promoPublic", ...(approved ? ["promoTrade"] : []), ...(approved && caller.role === "stockist" ? ["promoStock"] : [])];
  const base = baseKey ? { key: baseKey, net: netOf(baseKey, item(baseKey).amount), amount: item(baseKey).amount } : null;
  const promos = promoKeys.filter((k) => item(k)).map((k) => ({ key: k, net: netOf(k, item(k).amount), amount: item(k).amount, promo: true }));
  promos.sort((a, b) => Number(a.net - b.net));
  const best = promos[0];
  const chosen = best && (!base || best.net < base.net) ? best : base;
  if (!chosen) return null;
  const inc = !!INCLUDES_VAT[chosen.key];
  const gross = inc ? BigInt(chosen.amount) : chosen.net + divRound(chosen.net * VAT_BP, 10000n);
  const source = chosen.promo ? "promotion" : { acct: "account", stock: "stockist", A: "trade", B: "trade", std: "trade", rrp: "rrp" }[chosen.key];
  return `${chosen.net}|${gross}|${source}|${chosen.promo ? "t" : "f"}`;
}

// ------------------------------------------------------------------ callers and the real thing
const CALLERS = {
  anon: { approved: false, sql: `set local role anon; set local request.jwt.claims = '{"role":"anon"}';` },
  pending: { approved: false, id: U.pending },
  rejected: { approved: false, id: U.rejected },
  suspended: { approved: false, id: U.suspended },
  tierA: { approved: true, tier: "A", role: "trade", id: U.tierA },
  tierB: { approved: true, tier: "B", role: "trade", id: U.tierB },
  acct: { approved: true, tier: "A", role: "trade", acct: true, id: U.acct },
  stockist: { approved: true, tier: "B", role: "stockist", id: U.stockist },
  noTier: { approved: true, tier: null, role: "trade", id: U.noTier },
};
const asCaller = (c) => c.sql ?? `set local role authenticated; set local request.jwt.claims = '{"sub":"${c.id}","role":"authenticated"}';`;
const PACKS = [1, 3, 10, 23, 46, 100];

function sqlFor(lists) {
  const lines = ["begin;", `delete from price_list_items where variant_id = '${V}';`];
  for (const [key, l] of Object.entries(lists)) {
    lines.push(`update price_lists set active = ${l.active}, valid_from = null, valid_to = null where id = '${L[key]}';`);
    for (const it of l.items) {
      lines.push(`insert into price_list_items (price_list_id, variant_id, amount_pence, price_unit, min_quantity, valid_from, valid_to) values ('${L[key]}', '${V}', ${it.amount}, 'm2', ${it.minq}, ${it.from}, ${it.to});`);
    }
  }
  for (const [name, c] of Object.entries(CALLERS)) {
    for (const p of PACKS) {
      lines.push(asCaller(c));
      lines.push(`select '${name}|${p}|' || coalesce((select net_pence || '|' || gross_pence || '|' || source || '|' || case when is_promotion then 't' else 'f' end from public.price_for('${V}', ${p}) limit 1), 'none');`);
      lines.push("reset role;");
    }
  }
  lines.push("rollback;");
  return lines.join("\n");
}

const SCENARIOS = Number(process.env.SCENARIOS ?? 150);
const r = rng(Number(process.env.SEED ?? 20261109));
let checks = 0, bad = 0;
const file = join(tmpdir(), "resolver-qa.sql");
for (let n = 0; n < SCENARIOS; n++) {
  const lists = scenario(r);
  writeFileSync(file, sqlFor(lists));
  const out = execSync(`${PSQL} -f ${file}`).toString().split("\n").filter((l) => /^[a-zA-Z]+\|\d+\|/.test(l));
  for (const line of out) {
    const [name, packs, ...rest] = line.split("|");
    const got = rest.join("|");
    const want = expected(lists, CALLERS[name], Number(packs)) ?? "none";
    checks++;
    if (got !== want) {
      bad++;
      if (bad <= 6) console.log(`MISMATCH scenario ${n} ${name} ${packs} packs: resolver ${got}, model ${want}\n  config ${JSON.stringify(Object.fromEntries(Object.entries(lists).filter(([, l]) => l.items.length || !l.active)))}`);
    }
  }
  if (out.length !== Object.keys(CALLERS).length * PACKS.length) { console.log(`scenario ${n}: expected ${Object.keys(CALLERS).length * PACKS.length} answers, got ${out.length}`); bad++; }
}
console.log(`${checks - bad}/${checks} resolver answers match the model across ${SCENARIOS} random configurations`);
// Leave the demo prices as they were.
execSync("cd /home/user/duratek && git status --short >/dev/null");
process.exit(bad ? 1 : 0);

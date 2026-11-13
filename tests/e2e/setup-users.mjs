import { createClient } from "@supabase/supabase-js";
const db = createClient("http://127.0.0.1:54321", process.env.SRK, { auth: { persistSession: false } });
const users = [
  ["fitter@e2e.local", { company_name: "Lakeland Floors", contact_name: "Sam Fitter", trade_type: "fitter", phone: "01539 000000" }],
  ["pending@e2e.local", { company_name: "Waiting Ltd", contact_name: "Pat Pending" }],
  ["other@e2e.local", { company_name: "Other Floors", contact_name: "Olly" }],
  ["owner@e2e.local", { company_name: "Duratek", contact_name: "Owner" }],
];
const ids = {};
for (const [email, meta] of users) {
  const { data: list } = await db.auth.admin.listUsers();
  let u = list.users.find((x) => x.email === email);
  if (!u) ({ data: { user: u } } = await db.auth.admin.createUser({ email, password: "Correct-Horse-42", email_confirm: true, user_metadata: meta }));
  ids[email] = u.id;
}
const { data: tiers } = await db.from("price_tiers").select("id, name");
const tierA = tiers.find((t) => t.name.startsWith("Demo tier A")).id;
await db.from("profiles").update({ status: "approved", tier_id: tierA }).in("id", [ids["fitter@e2e.local"], ids["other@e2e.local"]]);
await db.from("profiles").update({ status: "approved", is_admin: true }).eq("id", ids["owner@e2e.local"]);
console.log(JSON.stringify(ids));

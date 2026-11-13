#!/usr/bin/env node
// Creates the first super administrator (the owner) on the live project.
//
// Run once, from your own machine, with the service-role key in the environment.
// The key never goes in the repo or in chat:
//
//   NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=<service-role key> \
//   node scripts/create-owner-admin.mjs owner@example.com [--dry-run]
//
// The owner gets an invitation email from Supabase and sets their own password.
// Then their profile is made a super administrator, approved and not suspended.
import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const email = args.find((a) => !a.startsWith("--"))?.trim().toLowerCase();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("Give the owner's email address: node scripts/create-owner-admin.mjs owner@example.com");
if (!url && !dryRun) fail("Set NEXT_PUBLIC_SUPABASE_URL first.");
if (!key && !dryRun) fail("Set SUPABASE_SERVICE_ROLE_KEY first (or use --dry-run to see the steps).");

if (dryRun) {
  console.log(`Dry run for ${email}. Nothing will be changed. Steps:`);
  console.log("1. Invite the owner by email (Supabase creates the account and sends the link).");
  console.log("2. The profile is created by the sign-up trigger; wait for it.");
  console.log("3. Set the profile to role super_admin, status approved, is_admin true.");
  process.exit(0);
}

const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://duratek.vercel.app";

// 1. Find or invite the account.
let userId;
const { data: existing, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (listError) fail(`Could not check existing accounts: ${listError.message}`);
const found = existing.users.find((u) => u.email?.toLowerCase() === email);
if (found) {
  userId = found.id;
  console.log("Account already exists; promoting it.");
} else {
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: `${siteUrl}/auth/confirm?next=/trade/reset-password` });
  if (error) fail(`Could not invite the owner: ${error.message}`);
  userId = data.user.id;
  console.log("Invitation sent.");
}

// 2. The profile is made by the sign-up trigger; wait briefly for it.
let profile = null;
for (let i = 0; i < 10 && !profile; i++) {
  const { data } = await admin.from("profiles").select("id").eq("id", userId).maybeSingle();
  profile = data;
  if (!profile) await new Promise((r) => setTimeout(r, 500));
}
if (!profile) fail("The profile was not created. Check the sign-up trigger, then run this again.");

// 3. Make the owner a super administrator.
const { error: updateError } = await admin
  .from("profiles")
  .update({ role: "super_admin", status: "approved", is_admin: true })
  .eq("id", userId);
if (updateError) fail(`Could not make the owner a super administrator: ${updateError.message}`);

console.log("Done. The owner can set a password from the invitation email, then sign in and open /admin.");

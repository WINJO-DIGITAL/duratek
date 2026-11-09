#!/usr/bin/env bash
# End-to-end and security suites against the LOCAL stack only.
# Needs: `npx supabase start` (with the mail catcher), .env.local from
# `npx supabase status -o env`, and Playwright with Chromium (see browser.mjs).
# Each suite gets a fresh database, test users, empty inbox and a fresh server
# (in-memory rate limits reset). Never point this at production.
set -uo pipefail
cd "$(dirname "$0")/../.."
grep -q "127.0.0.1:54321" .env.local || { echo "Refusing: .env.local is not the local stack."; exit 1; }
export SRK=$(grep SUPABASE_SERVICE_ROLE_KEY .env.local | cut -d= -f2) ANON=$(grep NEXT_PUBLIC_SUPABASE_ANON_KEY .env.local | cut -d= -f2)
# Online forms open only when email is configured; placeholders let them open. Sends fail quietly.
export CRON_SECRET=e2e-cron-secret-not-real RESEND_API_KEY=re_local_placeholder EMAIL_FROM="Duratek <test@example.com>" OWNER_NOTIFY_EMAIL=owner@example.com

npm run build >/tmp/duratek-e2e-build.log 2>&1 || { echo "build failed: see /tmp/duratek-e2e-build.log"; exit 1; }

server() { fuser -k 3000/tcp >/dev/null 2>&1; nohup npx next start -p 3000 >/tmp/duratek-e2e-server.log 2>&1 & sleep 5; }
fresh() {
  npx supabase db reset --local >/dev/null 2>&1
  curl -s -X DELETE http://127.0.0.1:54324/api/v1/messages >/dev/null
  node tests/e2e/setup-users.mjs >/dev/null
  server
}

status=0
run() {
  echo "== $1"
  node "tests/e2e/$1.mjs" >"/tmp/duratek-e2e-$1.log" 2>&1 || status=1
  grep -E "^FAIL|passed$" "/tmp/duratek-e2e-$1.log" || tail -5 "/tmp/duratek-e2e-$1.log"
}
fresh; run trade; server; run admin   # admin reads the trade suite's quote
fresh; run auth
fresh; run security
fresh; run portal
fresh; run ops
fuser -k 3000/tcp >/dev/null 2>&1
exit $status

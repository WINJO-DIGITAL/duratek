#!/usr/bin/env bash
# Independent QA against the LOCAL stack only: pricing resolver (differential),
# trade price confidentiality, HTTP security battery, functional journeys.
# Each script gets a fresh database, test users and a fresh server. Needs the
# local Supabase stack and Chromium, like tests/e2e/run.sh.
set -uo pipefail
cd "$(dirname "$0")/../.."
grep -q "127.0.0.1:54321" .env.local || { echo "Refusing: .env.local is not the local stack."; exit 1; }
export SRK=$(grep SUPABASE_SERVICE_ROLE_KEY .env.local | cut -d= -f2) ANON=$(grep NEXT_PUBLIC_SUPABASE_ANON_KEY .env.local | cut -d= -f2)
export CRON_SECRET=qa-cron-secret-not-real RESEND_API_KEY=re_local_placeholder EMAIL_FROM="Duratek <test@example.com>" OWNER_NOTIFY_EMAIL=owner@example.com
export LOGIN_RATE_MAX=40 POSTCODES_API_URL=http://127.0.0.1:4010

npm run build >/tmp/duratek-qa-build.log 2>&1 || { echo "build failed: see /tmp/duratek-qa-build.log"; exit 1; }
fuser -k 4010/tcp >/dev/null 2>&1; nohup node tests/qa/postcodes-stub.mjs >/dev/null 2>&1 &
server() { fuser -k 3000/tcp >/dev/null 2>&1; nohup npx next start -p 3000 >/tmp/duratek-qa-server.log 2>&1 & sleep 6; }
fresh() { npx supabase db reset --local >/dev/null 2>&1; node tests/e2e/setup-users.mjs >/dev/null; server; }

status=0
run() { echo "== $1"; node "tests/qa/$1.mjs" >"/tmp/duratek-qa-$1.log" 2>&1 || status=1; grep -E "^FAIL|MISMATCH|passed" "/tmp/duratek-qa-$1.log" || tail -5 "/tmp/duratek-qa-$1.log"; }
fresh; run resolver
fresh; run confidential
fresh; run security
fresh; run journeys
fuser -k 3000/tcp 4010/tcp >/dev/null 2>&1
exit $status

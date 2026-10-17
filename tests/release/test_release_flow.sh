#!/usr/bin/env bash
# End-to-end test of scripts/release.sh against a fake server. A temporary
# folder stands in for the server, and stand-ins for ssh, rsync, gh and npm run
# everything locally. No network access, nothing leaves this machine.
# Run: bash tests/release/test_release_flow.sh
set -uo pipefail

SRC="$(cd "$(dirname "$0")/../.." && pwd)"
T="$(mktemp -d /tmp/release-flow.XXXXXX)"
PASS=0
FAIL=0
SERVER_PID=""
cleanup() { [[ -n "$SERVER_PID" ]] && kill "$SERVER_PID" 2>/dev/null; rm -rf "$T"; }
trap cleanup EXIT

ok() { PASS=$((PASS + 1)); echo "ok   $1"; }
bad() { FAIL=$((FAIL + 1)); echo "FAIL $1"; }

# --- fake server: release folders + a web server for the smoke test ----------------
mkdir -p "$T/server/web" "$T/server/releases" "$T/bin"
PORT="$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1])')"
python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$T/server/web" >/dev/null 2>&1 &
SERVER_PID=$!

# --- stand-ins ---------------------------------------------------------------------
cat >"$T/bin/ssh" <<SH
#!/usr/bin/env bash
# Skip options and the host; run the remote command locally against the fake server.
while [[ \$# -gt 0 && "\$1" != bash ]]; do shift; done
RELEASE_TEST_ROOT="$T/server" exec "\$@"
SH
cat >"$T/bin/rsync" <<'SH'
#!/usr/bin/env bash
# Copy src/ to the local path after "host:" (the fake server shares this disk).
src="${@: -2:1}"; dest="${@: -1}"; dest="${dest##*:}"
cp -a "$src." "$dest"
SH
cat >"$T/bin/gh" <<'SH'
#!/usr/bin/env bash
c="${FAKE_CI:-success}"
printf 'Repo checks\tcompleted\t%s\nBuild and test\tcompleted\tsuccess\nCodeQL analysis\tcompleted\tsuccess\nZAP baseline scan\tcompleted\tsuccess\n' "$c"
SH
cat >"$T/bin/npm" <<'SH'
#!/usr/bin/env bash
# "npm run check" builds a tiny site; FAKE_BROKEN=1 builds one missing its script.
if [[ "$*" == "run check" ]]; then
  rm -rf dist && mkdir -p dist/assets
  printf '<!doctype html><title>Star Destroyer</title><script type="module" src="./assets/index-AbCd1234.js"></script>\n' >dist/index.html
  [[ "${FAKE_BROKEN:-}" == 1 ]] || echo "// game" >dist/assets/index-AbCd1234.js
fi
SH
chmod +x "$T/bin/"*

# --- a throwaway repo whose HEAD is origin/main ---------------------------------------
git init -q --bare "$T/origin.git"
mkdir "$T/repo" && cd "$T/repo" || exit 1
git init -q -b main
mkdir -p scripts deploy
cp "$SRC/scripts/release.sh" "$SRC/scripts/release-remote.sh" "$SRC/scripts/smoke_test.py" scripts/
printf 'dist/\ndeploy/server.env\n' >.gitignore
git add -A && git -c user.name=t -c user.email=t@t commit -q -m init
git remote add origin "$T/origin.git" && git push -q origin main
touch "$T/fake_key"
printf 'SERVER=127.0.0.1:%s\nSSH_USER=deploy\nSSH_KEY=%s\n' "$PORT" "$T/fake_key" >deploy/server.env

release() { PATH="$T/bin:$PATH" bash scripts/release.sh "$@" 2>&1; }
live() { basename "$(readlink "$T/server/web/star-destroyer" 2>/dev/null)" 2>/dev/null; }
count() { find "$T/server/releases/star-destroyer" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l; }

# --- the tests -------------------------------------------------------------------
out="$(FAKE_CI=failure release deploy)"
[[ $? -ne 0 && "$out" == *"has not passed"* && "$(count)" == 0 ]] && ok "refuses to release when CI failed" || bad "CI gate: $out"

echo dirty >untracked.txt
out="$(release deploy)"
[[ $? -ne 0 && "$out" == *"working tree has changes"* ]] && ok "refuses uncommitted changes" || bad "dirty tree: $out"
rm untracked.txt

out="$(release deploy --dry-run)"
[[ $? -eq 0 && "$out" == *"Dry run"* && "$(count)" == 0 ]] && ok "dry run uploads nothing" || bad "dry run: $out"

out="$(release deploy)"; first="$(live)"
[[ $? -eq 0 && -n "$first" && "$out" == *"smoke test: passed"* ]] && ok "first release goes live and passes the smoke test" || bad "first release: $out"

sleep 1 # release ids have one-second resolution
out="$(release deploy)"; second="$(live)"
[[ $? -eq 0 && "$second" != "$first" && "$(count)" == 2 ]] && ok "second release replaces the first" || bad "second release: $out"
a="$T/server/releases/star-destroyer/$first/assets/index-AbCd1234.js"
b="$T/server/releases/star-destroyer/$second/assets/index-AbCd1234.js"
[[ -f "$a" && -f "$b" ]] && ok "both releases keep their files" || bad "release files missing"

sleep 1
out="$(FAKE_BROKEN=1 release deploy)"
[[ $? -ne 0 && "$out" == *"rolling back"* && "$(live)" == "$second" ]] &&
  ok "a broken release fails the smoke test and is rolled back automatically" || bad "broken release: $out (live=$(live))"

out="$(release rollback)"
[[ $? -eq 0 && "$(live)" == "$first" ]] && ok "rollback command returns to the earlier release" || bad "rollback: $out"

out="$(release status)"
[[ "$out" == *"* $first (live)"* ]] && ok "status shows the live release" || bad "status: $out"

for _ in 1 2 3 4 5; do sleep 1; release deploy >/dev/null; done
[[ "$(count)" -eq 5 && -d "$T/server/releases/star-destroyer/$(live)" ]] && ok "old releases are pruned to the newest 5, including the live one" || bad "count is $(count)"

echo
echo "$PASS passed, $FAIL failed"
[[ $FAIL -eq 0 ]]

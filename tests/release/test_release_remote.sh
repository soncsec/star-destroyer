#!/usr/bin/env bash
# Tests for scripts/release-remote.sh, run against a temporary folder that
# stands in for the server (RELEASE_TEST_ROOT). Run: bash tests/release/test_release_remote.sh
set -uo pipefail

SCRIPT="$(cd "$(dirname "$0")/../.." && pwd)/scripts/release-remote.sh"
PASS=0
FAIL=0
T=""

setup() {
  T="$(mktemp -d /tmp/release-test.XXXXXX)"
  mkdir -p "$T/web" "$T/releases"
}
teardown() { rm -rf "$T"; }

run() { RELEASE_TEST_ROOT="$T" bash "$SCRIPT" "$@"; }

ok() { PASS=$((PASS + 1)); echo "ok   $1"; }
bad() { FAIL=$((FAIL + 1)); echo "FAIL $1"; }
expect_ok() { # name, command...
  local name="$1"; shift
  if out="$("$@" 2>&1)"; then ok "$name"; else bad "$name: $out"; fi
}
expect_fail() { # name, pattern, command...
  local name="$1" pattern="$2"; shift 2
  if out="$("$@" 2>&1)"; then bad "$name: expected failure, got: $out"
  elif grep -q -- "$pattern" <<<"$out"; then ok "$name"
  else bad "$name: wrong error: $out"; fi
}

# A release with an index.html, the way release.sh uploads one.
make_release() { # id
  run prepare star-destroyer "$1" >/dev/null && echo "<title>$1</title>" >"$T/releases/star-destroyer/$1/index.html"
}
live() { basename "$(readlink "$T/web/star-destroyer")"; }

A=20261017T100000Z-aaaaaaa1
B=20261017T110000Z-bbbbbbb2
C=20261017T120000Z-ccccccc3
D=20261017T130000Z-ddddddd4

# --- input checks -----------------------------------------------------------
setup
expect_fail "rejects a slug with ../" "invalid slug" run status "../etc"
expect_fail "rejects an uppercase slug" "invalid slug" run status "Star"
expect_fail "rejects an empty slug" "invalid slug" run status ""
expect_fail "rejects a bad release id" "invalid release id" run prepare star-destroyer "latest"
expect_fail "rejects an id with a path" "invalid release id" run prepare star-destroyer "../$A"
expect_fail "rejects an unknown op" "unknown op" run explode star-destroyer
expect_fail "test root must be under /tmp" "under /tmp" env RELEASE_TEST_ROOT=/var/tmp bash "$SCRIPT" status star-destroyer
expect_ok "accepts the portal slug" run status _portal
teardown

# --- first release ----------------------------------------------------------
setup
expect_ok "status with no releases" run status star-destroyer
out="$(run prepare star-destroyer "$A")"
[[ "$out" == *"upload_to=$T/releases/star-destroyer/$A"* && "$out" == *"live_dir="* ]] &&
  ok "prepare returns the upload folder and no live folder" || bad "prepare output: $out"
expect_fail "prepare refuses an existing id" "already exists" run prepare star-destroyer "$A"
expect_fail "activate refuses a release without index.html" "no index.html" run activate star-destroyer "$A"
echo "<title>A</title>" >"$T/releases/star-destroyer/$A/index.html"
expect_ok "activate the first release" run activate star-destroyer "$A"
[[ "$(live)" == "$A" && -f "$T/web/star-destroyer/index.html" ]] && ok "the live link serves release A" || bad "live is $(live)"
expect_fail "activate refuses an unknown id" "no such release" run activate star-destroyer "$B"
expect_fail "rollback with only one release" "no release older" run rollback star-destroyer
teardown

# --- switching and rollback ---------------------------------------------------
setup
make_release "$A" && run activate star-destroyer "$A" >/dev/null
out="$(run prepare star-destroyer "$B")"
[[ "$out" == *"live_dir=$T/releases/star-destroyer/$A"* ]] && ok "prepare reports the live folder for --link-dest" || bad "$out"
echo "<title>B</title>" >"$T/releases/star-destroyer/$B/index.html"
run activate star-destroyer "$B" >/dev/null
[[ "$(live)" == "$B" ]] && ok "switch to release B" || bad "live is $(live)"
expect_ok "rollback" run rollback star-destroyer
[[ "$(live)" == "$A" ]] && ok "rollback returns to release A" || bad "live is $(live)"
run status star-destroyer | grep -q "^\* $A (live)" && ok "status marks the live release" || bad "status: $(run status star-destroyer)"
ls -A "$T/web" | grep -q switch && bad "leftover temporary link" || ok "no temporary links left behind"
teardown

# --- refusals that protect the server ---------------------------------------------
setup
make_release "$A"
mkdir -p "$T/web/star-destroyer" && echo keep >"$T/web/star-destroyer/precious.txt"
expect_fail "refuses to replace a real folder" "not a symlink" run activate star-destroyer "$A"
[[ -f "$T/web/star-destroyer/precious.txt" ]] && ok "the real folder is untouched" || bad "real folder was changed"
rm -rf "$T/web/star-destroyer" && ln -s /etc "$T/web/star-destroyer"
expect_fail "refuses a link pointing outside the releases folder" "points outside" run activate star-destroyer "$A"
teardown

# --- pruning ------------------------------------------------------------------
setup
for id in "$A" "$B" "$C" "$D"; do make_release "$id"; done
run activate star-destroyer "$A" >/dev/null # the oldest is live
expect_ok "prune keeps 2" run prune star-destroyer 2
left="$(ls "$T/releases/star-destroyer" | tr '\n' ' ')"
[[ "$left" == "$A $C $D " ]] && ok "prune kept the 2 newest plus the live one" || bad "left: $left"
expect_fail "prune needs a positive number" "positive number" run prune star-destroyer 0
teardown

# --- atomic switch: the live link never disappears --------------------------------
setup
make_release "$A" && make_release "$B"
run activate star-destroyer "$A" >/dev/null
missing="$T/missing"
( for _ in $(seq 1 4000); do [[ -f "$T/web/star-destroyer/index.html" ]] || echo x >>"$missing"; done ) &
reader=$!
for i in $(seq 1 100); do run activate star-destroyer "$([[ $((i % 2)) == 0 ]] && echo "$A" || echo "$B")" >/dev/null; done
wait "$reader"
[[ ! -s "$missing" ]] && ok "index.html stayed reachable through 100 switches" || bad "missing $(wc -l <"$missing") times"
teardown

echo
echo "$PASS passed, $FAIL failed"
[[ $FAIL -eq 0 ]]

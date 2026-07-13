#!/usr/bin/env bash

set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

branch="${BRANCH:-$(git branch --show-current)}"
if [[ "$branch" != "staging" ]]; then
  printf 'Refusing to build staging output from branch %s.\n' "${branch:-unknown}" >&2
  exit 1
fi

output_dir="$repo_root/.staging-dist"
rm -rf "$output_dir"
mkdir -p "$output_dir"

# Publish only the tracked files needed by the static website. Deliberately omit
# reports, source inputs, tests, caches, local Netlify state, and recovery data.
publish_paths=(
  404.html
  _redirects
  assets
  audit/index.html
  case-studies
  contact
  engagements
  favicon.ico
  index.html
  llms.txt
  publications
  recruiters
  resume/index.html
  resume/Sudeep-Arya-Amazon-DTC-Marketplace-AI-Commerce-Resume.pdf
  script.js
  sitemap.xml
  skills
  styles.css
  thank-you
  tools
)

while IFS= read -r -d '' file; do
  mkdir -p "$output_dir/$(dirname "$file")"
  cp -a "$file" "$output_dir/$file"
done < <(git ls-files -z -- "${publish_paths[@]}")

node scripts/transform-staging.mjs "$output_dir"

cat > "$output_dir/_headers" <<'HEADERS'
/*
  X-Robots-Tag: noindex, nofollow, noarchive, nosnippet
  Cache-Control: no-store
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
HEADERS

cat > "$output_dir/robots.txt" <<'ROBOTS'
# Staging indexing is controlled by the X-Robots-Tag response header.
User-agent: *
Allow: /
ROBOTS

node scripts/validate-staging-output.mjs "$output_dir"

printf 'Generated staging publish directory: %s\n' "$output_dir"

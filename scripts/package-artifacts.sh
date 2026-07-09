#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
ARTIFACT_DIR="$REPO_ROOT/artifacts"
WINDOWS_ARTIFACT_DIR="/mnt/c/Users/sudee/Downloads/sudeep-career-site-artifacts"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
ZIP_NAME="sudeep-arya-career-site-artifacts-${TIMESTAMP}.zip"
REPO_ZIP="$ARTIFACT_DIR/$ZIP_NAME"
WINDOWS_ZIP="$WINDOWS_ARTIFACT_DIR/$ZIP_NAME"

if ! command -v zip >/dev/null 2>&1; then
  echo "Error: zip is required but was not found." >&2
  exit 1
fi

mkdir -p "$ARTIFACT_DIR" "$WINDOWS_ARTIFACT_DIR"

cd "$REPO_ROOT"

zip -qr "$REPO_ZIP" . \
  -x "./.git/*" \
  -x "./.git" \
  -x "./artifacts/*" \
  -x "./artifacts" \
  -x "./source-assets/private/*" \
  -x "./source-assets/private" \
  -x "./node_modules/*" \
  -x "*/node_modules/*" \
  -x "./.DS_Store" \
  -x "*/.DS_Store" \
  -x "./Thumbs.db" \
  -x "*/Thumbs.db" \
  -x "./desktop.ini" \
  -x "*/desktop.ini" \
  -x "./.cache/*" \
  -x "*/.cache/*" \
  -x "./tmp/*" \
  -x "*/tmp/*" \
  -x "./temp/*" \
  -x "*/temp/*" \
  -x "./__MACOSX/*" \
  -x "*/__MACOSX/*" \
  -x "*.tmp" \
  -x "*.swp" \
  -x "*~"

cp "$REPO_ZIP" "$WINDOWS_ZIP"

WINDOWS_FILE_PATH="$(wslpath -w "$WINDOWS_ZIP")"

cat <<EOF
Artifact package created

Repo artifact path:
$REPO_ZIP

Windows-accessible WSL path:
$WINDOWS_ZIP

Windows File Explorer path:
$WINDOWS_FILE_PATH

Open folder in Windows:
explorer.exe "\$(wslpath -w /mnt/c/Users/sudee/Downloads/sudeep-career-site-artifacts)"
EOF

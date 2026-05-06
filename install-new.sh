#!/usr/bin/env bash
set -euo pipefail

# Swaps in the wired-up wizard / library / settings files.
# Run once, after the API + DB are configured.

cd "$(dirname "$0")"

declare -a PAIRS=(
  "app/(app)/page.new.tsx                         app/(app)/page.tsx"
  "app/(app)/library/page.new.tsx                 app/(app)/library/page.tsx"
  "app/(app)/library/[id]/[pid]/page.new.tsx      app/(app)/library/[id]/[pid]/page.tsx"
  "app/(app)/settings/page.new.tsx                app/(app)/settings/page.tsx"
  "components/wizard/UploadStep.new.tsx           components/wizard/UploadStep.tsx"
  "components/wizard/GenerateStep.new.tsx         components/wizard/GenerateStep.tsx"
  "components/wizard/ApproveStep.new.tsx          components/wizard/ApproveStep.tsx"
)

for pair in "${PAIRS[@]}"; do
  src=$(echo "$pair" | awk '{print $1}')
  dst=$(echo "$pair" | awk '{print $2}')
  if [ ! -f "$src" ]; then
    echo "SKIP (missing): $src"
    continue
  fi
  mv -v "$src" "$dst"
done

echo
echo "✓ wired up. Run: npm run dev"

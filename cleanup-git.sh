#!/bin/bash
# Script: Nadiifi git repo-ga - ka saar files culus oo aan loo baahnayn
# Run: bash cleanup-git.sh

echo "=== Nadiifinta Git Repo ==="
echo ""

# 1. Remove zip and backup files from git tracking
echo "[1/4] Ka saarista zip iyo backup files..."
git rm --cached -f barbaarintasan-app-20260202.zip 2>/dev/null
git rm --cached -f barbaarintasan-part-aa barbaarintasan-part-ab barbaarintasan-part-ac barbaarintasan-part-ad barbaarintasan-part-ae barbaarintasan-part-af barbaarintasan-part-ag 2>/dev/null
git rm --cached -f wordpress-plugin/barbaarintasan-sync-v2.zip wordpress-plugin/course-images.zip 2>/dev/null

# 2. Remove github-update folder from git tracking
echo "[2/4] Ka saarista github-update/ folder..."
git rm --cached -rf github-update/ 2>/dev/null

# 3. Remove unnecessary attached_assets from git tracking (keep only used ones)
echo "[3/4] Ka saarista attached_assets oo aan loo baahnayn..."
git rm --cached -rf attached_assets/stock_images/ 2>/dev/null
git rm --cached -f attached_assets/IMG_* 2>/dev/null
git rm --cached -f attached_assets/GOOGLE_* 2>/dev/null
git rm --cached -f attached_assets/After_payment_* 2>/dev/null
git rm --cached -f attached_assets/prev_* 2>/dev/null
git rm --cached -f attached_assets/player_* 2>/dev/null
git rm --cached -f attached_assets/sidaas_* 2>/dev/null
git rm --cached -f attached_assets/dev_* 2>/dev/null
git rm --cached -f attached_assets/too_* 2>/dev/null
git rm --cached -f attached_assets/nor_* 2>/dev/null
git rm --cached -f attached_assets/sheko_* 2>/dev/null
git rm --cached -f attached_assets/sheko1_* 2>/dev/null
git rm --cached -f attached_assets/maaw1_* 2>/dev/null
git rm --cached -f attached_assets/dham1_* 2>/dev/null
git rm --cached -f attached_assets/0.5_* 2>/dev/null
git rm --cached -f attached_assets/10_* 2>/dev/null
git rm --cached -f attached_assets/11_* 2>/dev/null
git rm --cached -f attached_assets/101_* 2>/dev/null
git rm --cached -f attached_assets/102_* 2>/dev/null
git rm --cached -f attached_assets/1_17* 2>/dev/null
git rm --cached -f attached_assets/2_17* 2>/dev/null
git rm --cached -f attached_assets/3_17* 2>/dev/null
git rm --cached -f attached_assets/4_17* 2>/dev/null
git rm --cached -f attached_assets/40_* 2>/dev/null
git rm --cached -f attached_assets/41_* 2>/dev/null
git rm --cached -f attached_assets/43_* 2>/dev/null
git rm --cached -f attached_assets/Pasted-* 2>/dev/null
git rm --cached -f attached_assets/parentMessages_* 2>/dev/null
git rm --cached -f attached_assets/Dockerfile_* 2>/dev/null
git rm --cached -f attached_assets/manifest_* 2>/dev/null
git rm --cached -f attached_assets/google* 2>/dev/null
git rm --cached -f attached_assets/client_secret_* 2>/dev/null

# 4. Show results
echo "[4/4] Natiiijada..."
echo ""
echo "Files-ka git-ka ku haray:"
git ls-files --cached | xargs du -shc 2>/dev/null | tail -1
echo ""
echo "Commit-garee isbeddellada:"
echo "  git add .gitignore cleanup-git.sh"
echo "  git commit -m 'Clean repo: remove large files and update .gitignore'"
echo "  git push origin main"
echo ""
echo "=== Dhammaad ==="

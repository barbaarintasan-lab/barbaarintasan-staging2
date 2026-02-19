/**
 * _push_all.cjs
 * Comprehensive sync script: pushes ALL source files from Replit to GitHub.
 * Run from the Replit shell: node _push_all.cjs
 *
 * Chain: Replit → GitHub (this script) → Fly.io (via GitHub Actions on push to main)
 */
const { Octokit } = require('@octokit/rest');
const fs = require('fs');
const path = require('path');

// ── Auth ──────────────────────────────────────────────────────────────────────
async function getAccessToken() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? 'depl ' + process.env.WEB_REPL_RENEWAL
      : null;
  const data = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    // Note: Replit connector API expects the header spelled with underscores
    { headers: { Accept: 'application/json', X_REPLIT_TOKEN: xReplitToken } }
  ).then(res => res.json());
  return (
    data.items?.[0]?.settings?.access_token ||
    data.items?.[0]?.settings?.oauth?.credentials?.access_token
  );
}

// ── File collection ────────────────────────────────────────────────────────────
// Directories / files that should never be sent to GitHub
const SKIP_DIRS = new Set([
  'node_modules', 'dist', '.git', '.wrangler', 'tts-audio',
  'github-update', '.cache', '.upm', '.local', '.config',
]);
const SKIP_EXACT = new Set([
  'package-lock.json', 'flyctl', 'flyio-secrets.txt',
]);
const SKIP_EXT = new Set(['.log', '.tmp', '.tar.gz', '.zip']);

// Binary extensions — read as buffer, encode as base64
const BINARY_EXT = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico',
  '.svg', '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.mp3', '.mp4', '.wav', '.ogg', '.webm', '.pdf',
]);

function collectFiles(dir, relBase) {
  const results = [];
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return results; }

  for (const entry of entries) {
    const name = entry.name;
    if (name.startsWith('.') && name !== '.env.example' && name !== '.gitignore' &&
        name !== '.dockerignore' && name !== '.replit') continue;

    const fullPath = path.join(dir, name);
    const relPath  = relBase ? relBase + '/' + name : name;

    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(name)) collectFiles(fullPath, relPath).forEach(f => results.push(f));
    } else {
      const ext = path.extname(name).toLowerCase();
      if (SKIP_EXACT.has(name) || SKIP_EXT.has(ext)) continue;
      // Skip project-specific archive/zip backup files (e.g. barbaarintasan-part-1.zip)
      if (/^barbaarintasan-(part|app-)/.test(name)) continue;
      results.push({ relPath, fullPath, binary: BINARY_EXT.has(ext) });
    }
  }
  return results;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const token = await getAccessToken();
  if (!token) throw new Error('Could not obtain GitHub access token from Replit connector');

  const octokit = new Octokit({ auth: token });
  const owner = 'barbaarintasan-ship-it';
  const repo  = 'barbaarintasan-staging2';

  // Get current HEAD of main
  const { data: ref }    = await octokit.rest.git.getRef({ owner, repo, ref: 'heads/main' });
  const { data: commit } = await octokit.rest.git.getCommit({ owner, repo, commit_sha: ref.object.sha });

  // Collect files
  const files = collectFiles('.', '');
  console.log(`Collecting ${files.length} files …`);

  // Create blobs (rate-limited: GitHub allows ~1 req/s safely)
  const treeEntries = [];
  let done = 0;
  for (const f of files) {
    let content, encoding;
    if (f.binary) {
      content  = fs.readFileSync(f.fullPath).toString('base64');
      encoding = 'base64';
    } else {
      try {
        content  = Buffer.from(fs.readFileSync(f.fullPath, 'utf-8')).toString('base64');
        encoding = 'base64';
      } catch {
        // Unreadable / truly binary file not caught by extension list → skip
        continue;
      }
    }
    const { data: blob } = await octokit.rest.git.createBlob({ owner, repo, content, encoding });
    treeEntries.push({ path: f.relPath, mode: '100644', type: 'blob', sha: blob.sha });
    done++;
    if (done % 20 === 0) process.stdout.write(`  ${done}/${files.length}\r`);
  }
  console.log(`\nUploaded ${done} blobs`);

  // Create tree, commit, update ref
  const { data: tree } = await octokit.rest.git.createTree({
    owner, repo, base_tree: commit.tree.sha, tree: treeEntries,
  });
  const { data: nc } = await octokit.rest.git.createCommit({
    owner, repo,
    message: 'Sync all source files from Replit',
    tree: tree.sha,
    parents: [ref.object.sha],
  });
  await octokit.rest.git.updateRef({ owner, repo, ref: 'heads/main', sha: nc.sha });
  console.log('✓ Pushed ' + done + ' files → ' + nc.sha.substring(0, 7));
  console.log('  GitHub Actions will now deploy to Fly.io automatically.');
}

main().catch(err => { console.error('✗ ' + err.message); process.exit(1); });

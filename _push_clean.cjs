const { Octokit } = require('@octokit/rest');
const fs = require('fs');
const path = require('path');

const SKIP_DIRS = [
  'attached_assets/',
  'node_modules/',
  '.local/',
  '.wrangler/',
  '.config/',
  'github-update/',
  'tts-audio/',
  'dist/',
  'server/public/',
];

const SKIP_FILES = [
  '_push.cjs',
  '_push2.cjs',
  '_push_clean.cjs',
  'flyctl',
  'flyctl.tar.gz',
];

const SKIP_EXT = ['.zip', '.tar.gz', '.tmp', '.log'];

const ESSENTIAL_ATTACHED = [
  'attached_assets/NEW_LOGO-BSU_1_1768990258338.png',
  'attached_assets/logo.svg',
  'attached_assets/course-images/',
];

function shouldInclude(filePath) {
  if (SKIP_FILES.includes(filePath)) return false;
  if (filePath.startsWith('barbaarintasan-part-')) return false;
  for (const ext of SKIP_EXT) {
    if (filePath.endsWith(ext)) return false;
  }
  for (const dir of SKIP_DIRS) {
    if (filePath.startsWith(dir)) {
      for (const essential of ESSENTIAL_ATTACHED) {
        if (filePath.startsWith(essential)) return true;
      }
      return false;
    }
  }
  return true;
}

async function getAccessToken() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;
  const data = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    { headers: { Accept: 'application/json', X_REPLIT_TOKEN: xReplitToken } }
  ).then((res) => res.json());
  return (
    data.items?.[0]?.settings?.access_token ||
    data.items?.[0]?.settings?.oauth?.credentials?.access_token
  );
}

function getAllFiles(dir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(process.cwd(), fullPath);
    if (entry.isDirectory()) {
      if (['node_modules', '.git', '.local', '.wrangler', '.cache', '.upm',
           'dist', 'tts-audio', '.idea', '.vscode'].includes(entry.name)) continue;
      getAllFiles(fullPath, fileList);
    } else {
      fileList.push(relPath);
    }
  }
  return fileList;
}

async function main() {
  const token = await getAccessToken();
  if (!token) {
    console.error('ERROR: Could not get GitHub access token');
    process.exit(1);
  }

  const octokit = new Octokit({ auth: token });
  const owner = 'barbaarintasan-lab';
  const repo = 'barbaarintasan-staging2';

  console.log(`\nPushing to ${owner}/${repo}...`);

  const allFiles = getAllFiles(process.cwd());
  const filesToPush = allFiles.filter(shouldInclude);

  const unstagedFiles = [];
  for (const f of filesToPush) {
    if (fs.existsSync(f)) {
      unstagedFiles.push(f);
    }
  }

  console.log(`Total tracked files: ${allFiles.length}`);
  console.log(`Files to push (clean): ${unstagedFiles.length}`);
  console.log(`Skipped: ${allFiles.length - unstagedFiles.length}`);

  const { data: ref } = await octokit.rest.git.getRef({ owner, repo, ref: 'heads/main' });
  const { data: baseCommit } = await octokit.rest.git.getCommit({
    owner, repo, commit_sha: ref.object.sha,
  });

  console.log(`\nBase commit: ${ref.object.sha.substring(0, 7)}`);
  console.log('Creating blobs...');

  const BATCH = 5;
  const treeItems = [];

  for (let i = 0; i < unstagedFiles.length; i += BATCH) {
    const batch = unstagedFiles.slice(i, i + BATCH);
    const promises = batch.map(async (filePath) => {
      const content = fs.readFileSync(filePath);
      const { data: blob } = await octokit.rest.git.createBlob({
        owner, repo,
        content: content.toString('base64'),
        encoding: 'base64',
      });
      return { path: filePath, mode: '100644', type: 'blob', sha: blob.sha };
    });
    const results = await Promise.all(promises);
    treeItems.push(...results);
    process.stdout.write(`  ${Math.min(i + BATCH, unstagedFiles.length)}/${unstagedFiles.length} files uploaded\r`);
    if (i + BATCH < unstagedFiles.length) {
      await new Promise(r => setTimeout(r, 300));
    }
  }

  console.log(`\nCreating tree with ${treeItems.length} files...`);
  const { data: tree } = await octokit.rest.git.createTree({
    owner, repo,
    tree: treeItems,
  });

  const commitMsg = [
    'Certificate redesign + Shahaadada button + cleanup',
    '',
    '- Two-page certificate (Somali + English) with professional design',
    '- Course topics, duration, enrollment date on certificate',
    '- Founder signature (Aw-musse) on certificate',
    '- Shahaadada button in course completion celebration',
    '- Fixed logo path for certificate generation',
    '- Updated .gitignore to exclude large/temp files',
  ].join('\n');

  const { data: newCommit } = await octokit.rest.git.createCommit({
    owner, repo,
    message: commitMsg,
    tree: tree.sha,
    parents: [ref.object.sha],
  });

  await octokit.rest.git.updateRef({
    owner, repo,
    ref: 'heads/main',
    sha: newCommit.sha,
  });

  console.log(`\nPushed successfully! Commit: ${newCommit.sha.substring(0, 7)}`);
  console.log('GitHub Actions will now deploy to Fly.io automatically.');
}

main().catch((err) => {
  console.error('Push failed:', err.message);
  process.exit(1);
});

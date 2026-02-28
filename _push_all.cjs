const { Octokit } = require('@octokit/rest');
const fs = require('fs');
const path = require('path');

async function getAccessToken() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY ? 'repl ' + process.env.REPL_IDENTITY : process.env.WEB_REPL_RENEWAL ? 'depl ' + process.env.WEB_REPL_RENEWAL : null;
  const data = await fetch('https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github', {
    headers: { 'Accept': 'application/json', 'X_REPLIT_TOKEN': xReplitToken }
  }).then(res => res.json());
  return data.items?.[0]?.settings?.access_token || data.items?.[0]?.settings?.oauth?.credentials?.access_token;
}

function getAllFiles(dir, baseDir = dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);
    if (entry.isDirectory()) {
      if (['node_modules', '.git', '.cache', '.local', '.upm', '.config', 'dist', 'download', 'tts-audio', 'missing-files', 'android-twa', 'docs', 'github-update', '.wrangler', 'attached_assets'].includes(entry.name)) continue;
      results = results.concat(getAllFiles(fullPath, baseDir));
    } else {
      if (entry.name.endsWith('.aab') || entry.name.endsWith('.zip') || entry.name === 'flyio-secrets.txt') continue;
      if (entry.name.endsWith('.md') && entry.name !== 'replit.md') continue;
      if (entry.name.endsWith('.png') || entry.name.endsWith('.jpg') || entry.name.endsWith('.jpeg') || entry.name.endsWith('.gif') || entry.name.endsWith('.svg') || entry.name.endsWith('.ico') || entry.name.endsWith('.webp')) continue;
      const stat = fs.statSync(fullPath);
      if (stat.size > 1024 * 1024) continue;
      results.push(relativePath);
    }
  }
  return results;
}

async function main() {
  console.log('Getting GitHub access token...');
  const token = await getAccessToken();
  if (!token) { console.error('No token found!'); return; }
  
  const octokit = new Octokit({ auth: token });
  const owner = 'barbaarintasan-ship-it', repo = 'barbaarintasan-staging2';

  console.log('Getting current main branch...');
  const { data: ref } = await octokit.rest.git.getRef({ owner, repo, ref: 'heads/main' });
  const { data: commit } = await octokit.rest.git.getCommit({ owner, repo, commit_sha: ref.object.sha });

  const allFiles = getAllFiles('.');
  console.log(`Found ${allFiles.length} source files to push`);

  const treeItems = [];
  const BATCH = 15;

  for (let i = 0; i < allFiles.length; i += BATCH) {
    const batch = allFiles.slice(i, i + BATCH);
    const promises = batch.map(async (filePath) => {
      try {
        const content = fs.readFileSync(filePath);
        const { data: blob } = await octokit.rest.git.createBlob({
          owner, repo,
          content: content.toString('base64'),
          encoding: 'base64'
        });
        return { path: filePath, mode: '100644', type: 'blob', sha: blob.sha };
      } catch (err) {
        console.error(`  Skip ${filePath}: ${err.message}`);
        return null;
      }
    });
    const results = await Promise.all(promises);
    treeItems.push(...results.filter(Boolean));
    console.log(`  Uploaded ${Math.min(i + BATCH, allFiles.length)}/${allFiles.length}`);
  }

  console.log(`Creating tree with ${treeItems.length} files...`);
  const { data: tree } = await octokit.rest.git.createTree({
    owner, repo,
    base_tree: commit.tree.sha,
    tree: treeItems
  });

  console.log('Creating commit...');
  const { data: newCommit } = await octokit.rest.git.createCommit({
    owner, repo,
    message: 'Full sync from Replit - latest code with all updates',
    tree: tree.sha,
    parents: [ref.object.sha]
  });

  await octokit.rest.git.updateRef({
    owner, repo,
    ref: 'heads/main',
    sha: newCommit.sha,
    force: true
  });

  console.log(`SUCCESS! Pushed ${treeItems.length} files. Commit: ${newCommit.sha.substring(0, 7)}`);
}

main().catch(err => console.error('Error:', err.message));

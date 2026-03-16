const { Octokit } = require('@octokit/rest');
const fs = require('fs');
const path = require('path');

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

async function main() {
  const token = await getAccessToken();
  if (!token) {
    console.error('ERROR: Could not get GitHub access token');
    process.exit(1);
  }

  const octokit = new Octokit({ auth: token });
  const owner = 'barbaarintasan-lab';
  const repo = 'barbaarintasan-staging2';

  const filesToPush = [
    'client/src/pages/LessonView.tsx',
    'client/src/lib/certificate.ts',
    'client/src/pages/Profile.tsx',
  ];

  console.log(`Pushing ${filesToPush.length} changed files to ${owner}/${repo}...`);

  const { data: ref } = await octokit.rest.git.getRef({ owner, repo, ref: 'heads/main' });
  const { data: baseCommit } = await octokit.rest.git.getCommit({
    owner, repo, commit_sha: ref.object.sha,
  });

  console.log(`Base commit: ${ref.object.sha.substring(0, 7)}`);

  const treeItems = [];
  for (const filePath of filesToPush) {
    if (!fs.existsSync(filePath)) {
      console.log(`  SKIP (not found): ${filePath}`);
      continue;
    }
    const content = fs.readFileSync(filePath);
    const { data: blob } = await octokit.rest.git.createBlob({
      owner, repo,
      content: content.toString('base64'),
      encoding: 'base64',
    });
    treeItems.push({ path: filePath, mode: '100644', type: 'blob', sha: blob.sha });
    console.log(`  OK: ${filePath} (${(content.length / 1024).toFixed(0)}K)`);
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\nCreating tree with ${treeItems.length} updated files...`);
  const { data: tree } = await octokit.rest.git.createTree({
    owner, repo,
    base_tree: baseCommit.tree.sha,
    tree: treeItems,
  });

  const commitMsg = [
    'Show celebration every time user completes a course lesson',
    '',
    '- Changed from localStorage (once ever) to sessionStorage (once per browser session)',
    '- Dabaaladga button always re-triggers celebration without restrictions',
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

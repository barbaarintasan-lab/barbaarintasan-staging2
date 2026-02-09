const { Octokit } = require('@octokit/rest');
const fs = require('fs');
async function getAccessToken() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY ? 'repl ' + process.env.REPL_IDENTITY : process.env.WEB_REPL_RENEWAL ? 'depl ' + process.env.WEB_REPL_RENEWAL : null;
  const data = await fetch('https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github', {
    headers: { 'Accept': 'application/json', 'X_REPLIT_TOKEN': xReplitToken }
  }).then(res => res.json());
  return data.items?.[0]?.settings?.access_token || data.items?.[0]?.settings?.oauth?.credentials?.access_token;
}
async function main() {
  const octokit = new Octokit({ auth: await getAccessToken() });
  const owner = 'barbaarintasan-ship-it', repo = 'barbaarintasan-staging2';
  const { data: ref } = await octokit.rest.git.getRef({ owner, repo, ref: 'heads/main' });
  const { data: commit } = await octokit.rest.git.getCommit({ owner, repo, commit_sha: ref.object.sha });
  
  const files = [
    { path: 'server/routes.ts', content: fs.readFileSync('server/routes.ts', 'utf-8') },
    { path: 'client/public/google35b9320b2008f257.html', content: fs.readFileSync('client/public/google35b9320b2008f257.html', 'utf-8') }
  ];
  
  const blobs = [];
  for (const f of files) {
    const { data: blob } = await octokit.rest.git.createBlob({ owner, repo, content: Buffer.from(f.content).toString('base64'), encoding: 'base64' });
    blobs.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.sha });
  }
  
  const { data: tree } = await octokit.rest.git.createTree({ owner, repo, base_tree: commit.tree.sha, tree: blobs });
  const { data: nc } = await octokit.rest.git.createCommit({ owner, repo, message: 'Add Google site verification file + OAuth client update', tree: tree.sha, parents: [ref.object.sha] });
  await octokit.rest.git.updateRef({ owner, repo, ref: 'heads/main', sha: nc.sha });
  console.log('Pushed ' + nc.sha.substring(0, 7));
}
main().catch(err => console.error(err.message));

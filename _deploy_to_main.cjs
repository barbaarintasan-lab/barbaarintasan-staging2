const { Octokit } = require('@octokit/rest');
const { execSync } = require('child_process');

async function getAccessToken() {
  // Try different methods to get token
  if (process.env.GITHUB_TOKEN) {
    return process.env.GITHUB_TOKEN;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY ? 'repl ' + process.env.REPL_IDENTITY : 
                       process.env.WEB_REPL_RENEWAL ? 'depl ' + process.env.WEB_REPL_RENEWAL : null;
  
  if (hostname && xReplitToken) {
    const data = await fetch('https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github', {
      headers: { 'Accept': 'application/json', 'X_REPLIT_TOKEN': xReplitToken }
    }).then(res => res.json());
    return data.items?.[0]?.settings?.access_token || data.items?.[0]?.settings?.oauth?.credentials?.access_token;
  }
  
  throw new Error('No GitHub token found');
}

async function main() {
  try {
    console.log('🚀 Starting deployment push to main...\n');
    
    const octokit = new Octokit({ auth: await getAccessToken() });
    const owner = 'barbaarintasan-ship-it';
    const repo = 'barbaarintasan-staging2';
    const sourceBranch = 'copilot/improve-file-five-quality';
    const targetBranch = 'main';
    
    console.log(`📦 Fetching ${sourceBranch} branch...`);
    const { data: sourceRef } = await octokit.rest.git.getRef({ 
      owner, 
      repo, 
      ref: `heads/${sourceBranch}` 
    });
    
    console.log(`✅ Source branch SHA: ${sourceRef.object.sha.substring(0, 7)}`);
    console.log(`\n🔄 Updating ${targetBranch} to point to ${sourceBranch}...`);
    
    await octokit.rest.git.updateRef({ 
      owner, 
      repo, 
      ref: `heads/${targetBranch}`, 
      sha: sourceRef.object.sha,
      force: false  // Use fast-forward merge
    });
    
    console.log(`\n✨ Successfully pushed to ${targetBranch}!`);
    console.log(`🎯 Commit: ${sourceRef.object.sha.substring(0, 7)}`);
    console.log(`\n🚀 GitHub Actions will now deploy to fly.io...`);
    console.log(`📊 Monitor deployment: https://github.com/${owner}/${repo}/actions`);
    console.log(`🌐 App will be live at: https://staging.appbarbaarintasan.com`);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.status === 422) {
      console.error('\n💡 This might be due to diverged history. Creating PR instead...');
      console.error('Please merge the PR manually at:');
      console.error(`https://github.com/${owner}/${repo}/compare/main...${sourceBranch}`);
    }
    process.exit(1);
  }
}

main();

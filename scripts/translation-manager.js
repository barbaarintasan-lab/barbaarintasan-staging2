#!/usr/bin/env node

/**
 * Translation Management CLI Tool
 * Easy interface for managing translations
 */

const readline = require('readline');
const https = require('https');
const http = require('http');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';
const COOKIE = process.env.ADMIN_COOKIE || '';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': COOKIE
      }
    };

    const req = lib.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          // If JSON parsing fails, return raw body (might be text response)
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ status: res.statusCode, data: body });
          } else {
            resolve({ status: res.statusCode, data: body, error: 'Failed to parse JSON response' });
          }
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function mainMenu() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║    BARBAARINTASAN TRANSLATION MANAGER                  ║');
  console.log('║    Maamulka Tarjumaadda                                ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  console.log('1️⃣  Start Comprehensive Translation (All Content)');
  console.log('    Bilow Tarjumaada Dhammaystiran (Dhammaan Content-ka)');
  console.log('');
  console.log('2️⃣  View All Translation Jobs');
  console.log('    Eeg Dhammaan Jobs-yada Tarjumaadda');
  console.log('');
  console.log('3️⃣  Check Job Status by ID');
  console.log('    Hubi Status Job Gaar Ah');
  console.log('');
  console.log('4️⃣  Update All Job Statuses');
  console.log('    Cusboonaysii Status-ka Dhammaan Jobs-yada');
  console.log('');
  console.log('5️⃣  Generate Coverage Report (JSON)');
  console.log('    Samee Warbixinta Coverage (JSON)');
  console.log('');
  console.log('6️⃣  Generate Coverage Report (Text - Somali)');
  console.log('    Samee Warbixinta Coverage (Qoraal - Soomaali)');
  console.log('');
  console.log('7️⃣  Generate Coverage Report (Text - English)');
  console.log('    Samee Warbixinta Coverage (Qoraal - English)');
  console.log('');
  console.log('8️⃣  View Statistics');
  console.log('    Eeg Tirokoobka');
  console.log('');
  console.log('0️⃣  Exit / Ka Bax');
  console.log('');

  const choice = await question('Dooro / Choose (0-8): ');
  return choice.trim();
}

async function startComprehensiveTranslation() {
  console.log('\n📚 Starting Comprehensive Translation...');
  console.log('   Waxaa la bilaabayaa Tarjumaada Dhammaystiran...\n');
  
  const limit = await question('Limit per content type (default 20): ');
  const limitNum = parseInt(limit) || 20;
  
  console.log(`\n⏳ Creating translation jobs for up to ${limitNum} items per type...`);
  
  try {
    const result = await makeRequest('POST', '/api/admin/batch-jobs/translation-comprehensive', { limit: limitNum });
    
    if (result.status === 200) {
      console.log('\n✅ Success! / Guul!');
      console.log(`   Created ${result.data.count || 0} translation jobs`);
      console.log(`   Job IDs: ${(result.data.jobIds || []).join(', ')}`);
      console.log(`\n   ${result.data.message || ''}`);
    } else {
      console.log('\n❌ Error:', result.data.error || 'Unknown error');
    }
  } catch (err) {
    console.error('\n❌ Request failed:', err.message);
  }
  
  await question('\nPress Enter to continue...');
}

async function viewAllJobs() {
  console.log('\n📋 Fetching all translation jobs...');
  console.log('   Waxaa la keenayaa dhammaan jobs-yada...\n');
  
  try {
    const result = await makeRequest('GET', '/api/admin/batch-jobs');
    
    if (result.status === 200 && Array.isArray(result.data)) {
      if (result.data.length === 0) {
        console.log('   No jobs found / Jobs ma jiraan\n');
      } else {
        console.log(`   Found ${result.data.length} jobs:\n`);
        result.data.slice(0, 10).forEach((job, i) => {
          console.log(`   ${i + 1}. ${job.id}`);
          console.log(`      Status: ${job.status}`);
          console.log(`      Description: ${job.description || 'N/A'}`);
          console.log(`      Progress: ${job.completedCount || 0}/${job.requestCount || 0}`);
          console.log(`      Created: ${new Date(job.createdAt).toLocaleString()}`);
          console.log('');
        });
        if (result.data.length > 10) {
          console.log(`   ... and ${result.data.length - 10} more jobs\n`);
        }
      }
    } else {
      console.log('\n❌ Error:', result.data.error || 'Failed to fetch jobs');
    }
  } catch (err) {
    console.error('\n❌ Request failed:', err.message);
  }
  
  await question('\nPress Enter to continue...');
}

async function checkJobStatus() {
  console.log('\n🔍 Check Job Status...\n');
  
  const jobId = await question('Enter Job ID: ');
  
  if (!jobId.trim()) {
    console.log('❌ Job ID required');
    await question('\nPress Enter to continue...');
    return;
  }
  
  console.log('\n⏳ Fetching job details...');
  
  try {
    const result = await makeRequest('GET', `/api/admin/batch-jobs/${jobId.trim()}`);
    
    if (result.status === 200) {
      const { job, items } = result.data;
      console.log('\n✅ Job Details:\n');
      console.log(`   ID: ${job.id}`);
      console.log(`   Status: ${job.status}`);
      console.log(`   Type: ${job.jobType || 'N/A'}`);
      console.log(`   Description: ${job.description || 'N/A'}`);
      console.log(`   Progress: ${job.completedCount || 0}/${job.requestCount || 0}`);
      console.log(`   Failed: ${job.failedCount || 0}`);
      console.log(`   Created: ${new Date(job.createdAt).toLocaleString()}`);
      if (job.completedAt) {
        console.log(`   Completed: ${new Date(job.completedAt).toLocaleString()}`);
      }
      if (job.errorMessage) {
        console.log(`\n   ⚠️  Error: ${job.errorMessage}`);
      }
      if (items && items.length > 0) {
        console.log(`\n   Items: ${items.length} total`);
      }
    } else {
      console.log('\n❌ Error:', result.data.error || 'Job not found');
    }
  } catch (err) {
    console.error('\n❌ Request failed:', err.message);
  }
  
  await question('\nPress Enter to continue...');
}

async function updateAllStatuses() {
  console.log('\n🔄 Updating all job statuses...');
  console.log('   Waxaa la cusboonaysiinayaa dhammaan jobs-yada...\n');
  
  try {
    const result = await makeRequest('POST', '/api/admin/batch-jobs/check-all-status');
    
    if (result.status === 200) {
      console.log('\n✅ Success! / Guul!');
      console.log(`   ${result.data.message || 'Statuses updated'}`);
      if (result.data.jobs && result.data.jobs.length > 0) {
        console.log(`\n   ${result.data.jobs.length} jobs still pending/processing`);
      }
    } else {
      console.log('\n❌ Error:', result.data.error || 'Failed to update statuses');
    }
  } catch (err) {
    console.error('\n❌ Request failed:', err.message);
  }
  
  await question('\nPress Enter to continue...');
}

async function generateCoverageReport(format = 'json', lang = 'english') {
  console.log('\n📊 Generating Coverage Report...');
  console.log('   Waxaa la samaynayaa Warbixinta Coverage...\n');
  
  try {
    const path = `/api/admin/batch-jobs/translation-coverage?format=${format}&lang=${lang}`;
    const result = await makeRequest('GET', path);
    
    if (result.status === 200) {
      if (format === 'text') {
        console.log('\n' + result.data);
      } else {
        console.log('\n✅ Coverage Report:\n');
        const report = result.data;
        console.log(`   Total Items: ${report.summary.totalItems}`);
        console.log(`   Translated: ${report.summary.translatedItems}`);
        console.log(`   Coverage: ${report.summary.coveragePercentage}%`);
        console.log(`\n   By Content Type:`);
        Object.entries(report.byContentType).forEach(([type, data]) => {
          console.log(`      ${type}: ${data.translated}/${data.total} (${data.coveragePercentage}%)`);
        });
      }
    } else {
      console.log('\n❌ Error:', result.data.error || 'Failed to generate report');
    }
  } catch (err) {
    console.error('\n❌ Request failed:', err.message);
  }
  
  await question('\nPress Enter to continue...');
}

async function viewStatistics() {
  console.log('\n📈 Fetching Statistics...');
  console.log('   Waxaa la keenayaa Tirokoobka...\n');
  
  try {
    const result = await makeRequest('GET', '/api/admin/batch-jobs/stats');
    
    if (result.status === 200 && Array.isArray(result.data)) {
      if (result.data.length === 0) {
        console.log('   No statistics available / Tirookoob ma jiro\n');
      } else {
        console.log('   Statistics by Status and Type:\n');
        result.data.forEach((stat) => {
          console.log(`   ${stat.status || 'unknown'} - ${stat.type || 'unknown'}:`);
          console.log(`      Jobs: ${stat.count || 0}`);
          console.log(`      Total Requests: ${stat.total_requests || 0}`);
          console.log(`      Completed: ${stat.completed_requests || 0}`);
          console.log(`      Failed: ${stat.failed_requests || 0}`);
          console.log('');
        });
      }
    } else {
      console.log('\n❌ Error:', result.data.error || 'Failed to fetch statistics');
    }
  } catch (err) {
    console.error('\n❌ Request failed:', err.message);
  }
  
  await question('\nPress Enter to continue...');
}

async function main() {
  console.clear();
  
  // Check if cookie is set
  if (!COOKIE) {
    console.log('\n⚠️  WARNING: ADMIN_COOKIE environment variable not set!');
    console.log('   Set it with: export ADMIN_COOKIE="your-session-cookie"');
    console.log('   Or the requests may fail with 401 Unauthorized.\n');
    await question('Press Enter to continue anyway...');
  }
  
  let running = true;
  
  while (running) {
    console.clear();
    const choice = await mainMenu();
    
    switch (choice) {
      case '1':
        await startComprehensiveTranslation();
        break;
      case '2':
        await viewAllJobs();
        break;
      case '3':
        await checkJobStatus();
        break;
      case '4':
        await updateAllStatuses();
        break;
      case '5':
        await generateCoverageReport('json', 'english');
        break;
      case '6':
        await generateCoverageReport('text', 'somali');
        break;
      case '7':
        await generateCoverageReport('text', 'english');
        break;
      case '8':
        await viewStatistics();
        break;
      case '0':
        running = false;
        console.log('\n👋 Goodbye! / Nabadgelyo!\n');
        break;
      default:
        console.log('\n❌ Invalid choice / Dooran khalad ah\n');
        await question('Press Enter to continue...');
    }
  }
  
  rl.close();
}

// Run the CLI
main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

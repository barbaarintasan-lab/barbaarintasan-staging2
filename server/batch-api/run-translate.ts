import { runDirectTranslation, getTranslationStats } from './direct-translate';

async function main() {
  console.log('Starting translation generation for all content types...');
  console.log('This will use the Replit AI integration or OpenAI API to translate content.');
  
  try {
    const result = await runDirectTranslation(100);
    console.log('\n=== Translation Results ===');
    console.log(`Total fields translated: ${result.total}`);
    console.log('Details by type:', JSON.stringify(result.details, null, 2));
    
    console.log('\n=== Translation Stats ===');
    const stats = await getTranslationStats();
    console.log('Translated:', JSON.stringify(stats.translated, null, 2));
    console.log('Totals:', JSON.stringify(stats.totals, null, 2));
    
    process.exit(0);
  } catch (error: any) {
    console.error('Translation error:', error.message);
    process.exit(1);
  }
}

main();

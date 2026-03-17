import { db } from "../server/db";
import { parentMessages, bedtimeStories } from "@shared/schema";
import { listDhambaalFiles, listMaaweelFiles, getFileContent, parseDhambaalContent, parseMaaweelContent } from "../server/googleDrive";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

async function importAllContent() {
  console.log("Starting content import from Google Drive...");
  
  let imported = { dhambaal: 0, maaweelo: 0, skipped: 0, errors: [] as string[] };
  
  // Get existing content to avoid duplicates
  const existingDhambaal = await db.select().from(parentMessages);
  const existingMaaweelo = await db.select().from(bedtimeStories);
  
  const existingDhambaalTitles = new Set(existingDhambaal.map(d => d.title?.toLowerCase().trim()));
  const existingMaaweelTitles = new Set(existingMaaweelo.map(m => m.titleSomali?.toLowerCase().trim()));
  
  console.log(`Found ${existingDhambaal.length} existing dhambaal, ${existingMaaweelo.length} existing maaweelo`);
  
  // Import dhambaal
  console.log("\nImporting Dhambaal from Google Drive...");
  try {
    const dhambaalFiles = await listDhambaalFiles();
    console.log(`Found ${dhambaalFiles.length} dhambaal files in Google Drive`);
    
    for (const file of dhambaalFiles) {
      try {
        const content = await getFileContent(file.id);
        if (!content) continue;
        
        const parsed = parseDhambaalContent(content, file.name);
        if (!parsed) continue;
        
        // Check for duplicate
        if (existingDhambaalTitles.has(parsed.title.toLowerCase().trim())) {
          console.log(`  Skipping duplicate: ${parsed.title.substring(0, 50)}...`);
          imported.skipped++;
          continue;
        }
        
        // Create new parent message
        const messageDate = new Date(parsed.date + 'T08:00:00Z');
        await db.insert(parentMessages).values({
          id: nanoid(),
          title: parsed.title,
          content: parsed.body,
          generatedAt: messageDate,
          messageDate: messageDate,
          audioUrl: null,
          images: [],
          topic: 'general'
        });
        
        console.log(`  Imported: ${parsed.title.substring(0, 50)}... (${parsed.date})`);
        imported.dhambaal++;
        existingDhambaalTitles.add(parsed.title.toLowerCase().trim());
      } catch (err) {
        console.error(`  Error with file ${file.name}:`, err);
        imported.errors.push(`Dhambaal: ${file.name}`);
      }
    }
  } catch (err) {
    console.error("Error listing dhambaal files:", err);
  }
  
  // Import maaweelo
  console.log("\nImporting Maaweelo from Google Drive...");
  try {
    const maaweelFiles = await listMaaweelFiles();
    console.log(`Found ${maaweelFiles.length} maaweelo files in Google Drive`);
    
    for (const file of maaweelFiles) {
      try {
        const content = await getFileContent(file.id);
        if (!content) continue;
        
        const parsed = parseMaaweelContent(content, file.name);
        if (!parsed) continue;
        
        // Check for duplicate
        if (existingMaaweelTitles.has(parsed.title.toLowerCase().trim())) {
          console.log(`  Skipping duplicate: ${parsed.title.substring(0, 50)}...`);
          imported.skipped++;
          continue;
        }
        
        // Create new bedtime story
        const storyDate = new Date(parsed.date + 'T08:00:00Z');
        await db.insert(bedtimeStories).values({
          id: nanoid(),
          title: parsed.title,
          titleSomali: parsed.title,
          content: parsed.body,
          characterName: parsed.characterName || 'Qof aan la aqoon',
          characterType: 'sahaba',
          moralLesson: parsed.moralLesson || '',
          generatedAt: storyDate,
          storyDate: storyDate,
          audioUrl: null,
          images: []
        });
        
        console.log(`  Imported: ${parsed.title.substring(0, 50)}... (${parsed.date})`);
        imported.maaweelo++;
        existingMaaweelTitles.add(parsed.title.toLowerCase().trim());
      } catch (err) {
        console.error(`  Error with file ${file.name}:`, err);
        imported.errors.push(`Maaweelo: ${file.name}`);
      }
    }
  } catch (err) {
    console.error("Error listing maaweelo files:", err);
  }
  
  console.log("\n========================================");
  console.log("IMPORT COMPLETE!");
  console.log(`Dhambaal imported: ${imported.dhambaal}`);
  console.log(`Maaweelo imported: ${imported.maaweelo}`);
  console.log(`Skipped (duplicates): ${imported.skipped}`);
  if (imported.errors.length > 0) {
    console.log(`Errors: ${imported.errors.length}`);
    imported.errors.forEach(e => console.log(`  - ${e}`));
  }
  console.log("========================================");
  
  process.exit(0);
}

importAllContent().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});

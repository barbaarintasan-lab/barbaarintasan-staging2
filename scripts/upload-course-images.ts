import fs from 'fs';
import path from 'path';
import { uploadToR2 } from '../server/r2Storage';

const IMAGES_DIR = 'client/public/course-images';

async function uploadImages() {
  const files = fs.readdirSync(IMAGES_DIR);
  console.log(`Found ${files.length} images to upload`);
  
  const results: { file: string; url: string }[] = [];
  
  for (const file of files) {
    if (!file.endsWith('.png')) continue;
    
    const filePath = path.join(IMAGES_DIR, file);
    const fileBuffer = fs.readFileSync(filePath);
    
    console.log(`Uploading ${file}...`);
    
    const { url } = await uploadToR2(
      fileBuffer,
      file,
      'image/png',
      'course-images',
      'dhambaal'
    );
    
    results.push({ file, url });
    console.log(`  ✓ ${url}`);
  }
  
  console.log('\n=== Upload Complete ===');
  console.log('SQL UPDATE statements:');
  for (const { file, url } of results) {
    const localPath = `/course-images/${file}`;
    console.log(`UPDATE courses SET image_url = '${url}' WHERE image_url = '${localPath}';`);
  }
}

uploadImages().catch(console.error);

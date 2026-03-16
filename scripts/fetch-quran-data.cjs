const fs = require('fs');
const path = require('path');

const QURAN_DIR = path.join(__dirname, '../client/public/quran');

async function fetchSurah(surahNumber) {
  const url = `https://api.alquran.cloud/v1/surah/${surahNumber}`;
  const response = await fetch(url);
  const data = await response.json();
  
  if (data.code !== 200) {
    throw new Error(`Failed to fetch surah ${surahNumber}`);
  }
  
  return {
    number: data.data.number,
    name: data.data.name,
    englishName: data.data.englishName,
    englishNameTranslation: data.data.englishNameTranslation,
    revelationType: data.data.revelationType,
    numberOfAyahs: data.data.numberOfAyahs,
    ayahs: data.data.ayahs.map(ayah => ({
      number: ayah.numberInSurah,
      text: ayah.text.trim(),
      juz: ayah.juz,
      page: ayah.page
    }))
  };
}

async function fetchAllSurahs() {
  if (!fs.existsSync(QURAN_DIR)) {
    fs.mkdirSync(QURAN_DIR, { recursive: true });
  }
  
  console.log('Fetching Quran data from AlQuran.cloud API...');
  
  for (let i = 1; i <= 114; i++) {
    try {
      console.log(`Fetching surah ${i}/114...`);
      const surah = await fetchSurah(i);
      
      const filePath = path.join(QURAN_DIR, `${i.toString().padStart(3, '0')}.json`);
      fs.writeFileSync(filePath, JSON.stringify(surah, null, 2));
      
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Error fetching surah ${i}:`, error.message);
    }
  }
  
  console.log('Done! All surahs saved to client/public/quran/');
}

fetchAllSurahs();

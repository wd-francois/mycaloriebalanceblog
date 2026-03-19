/**
 * Parses ExerciseDB-Final.ods (extract content.xml first) and outputs
 * public/seed-exercises.json for the exercise library.
 *
 * To extract: copy public/ExerciseDB-Final.ods to ExerciseDB-Final.zip, then
 *   Expand-Archive -Path ExerciseDB-Final.zip -DestinationPath public/ExerciseDB-extract
 * Then run: node scripts/parse-ods-exercises.cjs
 */

const fs = require('fs');
const path = require('path');

const contentPath = path.join(__dirname, '..', 'public', 'ExerciseDB-extract', 'content.xml');
const outPath = path.join(__dirname, '..', 'public', 'seed-exercises.json');

const xml = fs.readFileSync(contentPath, 'utf8');

// Split into rows (handle both multi-line and single-line)
const rowRegex = /<table:table-row[^>]*>([\s\S]*?)<\/table:table-row>/g;
const rows = [];
let rowMatch;
while ((rowMatch = rowRegex.exec(xml)) !== null) {
  const rowXml = rowMatch[1];
  const cells = [];
  // Match cells: either <table:table-cell...>content</table:table-cell> or <table:table-cell .../>
  const cellRegex = /<table:table-cell[^>]*>([\s\S]*?)<\/table:table-cell>|<table:table-cell[^/]*\/>/g;
  let cellMatch;
  while ((cellMatch = cellRegex.exec(rowXml)) !== null) {
    const content = cellMatch[1] || '';
    const textMatch = content.match(/<text:p>([^<]*)<\/text:p>/);
    cells.push(textMatch ? textMatch[1].trim() : '');
  }
  rows.push(cells);
}

// First row = headers (Name, Equipment, Video Demonstration)
// Data rows = name, equipment, videoUrl (columns 0, 1, 2)
const exercises = [];
for (let i = 1; i < rows.length; i++) {
  const cells = rows[i];
  const name = (cells[0] || '').trim();
  if (!name) continue;
  const equipment = (cells[1] || '').trim();
  const videoUrl = (cells[2] || '').trim();
  exercises.push({
    name,
    category: equipment || 'Other',
    tags: equipment || '',
    description: '',
    videoUrl: videoUrl && (videoUrl.startsWith('http') || videoUrl.startsWith('www')) ? videoUrl : '',
  });
}

fs.writeFileSync(outPath, JSON.stringify(exercises, null, 2), 'utf8');
console.log(`Wrote ${exercises.length} exercises to ${outPath}`);

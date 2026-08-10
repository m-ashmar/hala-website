const fs = require('fs');

const content = fs.readFileSync('app/translations.ts', 'utf8');
const lines = content.split('\n');
const en = {};
const ar = {};
const regex = /^\s*([a-zA-Z0-9_]+):\s*\{\s*en:\s*\"(.*?)\",\s*ar:\s*\"(.*?)\"\s*\},?$/;
const regexMultiline = /^\s*([a-zA-Z0-9_]+):\s*\{\s*$/;

for(let i=0; i<lines.length; i++){
  let line = lines[i];
  const match = line.match(regex);
  if(match) {
    en[match[1]] = match[2];
    ar[match[1]] = match[3];
  } else {
    const mMatch = line.match(regexMultiline);
    if(mMatch) {
      let key = mMatch[1];
      let enLine = lines[i+1].match(/en:\s*\"(.*?)\",?/);
      let arLine = lines[i+2].match(/ar:\s*\"(.*?)\",?/);
      if(enLine && arLine) {
        en[key] = enLine[1];
        ar[key] = arLine[1];
      }
    }
  }
}
fs.writeFileSync('messages/en.json', JSON.stringify(en, null, 2));
fs.writeFileSync('messages/ar.json', JSON.stringify(ar, null, 2));
console.log("Migration complete.");

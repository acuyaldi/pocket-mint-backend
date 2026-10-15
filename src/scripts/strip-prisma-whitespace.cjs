const fs = require('node:fs');

for (const file of process.argv.slice(2)) {
  const content = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(file, content.replace(/[ \t]+$/gm, ''));
}

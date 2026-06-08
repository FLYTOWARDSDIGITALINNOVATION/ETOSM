const fs = require('fs');
const path = require('path');

function checkBraces(dir) {
  let files = fs.readdirSync(dir);
  for (let file of files) {
    let fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      checkBraces(fullPath);
    } else if (fullPath.endsWith('.css')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let openBraces = 0;
      let lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        for (let char of lines[i]) {
          if (char === '{') openBraces++;
          else if (char === '}') {
            openBraces--;
            if (openBraces < 0) {
              console.log(`Unbalanced '}' found in ${fullPath} at line ${i + 1}`);
              openBraces = 0; // Reset to continue checking or just return
            }
          }
        }
      }
      if (openBraces > 0) {
         console.log(`Unclosed '{' found in ${fullPath} (${openBraces} remaining)`);
      }
    }
  }
}

checkBraces('d:\\fly\\ETOSM\\frontend\\src');

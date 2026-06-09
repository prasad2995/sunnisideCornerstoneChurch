const fs = require('fs');
const path = require('path');

const src = 'C:\\Users\\srinivasa.punnam\\.gemini\\antigravity-ide\\brain\\35b382ec-417d-447b-a849-6ebe19dcf498\\media__1781011972263.png';
const dest = path.join(__dirname, 'home', 'logo.png');

try {
  fs.copyFileSync(src, dest);
  console.log('Logo copied successfully to ' + dest);
} catch (err) {
  console.error('Error copying logo:', err);
}

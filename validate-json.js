const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'vercel.json');

try {
  const content = fs.readFileSync(filePath, 'utf8');
  JSON.parse(content);
  console.log('vercel.json is valid JSON!');
} catch (err) {
  console.error('Error parsing vercel.json:', err.message);
}
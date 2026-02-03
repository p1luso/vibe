const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'node_modules', 'metro-config', 'src', 'loadConfig.js');

if (fs.existsSync(filePath)) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Patch for Windows ESM URL scheme issue
  // We look for the dynamic import and ensure the path is a file:// URL on Windows
  const patchCode = `
    const pathToImport = path.isAbsolute(absolutePath) && process.platform === 'win32'
      ? require('url').pathToFileURL(absolutePath).href
      : absolutePath;
    const configModule = await import(pathToImport);
  `;
  
  const originalCodePattern = /const configModule = await import\(absolutePath\);/;
  
  if (content.match(originalCodePattern)) {
    content = content.replace(originalCodePattern, patchCode);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Successfully patched metro-config for Windows ESM support.');
  } else if (content.includes('pathToFileURL')) {
    console.log('metro-config is already patched.');
  } else {
    console.warn('Could not find the code pattern to patch in metro-config.');
  }
} else {
  console.error('Could not find metro-config loadConfig.js file.');
}

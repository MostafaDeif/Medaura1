const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (file.endsWith('.ts') || file.endsWith('.tsx')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk(path.join(__dirname, 'app', 'api'));
let count = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Replace parseInt(varId) or parseInt(varId, 10) or parseInt(varId as string)
    // Only if var ends with 'Id' or is exactly 'id'
    content = content.replace(/parseInt\s*\(\s*([a-zA-Z0-9_]*(?:[iI]d))\s*(?:,\s*10\s*)?\)/g, '$1');
    content = content.replace(/parseInt\s*\(\s*([a-zA-Z0-9_]*(?:[iI]d))\s*as\s*string\s*(?:,\s*10\s*)?\)/g, '$1 as string');

    if (content !== original) {
        fs.writeFileSync(file, content);
        count++;
        console.log('Fixed', file);
    }
});

console.log('Fixed API route files:', count);

// Now fix lib/api
const libFiles = walk(path.join(__dirname, 'lib', 'api'));
let libCount = 0;
libFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    
    // Replace parameter types: `id: number` -> `id: number | string`
    content = content.replace(/([a-zA-Z0-9_]+Id):\s*number\b/g, '$1: string | number');
    // Also exact `id: number`
    content = content.replace(/\bid:\s*number\b/g, 'id: string | number');

    if (content !== original) {
        fs.writeFileSync(file, content);
        libCount++;
        console.log('Fixed', file);
    }
});

console.log('Fixed lib API files:', libCount);

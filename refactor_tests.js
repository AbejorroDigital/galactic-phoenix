
import fs from 'fs';
import path from 'path';

const testDir = path.join(process.cwd(), 'test');
const files = fs.readdirSync(testDir).filter(f => f.endsWith('.test.js'));

files.forEach(file => {
    const filePath = path.join(testDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    let original = content;

    // Replace ../entities/ with ../src/entities/
    content = content.replace(/from\s+['"]\.\.\/entities\//g, (match) => match.replace('../entities/', '../src/entities/'));
    content = content.replace(/import\(['"]\.\.\/entities\//g, (match) => match.replace('../entities/', '../src/entities/'));

    // ../managers/
    content = content.replace(/from\s+['"]\.\.\/managers\//g, (match) => match.replace('../managers/', '../src/managers/'));
    content = content.replace(/import\(['"]\.\.\/managers\//g, (match) => match.replace('../managers/', '../src/managers/'));

    // ../scenes/
    content = content.replace(/from\s+['"]\.\.\/scenes\//g, (match) => match.replace('../scenes/', '../src/scenes/'));
    content = content.replace(/import\(['"]\.\.\/scenes\//g, (match) => match.replace('../scenes/', '../src/scenes/'));

    // Check if double src (e.g. src/src) occurred
    content = content.replace(/src\/src\//g, 'src/');

    if (content !== original) {
        fs.writeFileSync(filePath, content);
        console.log(`Updated imports in ${file}`);
    } else {
        console.log(`No changes needed for ${file}`);
    }
});

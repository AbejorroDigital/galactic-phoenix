
import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const srcDir = path.join(rootDir, 'src');

const moves = [
    { src: 'entities', dest: 'src/entities' },
    { src: 'managers', dest: 'src/managers' },
    { src: 'utilidades', dest: 'src/utils' }
];

function moveFiles(source, destination) {
    if (!fs.existsSync(source)) {
        console.log(`Source ${source} does not exist. Skipping.`);
        return;
    }

    if (!fs.existsSync(destination)) {
        console.log(`Creating ${destination}...`);
        fs.mkdirSync(destination, { recursive: true });
    }

    const files = fs.readdirSync(source);
    files.forEach(file => {
        const srcPath = path.join(source, file);
        const destPath = path.join(destination, file);

        // Always overwrite to ensure we get the latest file with fixes
        console.log(`Moving ${file} to ${destination}...`);
        try {
            fs.cpSync(srcPath, destPath, { force: true, recursive: true });
            // fs.renameSync(srcPath, destPath); // Rename might fail across partitions or if locked, copy+delete is safer
        } catch (e) {
            console.error(`Failed to move ${file}: ${e.message}`);
        }
    });

    // Try to remove source directory
    try {
        fs.rmSync(source, { recursive: true, force: true });
        console.log(`Removed ${source}`);
    } catch (e) {
        console.warn(`Could not remove ${source}: ${e.message}`);
    }
}

console.log('Starting cleanup...');
moves.forEach(m => moveFiles(path.join(rootDir, m.src), path.join(rootDir, m.dest)));
console.log('Cleanup complete.');

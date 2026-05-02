#!/usr/bin/env node

/**
 * Script to copy static files to dist folder
 * Usage: node scripts/copy-static.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

// Directories and files to copy
const itemsToCopy = [
    { src: 'public', dest: 'public', type: 'dir' },
    { src: 'public-test', dest: 'public-test', type: 'dir' },
];

/**
 * Copy directory recursively
 */
function copyDirectory(src, dest) {
    // Create destination directory if it doesn't exist
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    // Read all files and directories in source
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            // Recursively copy subdirectory
            copyDirectory(srcPath, destPath);
        } else {
            // Copy file
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

/**
 * Copy file
 */
function copyFile(src, dest) {
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(src, dest);
}

/**
 * Main function
 */
function main() {
    try {
        console.log('📦 Copying static files to dist...\n');

        // Ensure dist directory exists
        if (!fs.existsSync(distDir)) {
            fs.mkdirSync(distDir, { recursive: true });
        }

        let copiedCount = 0;

        for (const item of itemsToCopy) {
            const srcPath = path.join(rootDir, item.src);
            const destPath = path.join(distDir, item.dest);

            // Check if source exists
            if (!fs.existsSync(srcPath)) {
                console.log(`⚠️  Skipped: ${item.src} (not found)`);
                continue;
            }

            if (item.type === 'dir') {
                copyDirectory(srcPath, destPath);
                console.log(`✓ Copied directory: ${item.src} → dist/${item.dest}`);
            } else {
                copyFile(srcPath, destPath);
                console.log(`✓ Copied file: ${item.src} → dist/${item.dest}`);
            }

            copiedCount++;
        }

        console.log(`\n✓ Successfully copied ${copiedCount} item(s) to dist/`);
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : String(error);
        console.error('✗ Error copying files:', errorMessage);
        process.exit(1);
    }
}

main();


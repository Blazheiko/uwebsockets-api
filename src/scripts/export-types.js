#!/usr/bin/env node

/**
 * Script to export TypeScript types to frontend
 * Usage: node scripts/export-types.js [destination]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Source file (new location in controllers)
const sourceFile = path.join(
    __dirname,
    '../app/controllers/http/types/index.d.ts',
);

// Default destination (can be overridden via CLI argument)
const defaultDestination = path.join(
    __dirname,
    '../frontend/src/types/api-responses.d.ts',
);
const destination = process.argv[2] || defaultDestination;

try {
    // Ensure destination directory exists
    const destDir = path.dirname(destination);
    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
        console.log(`✓ Created directory: ${destDir}`);
    }

    // Read source file
    const content = fs.readFileSync(sourceFile, 'utf-8');

    // Add header comment
    const header = `/**
 * AUTO-GENERATED FILE - DO NOT EDIT
 * Generated from: ${path.relative(path.dirname(destination), sourceFile)}
 * Generated at: ${new Date().toISOString()}
 * 
 * To update this file, run: npm run export-types
 */

`;

    // Write to destination
    fs.writeFileSync(destination, header + content, 'utf-8');

    console.log(`✓ Types exported successfully!`);
    console.log(`  Source: ${sourceFile}`);
    console.log(`  Destination: ${destination}`);
    console.log(`\n  You can now import types in your frontend:`);
    console.log(
        `  import type { InitResponse, LoginResponse } from '#app/controllers/http/types/index.js';\n`,
    );
} catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('✗ Error exporting types:', errorMessage);
    process.exit(1);
}

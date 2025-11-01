# Build Scripts

This directory contains utility scripts for the build process.

## Available Scripts

### copy-static.js

Copies static files and directories to the `dist` folder during the build process.

**Usage:**

```bash
node scripts/copy-static.js
# or
npm run copy:static
```

**What it copies:**

- `public/` → `dist/public/` - Main frontend files (HTML, JS, CSS, icons, audio)
- `public-test/` → `dist/public-test/` - Test frontend files

This script is automatically executed:

- During production build (`npm run build`)
- During development with nodemon (`npm run dev`)

### export-types.js

Exports TypeScript types from backend controllers to frontend.

**Usage:**

```bash
node scripts/export-types.js [destination]
# or
npm run export-types
```

**What it does:**

- Reads types from `app/controllers/http/types/index.d.ts`
- Exports them to `frontend/src/types/api-responses.d.ts` (or custom destination)
- Adds auto-generated header with timestamp

## Development Workflow

When running `npm run dev`:

1. TypeScript compiles `.ts` files to `dist/`
2. Static files are copied to `dist/`
3. Server starts from `dist/index.js`
4. Nodemon watches for changes and repeats the process

When running `npm run build`:

1. TypeScript compiles in production mode
2. Static files are copied to `dist/`

## Configuration

The list of files/directories to copy can be modified in `scripts/copy-static.js`:

```javascript
const itemsToCopy = [
    { src: 'public', dest: 'public', type: 'dir' },
    { src: 'public-test', dest: 'public-test', type: 'dir' },
    // Add more items here as needed
];
```

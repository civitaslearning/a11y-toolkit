#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory of this script
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the compiled main file
const mainFile = join(__dirname, '..', 'dist', 'index.js');

// Import and run the main file
import(mainFile).catch((error) => {
  console.error('Failed to start MCP Accessibility server:', error);
  process.exit(1);
});

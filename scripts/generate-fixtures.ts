/**
 * Conformance Test Fixture Generator
 *
 * Run with: npx ts-node --project tsconfig.json scripts/generate-fixtures.ts
 *
 * Reads all input fixtures from spec/fixtures/, runs them through the layout engine,
 * and writes the expected output alongside each input file.
 */

import * as fs from 'fs';
import * as path from 'path';
import { computeLayout } from '../src/core/layout-engine';

const fixturesDir = path.join(__dirname, '..', 'spec', 'fixtures');

const inputFiles = fs
  .readdirSync(fixturesDir)
  .filter((f) => f.endsWith('.input.json'));

for (const inputFile of inputFiles) {
  const inputPath = path.join(fixturesDir, inputFile);
  const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

  const result = computeLayout(input.data, input.width, input.height);

  const expected = {
    specVersion: input.specVersion || '1.0',
    tolerance: 1.0,
    nodes: result.map((node) => ({
      label: node.label,
      x: Math.round(node.x * 100) / 100,
      y: Math.round(node.y * 100) / 100,
      radius: Math.round(node.radius * 100) / 100,
      fixed: node.fixed,
    })),
  };

  const expectedFile = inputFile.replace('.input.json', '.expected.json');
  const expectedPath = path.join(fixturesDir, expectedFile);

  fs.writeFileSync(expectedPath, JSON.stringify(expected, null, 2) + '\n');
  console.log(`Generated: ${expectedFile} (${expected.nodes.length} nodes)`);
}

console.log('Done! All expected fixtures generated.');

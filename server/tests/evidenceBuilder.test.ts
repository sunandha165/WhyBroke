import { describe, it, expect } from 'vitest';
import { buildEvidence } from '../src/services/regression/EvidenceBuilder';
import { extractFunctions, extractImportedNames } from '../src/utils/extractFunctions';

// ---------------------------------------------------------------------------
// extractFunctions — arrow functions and export const patterns
// ---------------------------------------------------------------------------
describe('extractFunctions', () => {
  it('extracts classic function declarations', () => {
    const src = `function add(a, b) {\n  return a + b;\n}`;
    const result = extractFunctions(src);
    expect(result['add']).toBeDefined();
    expect(result['add']).toContain('return a + b');
  });

  it('extracts arrow functions assigned to const', () => {
    const src = `const calculateTotal = (items) => {\n  return items.reduce((s, i) => s + i.price, 0);\n};`;
    const result = extractFunctions(src);
    expect(result['calculateTotal']).toBeDefined();
    expect(result['calculateTotal']).toContain('reduce');
  });

  it('extracts export const arrow functions', () => {
    const src = `export const calculateOrderTotal = (items) => {\n  return items.reduce((sum, item) => sum + item.qty * item.price, 0);\n};`;
    const result = extractFunctions(src);
    expect(result['calculateOrderTotal']).toBeDefined();
    expect(result['calculateOrderTotal']).toContain('qty');
  });

  it('extracts export function declarations', () => {
    const src = `export function processOrder(order) {\n  return order.total * 1.1;\n}`;
    const result = extractFunctions(src);
    expect(result['processOrder']).toBeDefined();
    expect(result['processOrder']).toContain('1.1');
  });

  it('extracts multiple mixed declarations from one file', () => {
    const src = [
      `export const calculateOrderTotal = (items) => {\n  return items.reduce((s, i) => s + i.price, 0);\n};`,
      `function helper(x) {\n  return x * 2;\n}`,
    ].join('\n');
    const result = extractFunctions(src);
    expect(Object.keys(result)).toContain('calculateOrderTotal');
    expect(Object.keys(result)).toContain('helper');
  });
});

// ---------------------------------------------------------------------------
// extractImportedNames
// ---------------------------------------------------------------------------
describe('extractImportedNames', () => {
  it('extracts named imports', () => {
    const src = `import { calculateOrderTotal } from '../utils/orderTotal';`;
    const names = extractImportedNames(src);
    expect(names.has('calculateOrderTotal')).toBe(true);
  });

  it('extracts multiple named imports', () => {
    const src = `import { foo, bar, baz } from './module';`;
    const names = extractImportedNames(src);
    expect(names.has('foo')).toBe(true);
    expect(names.has('bar')).toBe(true);
    expect(names.has('baz')).toBe(true);
  });

  it('extracts default imports', () => {
    const src = `import myModule from './module';`;
    const names = extractImportedNames(src);
    expect(names.has('myModule')).toBe(true);
  });

  it('extracts aliased named imports using the local name', () => {
    const src = `import { calculateOrderTotal as calcTotal } from './orderTotal';`;
    const names = extractImportedNames(src);
    expect(names.has('calcTotal')).toBe(true);
    expect(names.has('calculateOrderTotal')).toBe(false);
  });

  it('extracts mixed default and named imports', () => {
    const src = `import React, { useState, useEffect } from 'react';`;
    const names = extractImportedNames(src);
    expect(names.has('React')).toBe(true);
    expect(names.has('useState')).toBe(true);
    expect(names.has('useEffect')).toBe(true);
  });

  it('returns an empty set when there are no imports', () => {
    const src = `const x = require('./foo');`;
    const names = extractImportedNames(src);
    expect(names.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// buildEvidence — directlyImported flag and confidence-driving sort
// ---------------------------------------------------------------------------
describe('buildEvidence', () => {
  it('detects a changed function and includes it in the evidence', () => {
    const good = `function formatOrder(order) {\n  return 'str';\n}`;
    const bad = `function formatOrder(order) {\n  return { a: 1 };\n}`;

    const evidence = buildEvidence({
      sourceFiles: ['src/checkout.js'],
      goodFileContents: { 'src/checkout.js': good },
      badFileContents: { 'src/checkout.js': bad },
      testFileContent: 'formatOrder(x)',
    });

    expect(evidence.length).toBe(1);
    expect(evidence[0].functionName).toBe('formatOrder');
    expect(evidence[0].before).toContain("'str'");
    expect(evidence[0].after).toContain('{ a: 1 }');
  });

  it('returns no evidence when nothing changed', () => {
    const src = `function formatOrder(order) {\n  return 'str';\n}`;
    const evidence = buildEvidence({
      sourceFiles: ['src/checkout.js'],
      goodFileContents: { 'src/checkout.js': src },
      badFileContents: { 'src/checkout.js': src },
      testFileContent: 'formatOrder(x)',
    });
    expect(evidence.length).toBe(0);
  });

  it('sorts functions referenced by the failing test first', () => {
    const good = `function untouchedButChanged(a) {\n  return 1;\n}\nfunction formatOrder(order) {\n  return 'str';\n}`;
    const bad = `function untouchedButChanged(a) {\n  return 2;\n}\nfunction formatOrder(order) {\n  return { a: 1 };\n}`;

    const evidence = buildEvidence({
      sourceFiles: ['src/checkout.js'],
      goodFileContents: { 'src/checkout.js': good },
      badFileContents: { 'src/checkout.js': bad },
      testFileContent: 'formatOrder(x)', // does NOT mention untouchedButChanged
    });

    expect(evidence.length).toBe(2);
    expect(evidence[0].functionName).toBe('formatOrder');
  });

  it('sets directlyImported=true for a function named in an ES import statement', () => {
    const good = `export const calculateOrderTotal = (items) => {\n  return items.reduce((s, i) => s + i.qty * i.price, 0);\n};`;
    const bad  = `export const calculateOrderTotal = (items) => {\n  return items.reduce((s, i) => s + i.price, 0);\n};`;
    const testSrc = `import { calculateOrderTotal } from '../utils/orderTotal';\ntest('total', () => { expect(calculateOrderTotal([{price:5,qty:2}])).toBe(10); });`;

    const evidence = buildEvidence({
      sourceFiles: ['utils/orderTotal.js'],
      goodFileContents: { 'utils/orderTotal.js': good },
      badFileContents: { 'utils/orderTotal.js': bad },
      testFileContent: testSrc,
    });

    expect(evidence.length).toBe(1);
    expect(evidence[0].functionName).toBe('calculateOrderTotal');
    expect(evidence[0].directlyImported).toBe(true);
  });

  it('sets directlyImported=false for a changed function not imported by the test', () => {
    const good = `export const internalHelper = (x) => {\n  return x * 2;\n};`;
    const bad  = `export const internalHelper = (x) => {\n  return x * 3;\n};`;
    const testSrc = `import { calculateOrderTotal } from '../utils/orderTotal';\ntest('total', () => {});`;

    const evidence = buildEvidence({
      sourceFiles: ['utils/orderTotal.js'],
      goodFileContents: { 'utils/orderTotal.js': good },
      badFileContents: { 'utils/orderTotal.js': bad },
      testFileContent: testSrc,
    });

    expect(evidence.length).toBe(1);
    expect(evidence[0].directlyImported).toBe(false);
  });

  it('places the directly-imported changed function first when multiple functions changed', () => {
    const good = [
      `export const internalHelper = (x) => {\n  return x * 2;\n};`,
      `export const calculateOrderTotal = (items) => {\n  return items.reduce((s, i) => s + i.qty * i.price, 0);\n};`,
    ].join('\n');
    const bad = [
      `export const internalHelper = (x) => {\n  return x * 3;\n};`,
      `export const calculateOrderTotal = (items) => {\n  return items.reduce((s, i) => s + i.price, 0);\n};`,
    ].join('\n');
    const testSrc = `import { calculateOrderTotal } from '../utils/orderTotal';\ntest('total', () => {});`;

    const evidence = buildEvidence({
      sourceFiles: ['utils/orderTotal.js'],
      goodFileContents: { 'utils/orderTotal.js': good },
      badFileContents: { 'utils/orderTotal.js': bad },
      testFileContent: testSrc,
    });

    expect(evidence.length).toBe(2);
    expect(evidence[0].functionName).toBe('calculateOrderTotal');
    expect(evidence[0].directlyImported).toBe(true);
    expect(evidence[1].directlyImported).toBe(false);
  });
});

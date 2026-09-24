// Turns the single-file build into a page body for a hosted preview page
// (the host wraps it in its own <html>/<head>/<body> skeleton).
// Usage: node scripts/make-preview.mjs  → dist-single/preview.html
import { readFileSync, writeFileSync } from 'node:fs';

const html = readFileSync('dist-single/index.html', 'utf8');

const pick = (re) => [...html.matchAll(re)].map((m) => m[0]);
const title = pick(/<title>[\s\S]*?<\/title>/g);
const styles = pick(/<style[\s\S]*?<\/style>/g);
const scripts = pick(/<script[\s\S]*?<\/script>/g);
// The inlined JS itself contains "<body" strings, so locate the real body tag from the end.
const bodyStart = html.indexOf('>', html.lastIndexOf('<body')) + 1;
const body = html.slice(bodyStart, html.lastIndexOf('</body>'));
const bodyWithoutScripts = body.replace(/<script[\s\S]*?<\/script>/g, '');

if (!title.length || !scripts.length) throw new Error('Unexpected build output shape');

writeFileSync('dist-single/preview.html', [...title, ...styles, bodyWithoutScripts.trim(), ...scripts].join('\n'));
console.log('dist-single/preview.html', (readFileSync('dist-single/preview.html').length / 1024).toFixed(0), 'KB');

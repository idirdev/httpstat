#!/usr/bin/env node
'use strict';

/**
 * @file bin/cli.js
 * @description CLI entry point for httpstat.
 * @author idirdev
 */

const { httpstat, formatReport, formatJson } = require('../src/index.js');

const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log([
    'Usage: httpstat <url> [options]',
    '',
    'Options:',
    '  -X, --method <method>   HTTP method (default: GET)',
    '  -H, --header <header>   Add request header (key:value)',
    '  -d, --data <body>       Request body',
    '  --timeout <ms>          Request timeout in ms (default: 30000)',
    '  -L, --location          Follow redirects',
    '  --max-redirects <n>     Max redirects to follow (default: 10)',
    '  --json                  Output raw JSON result',
    '  -h, --help              Show this help',
  ].join('\n'));
  process.exit(0);
}

const url = args[0];
let method = 'GET';
const headers = {};
let body;
let timeout = 30000;
let followRedirects = false;
let maxRedirects = 10;
let jsonOutput = false;

for (let i = 1; i < args.length; i++) {
  const a = args[i];
  if ((a === '-X' || a === '--method') && args[i + 1]) {
    method = args[++i].toUpperCase();
  } else if ((a === '-H' || a === '--header') && args[i + 1]) {
    const [k, ...rest] = args[++i].split(':');
    headers[k.trim()] = rest.join(':').trim();
  } else if ((a === '-d' || a === '--data') && args[i + 1]) {
    body = args[++i];
  } else if (a === '--timeout' && args[i + 1]) {
    timeout = parseInt(args[++i], 10);
  } else if (a === '-L' || a === '--location') {
    followRedirects = true;
  } else if (a === '--max-redirects' && args[i + 1]) {
    maxRedirects = parseInt(args[++i], 10);
  } else if (a === '--json') {
    jsonOutput = true;
  }
}

httpstat(url, { method, headers, body, timeout, followRedirects, maxRedirects })
  .then((result) => {
    if (jsonOutput) {
      console.log(formatJson(result));
    } else {
      console.log(formatReport(result));
    }
  })
  .catch((err) => {
    console.error('Error:', err.message);
    process.exit(1);
  });

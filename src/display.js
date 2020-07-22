'use strict';

// ANSI helpers (no external deps)
const ANSI = {
  bold: s => '\x1b[1m' + s + '\x1b[0m',
  gray: s => '\x1b[90m' + s + '\x1b[0m',
  cyan: s => '\x1b[36m' + s + '\x1b[0m',
  green: s => '\x1b[32m' + s + '\x1b[0m',
  yellow: s => '\x1b[33m' + s + '\x1b[0m',
  magenta: s => '\x1b[35m' + s + '\x1b[0m',
  blue: s => '\x1b[34m' + s + '\x1b[0m',
};

function renderTimings(result) {
  const t = result.timings;
  const bar = (ms, color, width = 40) => {
    const maxMs = t.total || 1;
    const len = Math.max(1, Math.round((ms / maxMs) * width));
    return color('#'.repeat(len)) + ' ' + formatMs(ms);
  };

  console.log('');
  console.log(ANSI.bold('  HTTP/' + (result.status >= 200 ? '1.1' : '?') + ' ' + result.status));
  console.log(ANSI.gray('  ' + result.url));
  console.log('');
  console.log('  DNS Lookup:       ' + bar(t.dnsLookup, ANSI.cyan));
  console.log('  TCP Connection:   ' + bar(t.tcpConnection, ANSI.green));
  if (t.tlsHandshake > 0) console.log('  TLS Handshake:    ' + bar(t.tlsHandshake, ANSI.yellow));
  console.log('  Server Processing:' + bar(t.serverProcessing, ANSI.magenta));
  console.log('  Content Transfer: ' + bar(t.contentTransfer, ANSI.blue));
  console.log('');
  console.log(ANSI.bold('  Total: ' + formatMs(t.total)));
  console.log(ANSI.gray('  Body: ' + formatBytes(result.bodySize)));
  console.log('');

  const phases = [
    { name: 'namelookup', value: t.namelookup },
    { name: 'connect', value: t.connect },
    { name: 'pretransfer', value: t.pretransfer },
    { name: 'starttransfer', value: t.starttransfer },
    { name: 'total', value: t.total }
  ];
  console.log(ANSI.gray('  Timeline:'));
  phases.forEach(p => console.log(ANSI.gray('    ' + p.name.padEnd(16) + formatMs(p.value))));
  console.log('');
}

function formatMs(ms) {
  if (ms < 1) return ms.toFixed(3) + 'ms';
  if (ms < 1000) return ms.toFixed(1) + 'ms';
  return (ms / 1000).toFixed(2) + 's';
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + 'KB';
  return (bytes / 1048576).toFixed(1) + 'MB';
}

module.exports = { renderTimings, formatMs, formatBytes };

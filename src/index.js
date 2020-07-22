'use strict';

/**
 * @module httpstat
 * @description HTTP request timing breakdown — measures DNS, TCP, TLS, TTFB, transfer.
 * @author idirdev
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

/**
 * Perform an HTTP/HTTPS request and collect timing data for each phase.
 *
 * @param {string} url - Target URL.
 * @param {object} [opts={}] - Request options.
 * @param {string} [opts.method='GET'] - HTTP method.
 * @param {object} [opts.headers={}] - Additional request headers.
 * @param {string|Buffer} [opts.body] - Request body.
 * @param {number} [opts.timeout=30000] - Request timeout in ms.
 * @param {boolean} [opts.followRedirects=true] - Whether to follow redirects.
 * @param {number} [opts.maxRedirects=10] - Maximum number of redirects to follow.
 * @returns {Promise<HttpStatResult>} Timing result object.
 */
async function httpstat(url, opts = {}) {
  const {
    method = 'GET',
    headers = {},
    body,
    timeout = 30000,
    followRedirects = true,
    maxRedirects = 10,
  } = opts;

  const redirects = [];
  let currentUrl = url;
  let redirectCount = 0;

  while (true) {
    const result = await _request(currentUrl, { method, headers, body, timeout });
    const { statusCode } = result;

    const isRedirect = [301, 302, 303, 307, 308].includes(statusCode);
    if (isRedirect && followRedirects && redirectCount < maxRedirects) {
      redirects.push({ url: currentUrl, statusCode, location: result.headers.location });
      currentUrl = new URL(result.headers.location, currentUrl).href;
      redirectCount++;
      continue;
    }

    return {
      url,
      method,
      statusCode,
      headers: result.headers,
      timings: result.timings,
      body: result.body,
      redirects,
      size: Buffer.byteLength(result.body || ''),
    };
  }
}

/**
 * Internal single-request helper.
 *
 * @param {string} rawUrl - URL to request.
 * @param {object} opts - Options (method, headers, body, timeout).
 * @returns {Promise<object>} Raw result with headers, body, timings.
 * @private
 */
function _request(rawUrl, opts) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(rawUrl);
    const lib = parsed.protocol === 'https:' ? https : http;

    const reqOpts = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: opts.method,
      headers: opts.headers || {},
    };

    const t = {
      start: 0,
      dnsStart: 0,
      dnsEnd: 0,
      tcpStart: 0,
      tcpEnd: 0,
      tlsStart: 0,
      tlsEnd: 0,
      firstByte: 0,
      transferEnd: 0,
    };

    t.start = Date.now();

    const req = lib.request(reqOpts, (res) => {
      if (t.firstByte === 0) t.firstByte = Date.now();

      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        t.transferEnd = Date.now();

        const dnsLookup = t.dnsEnd - t.dnsStart;
        const tcpConnection = t.tcpEnd - t.tcpStart;
        const tlsHandshake = t.tlsEnd > 0 ? t.tlsEnd - t.tlsStart : 0;
        const firstByte = t.firstByte - t.start;
        const contentTransfer = t.transferEnd - t.firstByte;
        const total = t.transferEnd - t.start;

        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks).toString(),
          timings: {
            dnsLookup: Math.max(0, dnsLookup),
            tcpConnection: Math.max(0, tcpConnection),
            tlsHandshake: Math.max(0, tlsHandshake),
            firstByte: Math.max(0, firstByte),
            contentTransfer: Math.max(0, contentTransfer),
            total: Math.max(0, total),
          },
        });
      });
    });

    req.on('socket', (socket) => {
      t.dnsStart = Date.now();

      socket.on('lookup', () => {
        t.dnsEnd = Date.now();
        t.tcpStart = t.dnsEnd;
      });

      socket.on('connect', () => {
        t.tcpEnd = Date.now();
        if (t.tcpStart === 0) t.tcpStart = t.start;
      });

      socket.on('secureConnect', () => {
        if (t.tlsStart === 0) t.tlsStart = t.tcpEnd || t.start;
        t.tlsEnd = Date.now();
      });
    });

    req.setTimeout(opts.timeout, () => {
      req.destroy(new Error(`Request timed out after ${opts.timeout}ms`));
    });

    req.on('error', reject);

    if (opts.body) req.write(opts.body);
    req.end();
  });
}

/**
 * Format an httpstat result as an ASCII timing report.
 *
 * @param {HttpStatResult} result - Result from httpstat().
 * @returns {string} ASCII formatted report.
 */
function formatReport(result) {
  const { url, method, statusCode, timings, size, redirects } = result;
  const lines = [];

  lines.push(`\nURL:    ${url}`);
  lines.push(`Method: ${method}`);
  lines.push(`Status: ${statusCode}`);
  if (redirects.length > 0) {
    lines.push(`Redirects: ${redirects.length}`);
  }
  lines.push(`Size:   ${size} bytes\n`);

  const bar = (ms, maxMs) => {
    const width = 40;
    const filled = maxMs > 0 ? Math.round((ms / maxMs) * width) : 0;
    return '[' + '█'.repeat(filled) + '░'.repeat(Math.max(0, width - filled)) + ']';
  };

  const max = timings.total || 1;
  const phases = [
    ['DNS Lookup    ', timings.dnsLookup],
    ['TCP Connection', timings.tcpConnection],
    ['TLS Handshake ', timings.tlsHandshake],
    ['Time to 1st B ', timings.firstByte],
    ['Content Xfer  ', timings.contentTransfer],
  ];

  for (const [label, ms] of phases) {
    if (ms > 0 || label.includes('Lookup') || label.includes('TCP') || label.includes('1st')) {
      lines.push(`  ${label}  ${bar(ms, max)}  ${ms}ms`);
    }
  }

  lines.push(`\n  Total         ${' '.repeat(42)}${timings.total}ms\n`);
  return lines.join('\n');
}

/**
 * Format an httpstat result as a JSON string.
 *
 * @param {HttpStatResult} result - Result from httpstat().
 * @returns {string} JSON formatted string.
 */
function formatJson(result) {
  return JSON.stringify(result, null, 2);
}

/**
 * @typedef {object} HttpStatResult
 * @property {string} url - Original URL.
 * @property {string} method - HTTP method used.
 * @property {number} statusCode - HTTP status code.
 * @property {object} headers - Response headers.
 * @property {object} timings - Timing breakdown in ms.
 * @property {number} timings.dnsLookup - DNS resolution time.
 * @property {number} timings.tcpConnection - TCP connection time.
 * @property {number} timings.tlsHandshake - TLS handshake time (HTTPS only).
 * @property {number} timings.firstByte - Time to first byte.
 * @property {number} timings.contentTransfer - Content transfer time.
 * @property {number} timings.total - Total elapsed time.
 * @property {string} body - Response body.
 * @property {object[]} redirects - List of redirect hops.
 * @property {number} size - Response body size in bytes.
 */

module.exports = { httpstat, formatReport, formatJson };

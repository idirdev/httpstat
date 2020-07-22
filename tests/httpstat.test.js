'use strict';

/**
 * @file tests/httpstat.test.js
 * @description Tests for the httpstat module.
 * @author idirdev
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { httpstat, formatReport, formatJson } = require('../src/index.js');

/** Creates a simple local HTTP server for testing. */
function createTestServer(handler) {
  const server = http.createServer(handler);
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, port: server.address().port });
    });
  });
}

test('httpstat returns correct shape for a 200 response', async () => {
  const { server, port } = await createTestServer((req, res) => {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('hello');
  });

  try {
    const result = await httpstat(`http://127.0.0.1:${port}/`);
    assert.equal(result.statusCode, 200);
    assert.equal(typeof result.url, 'string');
    assert.equal(typeof result.method, 'string');
    assert.ok(result.headers);
    assert.ok(result.timings);
    assert.equal(result.body, 'hello');
    assert.ok(Array.isArray(result.redirects));
    assert.equal(typeof result.size, 'number');
  } finally {
    server.close();
  }
});

test('timings are all non-negative numbers', async () => {
  const { server, port } = await createTestServer((req, res) => {
    res.writeHead(200);
    res.end('ok');
  });

  try {
    const result = await httpstat(`http://127.0.0.1:${port}/`);
    const t = result.timings;
    for (const key of ['dnsLookup', 'tcpConnection', 'tlsHandshake', 'firstByte', 'contentTransfer', 'total']) {
      assert.equal(typeof t[key], 'number', `${key} should be a number`);
      assert.ok(t[key] >= 0, `${key} should be >= 0`);
    }
  } finally {
    server.close();
  }
});

test('total timing is positive', async () => {
  const { server, port } = await createTestServer((req, res) => {
    res.writeHead(200);
    res.end('data');
  });

  try {
    const result = await httpstat(`http://127.0.0.1:${port}/`);
    assert.ok(result.timings.total > 0, 'total should be positive');
  } finally {
    server.close();
  }
});

test('POST method is used correctly', async () => {
  const { server, port } = await createTestServer((req, res) => {
    assert.equal(req.method, 'POST');
    res.writeHead(201);
    res.end('created');
  });

  try {
    const result = await httpstat(`http://127.0.0.1:${port}/`, {
      method: 'POST',
      body: JSON.stringify({ test: true }),
      headers: { 'content-type': 'application/json' },
    });
    assert.equal(result.statusCode, 201);
    assert.equal(result.method, 'POST');
  } finally {
    server.close();
  }
});

test('redirect following works', async () => {
  const { server, port } = await createTestServer((req, res) => {
    if (req.url === '/start') {
      res.writeHead(302, { location: '/end' });
      res.end();
    } else {
      res.writeHead(200);
      res.end('final');
    }
  });

  try {
    const result = await httpstat(`http://127.0.0.1:${port}/start`, { followRedirects: true });
    assert.equal(result.statusCode, 200);
    assert.equal(result.redirects.length, 1);
    assert.equal(result.redirects[0].statusCode, 302);
  } finally {
    server.close();
  }
});

test('redirect NOT followed when followRedirects=false', async () => {
  const { server, port } = await createTestServer((req, res) => {
    res.writeHead(302, { location: '/other' });
    res.end();
  });

  try {
    const result = await httpstat(`http://127.0.0.1:${port}/`, { followRedirects: false });
    assert.equal(result.statusCode, 302);
    assert.equal(result.redirects.length, 0);
  } finally {
    server.close();
  }
});

test('size reflects body byte length', async () => {
  const body = 'hello world';
  const { server, port } = await createTestServer((req, res) => {
    res.writeHead(200);
    res.end(body);
  });

  try {
    const result = await httpstat(`http://127.0.0.1:${port}/`);
    assert.equal(result.size, Buffer.byteLength(body));
  } finally {
    server.close();
  }
});

test('formatReport returns a non-empty string', async () => {
  const { server, port } = await createTestServer((req, res) => {
    res.writeHead(200);
    res.end('ok');
  });

  try {
    const result = await httpstat(`http://127.0.0.1:${port}/`);
    const report = formatReport(result);
    assert.equal(typeof report, 'string');
    assert.ok(report.length > 0);
    assert.ok(report.includes('Status'));
  } finally {
    server.close();
  }
});

test('formatJson returns valid JSON', async () => {
  const { server, port } = await createTestServer((req, res) => {
    res.writeHead(200);
    res.end('ok');
  });

  try {
    const result = await httpstat(`http://127.0.0.1:${port}/`);
    const json = formatJson(result);
    const parsed = JSON.parse(json);
    assert.equal(parsed.statusCode, 200);
  } finally {
    server.close();
  }
});

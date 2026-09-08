'use strict';

const assert = require('node:assert/strict');
const http = require('node:http');
const net = require('node:net');
const { createFixtureServer, stopFixtureServer } = require('./server');

const HOST = '127.0.0.1';

function listenEphemeral(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, HOST, () => {
      server.removeListener('error', reject);
      resolve(server.address().port);
    });
  });
}

function request(port, pathname, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: HOST, port, path: pathname, method },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks).toString('utf8'),
          });
        });
      }
    );
    req.once('error', reject);
    req.end();
  });
}

function openIncompleteRequest(port) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: HOST, port }, () => {
      socket.write('GET /health HTTP/1.1\r\nHost: fixture\r\n');
      resolve(socket);
    });
    socket.once('error', reject);
  });
}

function withTimeout(promise, timeoutMs, message) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

(async () => {
  const server = createFixtureServer();
  let lingeringSocket;
  try {
    const port = await listenEphemeral(server);

    const health = await request(port, '/health');
    assert.equal(health.status, 200);
    assert.deepEqual(JSON.parse(health.body), { status: 'ok' });
    assert.match(health.headers['content-type'], /^application\/json/);

    for (const response of [health, await request(port, '/'), await request(port, '/missing')]) {
      assert.equal(response.headers['cache-control'], 'no-store');
      assert.equal(response.headers['x-content-type-options'], 'nosniff');
      assert.equal(response.headers['referrer-policy'], 'no-referrer');
      assert.equal(
        response.headers['permissions-policy'],
        'camera=(), geolocation=(), microphone=()'
      );
    }

    const login = await request(port, '/');
    assert.equal(login.status, 200);
    assert.match(login.body, /data-test="login-button"/);

    const capability = await request(port, '/capabilities.html');
    assert.equal(capability.status, 200);
    assert.match(capability.body, /data-test="load-profile"/);
    assert.match(capability.body, /data-test="start-timer"/);

    const profile = await request(port, '/api/profile');
    assert.equal(profile.status, 200);
    assert.deepEqual(JSON.parse(profile.body), { id: 1, name: 'fixture-profile' });

    const missing = await request(port, '/missing');
    assert.equal(missing.status, 404);
    assert.equal(missing.body, 'Not Found');

    const rejectedMethod = await request(port, '/health', 'POST');
    assert.equal(rejectedMethod.status, 405);
    assert.equal(rejectedMethod.body, 'Method Not Allowed');

    lingeringSocket = await openIncompleteRequest(port);
    lingeringSocket.removeAllListeners('error');
    lingeringSocket.on('error', () => {});
    await withTimeout(
      stopFixtureServer(server),
      1000,
      'fixture shutdown must not hang on a lingering browser/network connection'
    );
    assert.equal(server.listening, false);

    console.log('Cypress fixture server contract: ok');
  } finally {
    lingeringSocket?.destroy();
    await stopFixtureServer(server);
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

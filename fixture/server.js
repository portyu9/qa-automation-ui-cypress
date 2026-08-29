'use strict';

const http = require('node:http');

const HOST = '127.0.0.1';
const PORT = 3100;
const DEFAULT_FIXTURE_URL = `http://${HOST}:${PORT}`;

const loginPage = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Authentication Fixture</title>
</head>
<body>
  <main>
    <h1>Authentication Fixture</h1>
    <form id="login-form">
      <label for="user-name">Username</label>
      <input id="user-name" data-test="username" autocomplete="username">
      <label for="password">Password</label>
      <input id="password" data-test="password" type="password" autocomplete="current-password">
      <button id="login-button" data-test="login-button" type="submit">Sign in</button>
      <p data-test="error" role="alert" hidden></p>
    </form>
  </main>
  <script>
    document.getElementById('login-form').addEventListener('submit', (event) => {
      event.preventDefault();
      const username = document.getElementById('user-name').value;
      const password = document.getElementById('password').value;
      const error = document.querySelector('[data-test="error"]');
      if (username === 'standard_user' && password === 'secret_sauce') {
        window.location.assign('/inventory.html');
        return;
      }
      error.textContent = 'Invalid username or password';
      error.hidden = false;
    });
  </script>
</body>
</html>`;

const inventoryPage = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Inventory Fixture</title>
</head>
<body>
  <main id="inventory_container">
    <h1>Inventory Fixture</h1>
    <button id="react-burger-menu-btn" type="button">Menu</button>
    <a id="logout_sidebar_link" href="/">Sign out</a>
    <section aria-label="Inventory">
      <article data-test="inventory-item"><h2>Fixture Item A</h2></article>
      <article data-test="inventory-item"><h2>Fixture Item B</h2></article>
    </section>
  </main>
</body>
</html>`;

function respond(res, status, contentType, body) {
  res.writeHead(status, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(body);
}

function createFixtureServer() {
  return http.createServer((req, res) => {
    if (req.method !== 'GET') {
      respond(res, 405, 'text/plain; charset=utf-8', 'Method Not Allowed');
      return;
    }

    const requestUrl = new URL(req.url, DEFAULT_FIXTURE_URL);
    if (requestUrl.pathname === '/health') {
      respond(res, 200, 'application/json; charset=utf-8', JSON.stringify({ status: 'ok' }));
      return;
    }
    if (requestUrl.pathname === '/') {
      respond(res, 200, 'text/html; charset=utf-8', loginPage);
      return;
    }
    if (requestUrl.pathname === '/inventory.html') {
      respond(res, 200, 'text/html; charset=utf-8', inventoryPage);
      return;
    }
    respond(res, 404, 'text/plain; charset=utf-8', 'Not Found');
  });
}

function startFixtureServer() {
  const server = createFixtureServer();
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(PORT, HOST, () => {
      server.removeListener('error', reject);
      resolve(server);
    });
  });
}

function stopFixtureServer(server) {
  if (!server?.listening) return Promise.resolve();
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

if (require.main === module) {
  startFixtureServer()
    .then(() => console.log(`Local fixture listening on ${DEFAULT_FIXTURE_URL}`))
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}

module.exports = {
  DEFAULT_FIXTURE_URL,
  createFixtureServer,
  startFixtureServer,
  stopFixtureServer,
};

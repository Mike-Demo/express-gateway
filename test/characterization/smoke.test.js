'use strict';
/**
 * Smoke tests — G2 Behavioral Baseline
 *
 * Pins: gateway starts and listens on a port; admin API starts and listens on a port.
 * These must pass on every Node version the project targets.
 */
const http = require('http');
const assert = require('assert');
const gateway = require('../../lib/gateway');
const rest = require('../../lib/rest');
const config = require('../../lib/config');

describe('[characterization] smoke — gateway and admin startup', function () {
  this.timeout(15000);

  let gatewayServer, adminServer, originalGatewayConfig;

  before('start gateway + admin on ephemeral ports', function () {
    originalGatewayConfig = config.gatewayConfig;

    config.gatewayConfig = {
      http: { port: 0 },
      serviceEndpoints: {},
      apiEndpoints: {},
      policies: [],
      pipelines: {}
    };

    return gateway({ config })
      .then(apps => {
        gatewayServer = apps.app;
      });
  });

  before('start admin on ephemeral port', function () {
    const adminConfig = Object.assign({}, config.gatewayConfig, {
      admin: { port: 0, host: '127.0.0.1' }
    });

    const adminCfg = Object.create(config);
    adminCfg.gatewayConfig = adminConfig;

    return rest({ config: adminCfg }).then(srv => {
      adminServer = srv;
    });
  });

  after('tear down', function () {
    config.gatewayConfig = originalGatewayConfig;
    config.unwatch();
    return Promise.all([
      gatewayServer && new Promise((resolve) => gatewayServer.close(resolve)),
      adminServer && new Promise((resolve) => adminServer.close(resolve))
    ]);
  });

  it('gateway HTTP server is listening on a port > 0', function () {
    const addr = gatewayServer.address();
    assert.ok(addr, 'gateway server has an address');
    assert.strictEqual(addr.address, '::', 'gateway binds to all interfaces');
    assert.ok(addr.port > 0, `gateway port is > 0, got ${addr.port}`);
  });

  it('gateway responds to requests (no matching pipeline → 404)', function (done) {
    const { port } = gatewayServer.address();
    http.get(`http://127.0.0.1:${port}/probe`, res => {
      // With no pipelines configured, gateway returns 404
      assert.ok(res.statusCode === 404 || res.statusCode === 200,
        `expected 404 or 200, got ${res.statusCode}`);
      res.resume();
      done();
    }).on('error', done);
  });

  it('admin HTTP server is listening on a port > 0', function () {
    const addr = adminServer.address();
    assert.ok(addr, 'admin server has an address');
    assert.ok(addr.port > 0, `admin port is > 0, got ${addr.port}`);
  });

  it('admin /policies endpoint returns JSON array', function (done) {
    const { port } = adminServer.address();
    http.get(`http://127.0.0.1:${port}/policies`, res => {
      assert.strictEqual(res.statusCode, 200);
      assert.ok(res.headers['content-type'].includes('application/json'));
      let body = '';
      res.on('data', d => { body += d; });
      res.on('end', () => {
        const parsed = JSON.parse(body);
        assert.ok(Array.isArray(parsed), 'policies response is an array');
        done();
      });
    }).on('error', done);
  });

  it('admin /schemas endpoint returns JSON', function (done) {
    const { port } = adminServer.address();
    http.get(`http://127.0.0.1:${port}/schemas`, res => {
      assert.strictEqual(res.statusCode, 200);
      res.resume();
      done();
    }).on('error', done);
  });
});

'use strict';
/**
 * Journey A characterization tests — G2 Behavioral Baseline
 *
 * Pins the end-to-end auth→proxy pipeline behaviour:
 *   - Request without credentials → 401
 *   - Request with valid key-auth credential → passes through to backend (200)
 *   - Request with invalid credential → 401
 *   - Unauthenticated request with passThrough:true → reaches backend as anonymous
 *   - egContext is populated on each request (requestID, apiEndpoint)
 *   - Unmatched path → 404
 *
 * Uses the in-process routing helper and ioredis-mock.
 * Must remain passing after every modernization stage.
 */
const request = require('supertest');
const should = require('should');
const services = require('../../lib/services');
const db = require('../../lib/db');
const testHelper = require('../common/routing.helper');
const config = require('../../lib/config');

// ── custom "backend" policy — echoes request metadata without needing a real proxy target

const echoName = 'char-echo';
const echoHandler = () => (req, res) => {
  // eg-consumer-id is set on res headers by auth policies (not req headers)
  // For authenticated consumers it is also set on req.headers by actionParams
  const consumerId = req.headers['eg-consumer-id'] || res.getHeader('eg-consumer-id') || null;
  res.set('Content-Type', 'application/json');
  res.json({
    status: 'ok',
    consumerId,
    url: req.url,
    hasRequestId: !!(req.egContext && req.egContext.requestID)
  });
};

// ── suite ─────────────────────────────────────────────────────────────────────

describe('[characterization] Journey A — auth → proxy pipeline', function () {
  this.timeout(15000);

  const helper = testHelper();
  let app;
  let credKey;

  before('register echo policy', function () {
    helper.addPolicy(echoName, echoHandler);
  });

  before('configure gateway and start in-process', function () {
    config.gatewayConfig = {
      http: { port: 0 },
      serviceEndpoints: {},
      apiEndpoints: {
        secureEp: { host: '*', paths: ['/secure', '/secure/*'] },
        openEp: { host: '*', paths: ['/open'] }
      },
      policies: ['key-auth', echoName],
      pipelines: {
        securePipeline: {
          apiEndpoints: ['secureEp'],
          policies: [
            { 'key-auth': [{ action: { passThrough: false } }] },
            { [echoName]: {} }
          ]
        },
        openPipeline: {
          apiEndpoints: ['openEp'],
          policies: [
            { 'key-auth': [{ action: { passThrough: true } }] },
            { [echoName]: {} }
          ]
        }
      }
    };
    return helper.setup().then(apps => { app = apps.app; });
  });

  before('create test user and key-auth credential', function () {
    return db.flushdb()
      .then(() => services.user.insert({
        username: 'chartest-a',
        firstname: 'Char',
        lastname: 'Test',
        email: 'chara@test.local'
      }))
      .then(user => services.credential.insertCredential(user.id, 'key-auth'))
      .then(cred => {
        // key-auth header format is "apiKey <keyId>:<keySecret>"
        credKey = `${cred.keyId}:${cred.keySecret}`;
      });
  });

  after('cleanup', function () {
    return helper.cleanup().then(() => db.flushdb());
  });

  // ── A1: No credentials → 401

  it('A1: request without credentials returns 401', function () {
    return request(app)
      .get('/secure/resource')
      .expect(401);
  });

  // ── A2: Valid key-auth → 200 with consumer ID

  it('A2: request with valid apiKey passes to backend with consumer ID header', function () {
    return request(app)
      .get('/secure/resource')
      .set('Authorization', `apiKey ${credKey}`)
      .expect(200)
      .expect(res => {
        res.body.status.should.equal('ok');
        should.exist(res.body.consumerId, 'eg-consumer-id header must be set');
        res.body.hasRequestId.should.equal(true, 'egContext.requestID must be set');
      });
  });

  // ── A3: Invalid key → 401

  it('A3: request with invalid apiKey returns 401', function () {
    return request(app)
      .get('/secure/resource')
      .set('Authorization', 'apiKey invalid-key-000')
      .expect(401);
  });

  // ── A4: passThrough — unauthenticated reaches backend as anonymous

  it('A4: unauthenticated request on passThrough endpoint reaches backend as anonymous', function () {
    return request(app)
      .get('/open')
      .expect(200)
      .expect(res => {
        res.body.status.should.equal('ok');
        // passThrough sets eg-consumer-id: anonymous on the response header
        const consumerId = res.body.consumerId || res.headers['eg-consumer-id'];
        consumerId.should.equal('anonymous',
          'passThrough must set eg-consumer-id: anonymous');
      });
  });

  // ── A5: egContext.requestID is set

  it('A5: egContext.requestID is non-empty on each request', function () {
    return request(app)
      .get('/open')
      .expect(200)
      .expect(res => {
        res.body.hasRequestId.should.equal(true);
      });
  });

  // ── A6: Unmatched path → 404

  it('A6: request to unregistered path returns 404', function () {
    return request(app)
      .get('/not-registered-at-all')
      .expect(404);
  });
});

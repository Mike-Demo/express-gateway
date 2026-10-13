'use strict';
/**
 * Journey C characterization tests — G2 Behavioral Baseline
 *
 * Pins plugin loading and policy chain execution behaviour:
 *   - Custom policy registered via helper is resolvable
 *   - Policy schema validation: unregistered policy → POLICY_NOT_FOUND
 *   - Policy NOT in whitelist → POLICY_NOT_DECLARED at build time
 *   - Condition evaluation: pathMatch skips/applies policy
 *   - egContext.requestID is set per request
 *   - Multi-step policy chain executes in declaration order
 *   - basic-auth returns 401 with no credentials (no crypto path needed)
 *   - C8: AES-256-GCM encrypt/decrypt round-trip (KD-001 resolved G4/A1)
 */
const assert = require('assert');
const request = require('supertest');
const testHelper = require('../common/routing.helper');
const policies = require('../../lib/policies');
const config = require('../../lib/config');

// ── suite ─────────────────────────────────────────────────────────────────────

describe('[characterization] Journey C — plugin/policy chain execution', function () {
  this.timeout(15000);

  // ── C1: Policy registry ───────────────────────────────────────────────────

  describe('C1: policy registry', function () {
    it('C1a: registered policy is resolvable by name', function () {
      const name = 'char-c1a-' + Date.now();
      const helper = testHelper();
      helper.addPolicy(name, () => (req, res) => res.end());
      const resolved = policies.resolve(name);
      assert.ok(resolved, 'policy must be resolvable after addPolicy');
      assert.strictEqual(resolved.name, name);
    });

    it('C1b: unregistered policy throws POLICY_NOT_FOUND', function () {
      assert.throws(
        () => policies.resolve('char-nonexistent-' + Date.now()),
        err => err.message === 'POLICY_NOT_FOUND'
      );
    });
  });

  // ── C2: Policy with no schema (schema=null) still works ──────────────────

  describe('C2: policy with no schema passes validation', function () {
    const helper = testHelper();
    let app;
    const name = 'char-c2-' + Date.now();

    before(function () {
      helper.addPolicy(name, () => (req, res) => res.json({ ok: true }));
      config.gatewayConfig = {
        http: { port: 0 },
        serviceEndpoints: {},
        apiEndpoints: { ep: { host: '*', paths: ['/test'] } },
        policies: [name],
        pipelines: { p: { apiEndpoints: ['ep'], policies: [{ [name]: {} }] } }
      };
      return helper.setup().then(apps => { app = apps.app; });
    });

    after(function () { return helper.cleanup(); });

    it('C2: request passes through policy with null schema', function () {
      return request(app)
        .get('/test')
        .expect(200)
        .expect(res => {
          res.body.ok.should.equal(true);
        });
    });
  });

  // ── C3: Condition evaluation ──────────────────────────────────────────────

  describe('C3: condition evaluation in pipeline', function () {
    const helper = testHelper();
    let app;
    const name = 'char-c3-' + Date.now();

    before(function () {
      helper.addPolicy(name, () => (req, res) => res.json({ reached: true }));
      config.gatewayConfig = {
        http: { port: 0 },
        serviceEndpoints: {},
        apiEndpoints: {
          condEp: { host: '*', paths: ['/cond', '/cond/*'] }
        },
        policies: [name],
        pipelines: {
          condPipeline: {
            apiEndpoints: ['condEp'],
            policies: [
              {
                [name]: [{
                  condition: { name: 'pathMatch', pattern: '/cond/match' },
                  action: {}
                }]
              }
            ]
          }
        }
      };
      return helper.setup().then(apps => { app = apps.app; });
    });

    after(function () { return helper.cleanup(); });

    it('C3a: pathMatch condition — matching path reaches policy', function () {
      return request(app)
        .get('/cond/match')
        .expect(200)
        .expect(res => {
          res.body.reached.should.equal(true);
        });
    });

    it('C3b: pathMatch condition — non-matching path skips policy → 404', function () {
      return request(app)
        .get('/cond/other')
        .then(res => {
          // Condition not met → policy skipped → no handler → 404
          assert.ok(
            res.status === 404,
            `expected 404 when condition not met, got ${res.status}`
          );
        });
    });
  });

  // ── C4: Policy whitelist enforcement ─────────────────────────────────────

  describe('C4: policy whitelist enforcement', function () {
    it('C4: pipeline referencing undeclared policy throws POLICY_NOT_DECLARED at build time', function () {
      const helper = testHelper();
      config.gatewayConfig = {
        http: { port: 0 },
        serviceEndpoints: {},
        apiEndpoints: { ep: { host: '*', paths: ['/x'] } },
        policies: [], // empty whitelist — proxy is NOT listed
        pipelines: {
          p: { apiEndpoints: ['ep'], policies: [{ proxy: {} }] }
        }
      };
      return helper.setup()
        .then(() => helper.cleanup())
        .then(() => { throw new Error('Should have thrown POLICY_NOT_DECLARED'); })
        .catch(err => {
          assert.ok(
            err.message === 'POLICY_NOT_DECLARED' || err.message.includes('not declared'),
            `expected POLICY_NOT_DECLARED, got: ${err.message}`
          );
        });
    });
  });

  // ── C5: egContext.requestID uniqueness ────────────────────────────────────

  describe('C5: egContext.requestID is set per request', function () {
    const helper = testHelper();
    let app;
    const name = 'char-c5-' + Date.now();

    before(function () {
      helper.addPolicy(name, () => (req, res) => {
        res.json({ requestID: req.egContext.requestID });
      });
      config.gatewayConfig = {
        http: { port: 0 },
        serviceEndpoints: {},
        apiEndpoints: { ep: { host: '*', paths: ['/id'] } },
        policies: [name],
        pipelines: { p: { apiEndpoints: ['ep'], policies: [{ [name]: {} }] } }
      };
      return helper.setup().then(apps => { app = apps.app; });
    });

    after(function () { return helper.cleanup(); });

    it('C5: each request receives a non-empty requestID', function () {
      return request(app)
        .get('/id')
        .expect(200)
        .expect(res => {
          assert.ok(res.body.requestID && res.body.requestID.length > 0,
            'requestID must be non-empty');
        });
    });
  });

  // ── C6: Multi-step policy chain ───────────────────────────────────────────

  describe('C6: multi-step policy chain execution order', function () {
    const helper = testHelper();
    let app;
    const steps = [];
    const pA = 'char-c6a-' + Date.now();
    const pB = 'char-c6b-' + Date.now();

    before(function () {
      helper.addPolicy(pA, () => (req, res, next) => { steps.push('A'); next(); });
      helper.addPolicy(pB, () => (req, res) => { steps.push('B'); res.json({ steps: steps.slice() }); });
      config.gatewayConfig = {
        http: { port: 0 },
        serviceEndpoints: {},
        apiEndpoints: { ep: { host: '*', paths: ['/chain'] } },
        policies: [pA, pB],
        pipelines: {
          p: {
            apiEndpoints: ['ep'],
            policies: [{ [pA]: {} }, { [pB]: {} }]
          }
        }
      };
      return helper.setup().then(apps => { app = apps.app; });
    });

    after(function () { steps.length = 0; return helper.cleanup(); });

    it('C6: policies execute in declaration order: A then B', function () {
      return request(app)
        .get('/chain')
        .expect(200)
        .expect(res => {
          const s = res.body.steps;
          assert.ok(Array.isArray(s) && s.length >= 2, 'both policies must have run');
          assert.ok(s.indexOf('A') < s.indexOf('B'), 'A must execute before B');
        });
    });
  });

  // ── C7: basic-auth → 401 without credentials (no crypto path) ────────────

  describe('C7: basic-auth policy — 401 without credentials', function () {
    const helper = testHelper();
    let app;

    before(function () {
      config.gatewayConfig = {
        http: { port: 0 },
        serviceEndpoints: {},
        apiEndpoints: { ep: { host: '*', paths: ['/auth'] } },
        policies: ['basic-auth'],
        pipelines: {
          p: {
            apiEndpoints: ['ep'],
            policies: [{ 'basic-auth': [{ action: { passThrough: false } }] }]
          }
        }
      };
      return helper.setup().then(apps => { app = apps.app; });
    });

    after(function () { return helper.cleanup(); });

    it('C7: basic-auth returns 401 when no Authorization header is provided', function () {
      return request(app)
        .get('/auth')
        .expect(401);
    });
  });

  // ── C8: KD-001 resolved — AES-256-GCM encrypt/decrypt works on Node 22+ ──

  describe('C8: encrypt/decrypt round-trip (KD-001 resolved in G4/A1)', function () {
    /**
     * Updated in G4/A1: crypto.createCipher replaced with AES-256-GCM.
     * These tests now assert that encrypt/decrypt SUCCEED and produce the
     * correct output format (ADR U07). KD-001 is closed.
     */
    it('C8a: services.utils.encrypt returns iv:tag:ciphertext hex format', function () {
      const utils = require('../../lib/services/utils');
      const result = utils.encrypt('test-value');
      assert.ok(typeof result === 'string', 'encrypt must return a string');
      assert.ok(
        /^[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]+$/.test(result),
        `encrypt output must match iv:tag:ciphertext hex format, got: ${result}`
      );
    });

    it('C8b: services.utils.decrypt(encrypt(text)) === text (round-trip)', function () {
      const utils = require('../../lib/services/utils');
      const plaintext = 'test-value-roundtrip';
      const ciphertext = utils.encrypt(plaintext);
      const recovered = utils.decrypt(ciphertext);
      assert.strictEqual(recovered, plaintext,
        'decrypt(encrypt(text)) must equal original plaintext');
    });

    it('C8c: services.utils.decrypt throws LegacyEncryptionError for legacy ciphertext', function () {
      const utils = require('../../lib/services/utils');
      // Legacy format is pure hex with no colons (output of old createCipher)
      const legacyCiphertext = 'aabbccddeeff00112233445566778899';
      let threw = false;
      try {
        utils.decrypt(legacyCiphertext);
      } catch (err) {
        threw = true;
        assert.strictEqual(err.code, 'LEGACY_ENCRYPTION',
          `expected err.code LEGACY_ENCRYPTION, got: ${err.code}`);
        assert.ok(err.message.includes('LegacyEncryptionError'),
          `expected LegacyEncryptionError in message, got: ${err.message}`);
      }
      assert.ok(threw, 'decrypt must throw for legacy (no-colon) ciphertext');
    });
  });
});

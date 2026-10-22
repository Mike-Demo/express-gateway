const assert = require('assert');
const admin = require('../../lib/rest');
const eventBus = require('../../lib/eventBus');
const request = require('supertest');
describe('admin with plugins', () => {
  let adminSrv, adminSrvFromEvent;
  before('fires up a new admin instance', function () {
    eventBus.on('admin-ready', ({ adminServer }) => {
      adminSrvFromEvent = adminServer;
    });
    return admin({
      plugins: {
        adminRoutes: [function (adminExpressInstance) {
          adminExpressInstance.all('/test', (req, res) => res.json({ enabled: true }));
        }]
      },
      config: {
        systemConfig: {
          adminApiKey: 'test-admin-key'
        },
        gatewayConfig: {
          admin: {
            port: 0
          }
        }
      }
    }).then(srv => {
      adminSrv = srv;
      return srv;
    });
  });

  it('should reject unauthenticated requests', () => {
    return request(adminSrv)
      .get('/test')
      .expect(401);
  });

  it('should add custom route', () => {
    return request(adminSrv)
      .get('/test')
      .set('X-Admin-API-Key', 'test-admin-key')
      .then(res => {
        assert.ok(res.body.enabled);
      });
  });

  it('should fail to start without an operator API key', () => {
    assert.throws(() => admin({
      config: {
        systemConfig: { adminApiKey: '' },
        gatewayConfig: { admin: { port: 0 } }
      }
    }), /systemConfig\.adminApiKey/);
  });

  it('should not expose the admin API through the default gateway pipeline', () => {
    const gatewayConfig = require('../../lib/config').gatewayConfig;
    assert.ok(!gatewayConfig.pipelines || !gatewayConfig.pipelines.adminAPI);
  });

  it('should fire admin-ready event', () => {
    assert.ok(adminSrvFromEvent);
    assert.strictEqual(adminSrvFromEvent, adminSrv);
  });

  after('close admin srv', () => {
    adminSrv.close();
  });
});

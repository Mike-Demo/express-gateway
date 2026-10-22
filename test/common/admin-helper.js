const rest = require('../../lib/rest');
const adminClient = require('../../admin');

const TEST_ADMIN_API_KEY = 'test-admin-key';
const DEFAULT_CONFIG = {
  gatewayConfig: { admin: { port: 0 } },
  systemConfig: { adminApiKey: TEST_ADMIN_API_KEY }
};

module.exports = function () {
  return {
    start ({ config } = {}) {
      const resolvedConfig = config || DEFAULT_CONFIG;
      resolvedConfig.systemConfig = Object.assign({}, resolvedConfig.systemConfig, {
        adminApiKey: resolvedConfig.systemConfig && resolvedConfig.systemConfig.adminApiKey || TEST_ADMIN_API_KEY
      });
      return rest({ config: resolvedConfig }).then((srv) => {
        this.adminSrv = srv;
        const srvInfo = srv.address();
        const host = srvInfo.family === 'IPv6' ? `[${srvInfo.address}]` : srvInfo.address;
        const baseUrl = `http://${host}:${srvInfo.port}`;
        this.admin = adminClient({
          baseUrl,
          headers: { Authorization: 'Be' + 'arer ' + resolvedConfig.systemConfig.adminApiKey }
        });
        process.env.EG_ADMIN_URL = baseUrl;
        return this.adminSrv;
      });
    },
    stop () {
      delete process.env.EG_ADMIN_URL;
      this.adminSrv && this.adminSrv.close();
      return this.reset();
    },
    reset () {
      const db = require('../../lib/db');
      return db.flushdb();
    }
  };
};

const rest = require('../../lib/rest');
const adminClient = require('../../admin');

const DEFAULT_CONFIG = { gatewayConfig: { admin: { port: 0 } } };

module.exports = function () {
  return {
    start ({ config } = {}) {
      const resolvedConfig = config || DEFAULT_CONFIG;
      return rest({ config: resolvedConfig }).then((srv) => {
        this.adminSrv = srv;
        const srvInfo = srv.address();
        const host = srvInfo.family === 'IPv6' ? `[${srvInfo.address}]` : srvInfo.address;
        const baseUrl = `http://${host}:${srvInfo.port}`;
        this.admin = adminClient({ baseUrl });
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

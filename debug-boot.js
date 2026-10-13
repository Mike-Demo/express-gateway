// TEMPORARY diagnostic wrapper (branch ce-debug only, never on master).
// Serves the real gateway's captured stdout/stderr over HTTP on 8080 so the
// Code Engine crash reason is visible without instance-log access. The
// gateway itself runs as a child process on port 8081.
const { spawn } = require('child_process');
const http = require('http');

let buf = '[wrapper] starting child gateway (EG_HTTP_PORT=8081)...\n';
const env = Object.assign({}, process.env, { EG_HTTP_PORT: '8081' });
const child = spawn('node', ['-e', "require('/app/lib')().run();"], { env });
child.stdout.on('data', d => { buf += d.toString(); });
child.stderr.on('data', d => { buf += d.toString(); });
child.on('exit', (code, sig) => { buf += `\n[wrapper] child exited code=${code} signal=${sig}\n`; });
child.on('error', e => { buf += `\n[wrapper] spawn error: ${e.message}\n`; });

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end(buf.slice(-60000));
}).listen(8080, () => { buf += '[wrapper] log server listening on 8080\n'; });

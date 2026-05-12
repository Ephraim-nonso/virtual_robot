import http from 'node:http';

import { createApp } from './app.js';
import { initializeBackend } from './bootstrap.js';
import { config } from './config.js';
import { attachTelemetryProxy } from './realtime/telemetryProxy.js';

await initializeBackend();

const app = createApp();
const server = http.createServer(app);

attachTelemetryProxy(server);

server.listen(config.port, () => {
  console.log(`Backend listening on http://localhost:${config.port}`);
  console.log(`Proxying robot simulator from ${config.robotSimUrl}`);
});

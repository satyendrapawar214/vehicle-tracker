const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const knexConfig = require('./knexfile');
const knex = require('knex')(knexConfig);
const { validateDeviceKey, upsertPosition, latestVehicles, getHistory } = require('./services/db');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws/vehicles' });

app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'change_this';

// Simple admin auth (username/password -> JWT)
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const row = await knex('users').where({ username }).first();
  if (!row) return res.status(401).json({ error: 'Invalid' });
  const bcrypt = require('bcrypt');
  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid' });
  const token = jwt.sign({ uid: row.id, username: row.username }, JWT_SECRET, { expiresIn: '12h' });
  res.json({ token });
});

// Device update endpoint
app.post('/api/devices/update', async (req, res) => {
  try {
    const deviceKey = req.headers['x-device-key'] || req.query.device_key;
    if (!deviceKey) return res.status(401).json({ error: 'Missing device key' });
    const device = await validateDeviceKey(knex, deviceKey);
    if (!device) return res.status(403).json({ error: 'Invalid device key' });

    const payload = req.body;
    // expected: { id, lat, lon, speed, heading, ts }
    payload.device_id = device.id; // internal mapping
    const saved = await upsertPosition(knex, payload);

    // broadcast to websocket clients
    const msg = JSON.stringify({ type: 'vehicle', vehicle: saved });
    wss.clients.forEach(c => c.readyState === WebSocket.OPEN && c.send(msg));

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server error' });
  }
});

// Web UI endpoints
app.get('/api/vehicles', async (req, res) => {
  const rows = await latestVehicles(knex);
  res.json(rows);
});

app.get('/api/history/:id', async (req, res) => {
  const id = req.params.id;
  const from = req.query.from; // optional timestamp
  const rows = await getHistory(knex, id, from);
  res.json(rows);
});

// Geofence endpoints (simple)
app.post('/api/geofences', async (req, res) => {
  const { name, polygon } = req.body; // polygon: array of [lon,lat]
  const inserted = await knex('geofences').insert({ name, polygon: JSON.stringify(polygon) }).returning('*');
  res.json(inserted[0]);
});

app.get('/api/geofences', async (req, res) => {
  const rows = await knex('geofences').select('*');
  res.json(rows.map(r => ({ id: r.id, name: r.name, polygon: JSON.parse(r.polygon) })));
});

// Serve static frontend build (if deployed together)
const path = require('path');
app.use(express.static(path.join(__dirname, '../../frontend/dist')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../../frontend/index.html')));

// WebSocket handling: send initial snapshot
wss.on('connection', async ws => {
  const rows = await latestVehicles(knex);
  ws.send(JSON.stringify({ type: 'update', vehicles: rows }));
});

server.listen(PORT, () => console.log('Server listening on', PORT));

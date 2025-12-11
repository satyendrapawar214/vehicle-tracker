const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const knexConfig = require('./knexfile');
const knex = require('knex')(knexConfig);
const path = require('path');
require('dotenv').config();

const { validateDeviceKey, upsertPosition, latestVehicles, getHistory } =
  require('./services/db');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws/vehicles' });

app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'change_this';

// ------------------ AUTH ------------------
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const row = await knex('users').where({ username }).first();
  if (!row) return res.status(401).json({ error: 'Invalid' });

  const bcrypt = require('bcrypt');
  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid' });

  const token = jwt.sign(
    { uid: row.id, username: row.username },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
  res.json({ token });
});

// ------------------ DEVICE UPDATE ------------------
app.post('/api/devices/update', async (req, res) => {
  try {
    const deviceKey = req.headers['x-device-key'] || req.query.device_key;
    if (!deviceKey)
      return res.status(401).json({ error: 'Missing device key' });

    const device = await validateDeviceKey(knex, deviceKey);
    if (!device)
      return res.status(403).json({ error: 'Invalid device key' });

    const payload = req.body;
    payload.device_id = device.id;

    const saved = await upsertPosition(knex, payload);

    // push to websocket
    const msg = JSON.stringify({ type: 'vehicle', vehicle: saved });
    wss.clients.forEach(c => {
      if (c.readyState === WebSocket.OPEN) c.send(msg);
    });

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server error' });
  }
});

// ------------------ API ENDPOINTS ------------------
app.get('/api/vehicles', async (req, res) => {
  const rows = await latestVehicles(knex);
  res.json(rows);
});

app.get('/api/history/:id', async (req, res) => {
  const id = req.params.id;
  const from = req.query.from;
  const rows = await getHistory(knex, id, from);
  res.json(rows);
});

// Geofence
app.post('/api/geofences', async (req, res) => {
  const { name, polygon } = req.body;

  const inserted = await knex('geofences')
    .insert({ name, polygon: JSON.stringify(polygon) })
    .returning('*');

  res.json(inserted[0]);
});

app.get('/api/geofences', async (req, res) => {
  const rows = await knex('geofences').select('*');
  res.json(
    rows.map(r => ({
      id: r.id,
      name: r.name,
      polygon: JSON.parse(r.polygon),
    }))
  );
});

// ------------------ SERVE FRONTEND BUILD ------------------
app.use(express.static(path.join(__dirname, 'frontend/dist')));

// fallback route — SPA React Router fix
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
});

// ------------------ WEBSOCKET ------------------
wss.on('connection', async ws => {
  const rows = await latestVehicles(knex);
  ws.send(JSON.stringify({ type: 'update', vehicles: rows }));
});

// ------------------ START SERVER ------------------
server.listen(PORT, () => console.log('Server listening on', PORT));

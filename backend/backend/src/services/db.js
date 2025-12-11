const bcrypt = require('bcrypt');

async function validateDeviceKey(knex, key) {
  const row = await knex('devices').where({ api_key: key }).first();
  return row || null;
}

async function upsertPosition(knex, payload) {
  const deviceId = payload.device_id;
  const id = payload.id || `dev-${deviceId}`;
  const lat = parseFloat(payload.lat);
  const lon = parseFloat(payload.lon);
  const speed = payload.speed || null;
  const ts = payload.ts ? new Date(payload.ts) : new Date();

  // insert into positions
  const inserted = await knex('positions').insert({ device_id: deviceId, vehicle_id: id, lat, lon, speed, heading: payload.heading || null, ts }).returning('*');

  // update latest table
  const latest = {
    vehicle_id: id, device_id: deviceId, lat, lon, speed, ts
  };
  await knex.transaction(async trx => {
    const exists = await trx('latest_positions').where({ vehicle_id: id }).first();
    if (exists) await trx('latest_positions').where({ vehicle_id: id }).update(latest);
    else await trx('latest_positions').insert(latest);
  });

  return inserted[0];
}

async function latestVehicles(knex) {
  const rows = await knex('latest_positions').select('*');
  return rows.map(r => ({ id: r.vehicle_id, lat: r.lat, lon: r.lon, speed: r.speed, ts: r.ts }));
}

async function getHistory(knex, vehicle_id, from) {
  let q = knex('positions').where({ vehicle_id }).orderBy('ts', 'asc').limit(5000);
  if (from) q = q.andWhere('ts', '>=', new Date(parseInt(from)));
  return q.select('*');
}

module.exports = { validateDeviceKey, upsertPosition, latestVehicles, getHistory };

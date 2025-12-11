const knexConfig2 = require('../knexfile');
const knex2 = require('knex')(knexConfig2);
const bcrypt = require('bcrypt');
(async ()=>{
  const pw = process.env.ADMIN_PASS || 'adminpass';
  const hash = await bcrypt.hash(pw, 10);
  await knex2('users').insert({ username: process.env.ADMIN_USER || 'admin', password_hash: hash }).onConflict('username').ignore();
  await knex2('devices').insert({ name: 'dev1', api_key: process.env.DEVICE_DEFAULT_API_KEY || 'dev-api-key-CHANGE' }).onConflict('api_key').ignore();
  console.log('Seeded');
  process.exit(0);
})();

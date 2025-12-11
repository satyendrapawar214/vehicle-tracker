const fs = require('fs');
const knexConfig = require('../knexfile');
const knex = require('knex')(knexConfig);
(async ()=>{
  const sql = fs.readFileSync(require('path').join(__dirname,'../migrations/init.sql'), 'utf8');
  await knex.raw(sql);
  console.log('Migration ran');
  process.exit(0);
})();

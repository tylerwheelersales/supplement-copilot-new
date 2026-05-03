require('dotenv').config({ override: true });
const app = require('./app');
const pool = require('./src/db');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3001;

async function start() {
  // Run schema migrations on startup
  const schema = fs.readFileSync(path.join(__dirname, 'src/db/schema.sql'), 'utf8');
  await pool.query(schema);
  console.log('Database schema ready');

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('./index');

async function runSeeds() {
  console.log('🌱 Starting Database Seeding...');
  const seedsDir = path.resolve(__dirname, '..', 'seeds');

  if (!fs.existsSync(seedsDir)) {
    console.log('ℹ️ No seeds directory found.');
    return;
  }

  const files = fs.readdirSync(seedsDir)
    .filter(f => f.endsWith('.js'))
    .sort();

  for (const file of files) {
    console.log(`   ⚙️ Running seed file: ${file}...`);
    const seedFn = require(path.join(seedsDir, file));
    if (typeof seedFn === 'function') {
      await seedFn();
    }
  }

  console.log('🎉 Database seeding completed successfully!');
}

if (require.main === module) {
  runSeeds()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('❌ Seeding failed:', err.message);
      await pool.end();
      process.exit(1);
    });
}

module.exports = { runSeeds };

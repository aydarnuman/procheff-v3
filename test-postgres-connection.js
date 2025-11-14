const { Client } = require('pg');
require('dotenv').config();

async function testConnection() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/procheff_db'
  });

  try {
    await client.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ PostgreSQL bağlantısı başarılı!');
    console.log('   Server zamanı:', result.rows[0].now);
    await client.end();
  } catch (error) {
    console.error('❌ PostgreSQL bağlantısı başarısız!');
    console.error('   Hata:', error.message);
    console.error('   DATABASE_URL:', process.env.DATABASE_URL || 'Tanımlı değil');
    process.exit(1);
  }
}

testConnection();

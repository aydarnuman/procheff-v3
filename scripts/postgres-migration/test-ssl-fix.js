const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://user:***PASSWORD***@host:port/database?sslmode=require";

// Try different SSL configurations
async function testSSLConfigs() {
  console.log('🔐 Testing different SSL configurations...\n');

  const sslConfigs = [
    {
      name: 'Config 1: rejectUnauthorized false + require true',
      ssl: {
        rejectUnauthorized: false,
        require: true
      }
    },
    {
      name: 'Config 2: Just rejectUnauthorized false',
      ssl: {
        rejectUnauthorized: false
      }
    },
    {
      name: 'Config 3: SSL true',
      ssl: true
    },
    {
      name: 'Config 4: DigitalOcean recommended',
      ssl: {
        rejectUnauthorized: false,
        ca: undefined,
        require: true,
        servername: 'db-postgresql-fra1-22277-do-user-28803712-0.f.db.ondigitalocean.com'
      }
    }
  ];

  for (const config of sslConfigs) {
    console.log(`\n📝 Testing: ${config.name}`);
    const pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: config.ssl
    });

    try {
      const client = await pool.connect();
      const result = await client.query('SELECT NOW()');
      console.log(`✅ SUCCESS! Connected at: ${result.rows[0].now}`);
      client.release();
      await pool.end();
      
      // If successful, show the working config
      console.log('\n🎉 Working configuration:');
      console.log(JSON.stringify(config, null, 2));
      return config;
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
      await pool.end();
    }
  }
}

testSSLConfigs().then(workingConfig => {
  if (workingConfig) {
    console.log('\n✅ Use this SSL configuration in your code!');
  } else {
    console.log('\n❌ No SSL configuration worked. Check your connection string or network.');
  }
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

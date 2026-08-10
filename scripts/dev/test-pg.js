const { Client } = require('pg');
const c = new Client({
  connectionString: 'postgresql://postgres.wqzqcgtxjxrkoqgdnsbh:obadaraw221@aws-0-eu-central-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

c.connect().then(async () => {
  console.log('✅ Connected!\n');

  const requests = await c.query(
    'SELECT name, email, status, "createdAt" FROM "CustomRequest" ORDER BY "createdAt" DESC LIMIT 5'
  );
  console.log('📋 CustomRequests in Supabase:');
  requests.rows.forEach(r => console.log(' •', r.name, '|', r.email, '|', r.status, '|', r.createdAt));

  const products = await c.query(
    'SELECT "sanityId", price, stock FROM "ProductSync" ORDER BY "createdAt" ASC'
  );
  console.log('\n🛍️  ProductSync table:');
  products.rows.forEach(r => console.log(' •', r.sanityId, '| $' + r.price, '| stock:', r.stock));

  await c.end();
}).catch(e => console.error('Error:', e.message));

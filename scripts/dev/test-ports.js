// Debug: fetch admin login page and print first 2000 chars
fetch('http://localhost:3000/en/admin/login')
  .then(r => r.text())
  .then(t => {
    // Extract error message from Next.js error page
    const errorMatch = t.match(/class="error-message[^"]*"[^>]*>([\s\S]{1,300})/);
    const digestMatch = t.match(/digest[^"]*"([^"]{1,100})/);
    const h1Match = t.match(/<h1[^>]*>([\s\S]{1,200})<\/h1>/);
    console.log('=== PAGE RESPONSE (first 3000 chars) ===');
    console.log(t.slice(0, 3000));
  })
  .catch(e => console.error('Fetch error:', e.message));

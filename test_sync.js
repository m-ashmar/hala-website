fetch('http://localhost:3000/api/admin/sync/promotions', { method: 'POST' })
  .then(res => res.json())
  .then(console.log)
  .catch(console.error);

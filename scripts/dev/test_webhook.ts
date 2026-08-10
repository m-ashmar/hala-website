const payload = {
  _type: "promotion",
  _id: "test-promo-123",
  operation: "update",
  title: "Test Sync Promo",
  couponCode: "TEST-SYNC",
  discountType: "PERCENTAGE",
  discountValue: 15,
  endDate: new Date().toISOString(),
  isActive: true
};

fetch('http://localhost:3000/api/webhooks/sanity', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
})
.then(res => res.json().then(data => ({ status: res.status, data })))
.then(console.log)
.catch(console.error);

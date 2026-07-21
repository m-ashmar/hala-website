async function test() {
  const res = await fetch('http://localhost:3000/api/promotions/validate-coupon', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: "1231", orderAmount: 100 })
  });
  const data = await res.json();
  console.log("Status:", res.status);
  console.log("Data:", data);
}

test();

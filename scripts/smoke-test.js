// Simple smoke test: login as admin and call /api/admin/users
(async function () {
  try {
    const loginRes = await fetch("http://localhost:4000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@example.com", password: "AdminPassword123!" }),
    });
    const loginData = await loginRes.json();
    console.log("LOGIN:", loginData);
    if (!loginData.token) {
      console.error("No token returned from login");
      process.exit(1);
    }
    const token = loginData.token;
    const usersRes = await fetch("http://localhost:4000/api/admin/users", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const usersData = await usersRes.json();
    console.log("USERS:", usersData);
  } catch (err) {
    console.error("Smoke test failed:", err);
    process.exit(1);
  }
})();





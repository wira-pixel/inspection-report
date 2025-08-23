const SCRIPT_URL = "https://delicate-union-ad99.sayaryant.workers.dev/"; // Cloudflare Worker

function showLoader(show) {
  document.getElementById("loader").style.display = show ? "flex" : "none";
}

async function login() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  if (!username || !password) {
    alert("Isi username dan password!");
    return;
  }

  showLoader(true);

  try {
    const res = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        action: "login",
        username,
        password
      })
    });

    const data = await res.json();
    showLoader(false);

    alert(data.message);
    if (data.success) {
      localStorage.setItem("loggedIn", "true");
      window.location.href = "dashboard.html";
    }
  } catch (err) {
    showLoader(false);
    alert("Gagal terhubung ke server!");
    console.error(err);
  }
}

async function register() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  if (!username || !password) {
    alert("Isi username dan password!");
    return;
  }

  showLoader(true);

  try {
    const res = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        action: "register",
        username,
        password
      })
    });

    const data = await res.json();
    showLoader(false);

    alert(data.message);
  } catch (err) {
    showLoader(false);
    alert("Gagal terhubung ke server!");
    console.error(err);
  }
}

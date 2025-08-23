const SCRIPT_URL = "PASTE_URL_APPS_SCRIPT_EXEC_HERE"; // Ganti dengan URL Apps Script

function showLoader(show) {
  document.getElementById("loader").style.display = show ? "flex" : "none";
}

async function login() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  if(!username || !password) {
    alert("Isi username dan password!");
    return;
  }

  showLoader(true);

  try {
    const res = await fetch(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ action: "login", username, password })
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
  }
}

async function register() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  if(!username || !password) {
    alert("Isi username dan password!");
    return;
  }

  showLoader(true);

  try {
    const res = await fetch(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ action: "register", username, password })
    });
    const data = await res.json();
    showLoader(false);

    alert(data.message);
  } catch (err) {
    showLoader(false);
    alert("Gagal terhubung ke server!");
  }
}

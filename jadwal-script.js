// Ganti dengan URL Web App Google Apps Script kamu
const SCRIPT_URL = "PASTE_URL_APPS_SCRIPT_KAMU_DISINI";

// Form submit
document.getElementById("jadwalForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    tanggal: document.getElementById("tanggal").value,
    kodeUnit: document.getElementById("kodeUnit").value,
    lokasi: document.getElementById("lokasi").value
  };

  try {
    await fetch(SCRIPT_URL, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    alert("Jadwal berhasil disimpan!");
    document.getElementById("jadwalForm").reset();
    loadData();
  } catch (err) {
    console.error("Error:", err);
    alert("Gagal menyimpan jadwal!");
  }
});

// Load data dari Google Sheets
async function loadData() {
  try {
    const res = await fetch(SCRIPT_URL);
    const jadwalList = await res.json();
    const tbody = document.getElementById("jadwalBody");
    tbody.innerHTML = "";

    jadwalList.forEach(row => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${row.kodeUnit}</td>
        <td>${row.tanggal}</td>
        <td>${row.lokasi}</td>
        <td><input type="checkbox" ${row.status === "done" ? "checked" : ""}></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Error load data:", err);
  }
}

// Load pertama kali
loadData();

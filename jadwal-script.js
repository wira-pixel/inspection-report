// Ganti dengan URL Cloudflare Worker kamu
const WORKER_URL = "https://delicate-union-ad99.sayaryant.workers.dev/"; 

// Form submit
document.getElementById("jadwalForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    tanggal: document.getElementById("tanggal").value,
    kodeUnit: document.getElementById("kodeUnit").value,
    lokasi: document.getElementById("lokasi").value
  };

  try {
    await fetch(WORKER_URL, {
      method: "POST",
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

// Load data dari Google Sheets via Cloudflare Worker
async function loadData() {
  try {
    const res = await fetch(WORKER_URL, { method: "GET" });  // ⬅️ perbaikan di sini
    const jadwalList = await res.json();

    console.log("DEBUG hasil fetch jadwal:", jadwalList);

    const tbody = document.getElementById("jadwalBody");
    tbody.innerHTML = "";

    if (!Array.isArray(jadwalList)) {
      console.error("Data bukan array:", jadwalList);
      return;
    }

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

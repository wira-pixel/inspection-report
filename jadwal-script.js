// Ganti dengan URL Cloudflare Worker kamu
const WORKER_URL = "https://delicate-union-ad99.sayaryant.workers.dev/jadwal";

// === Form Submit ===
document.getElementById("jadwalForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    kode_unit: document.getElementById("kode_unit").value,
    tanggal_inspeksi: document.getElementById("tanggal_inspeksi").value,
    lokasi_unit: document.getElementById("lokasi_unit").value,
    sudah_inspeksi: "" // default kosong, bisa update jadi "sudah"
  };

  try {
    const res = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const result = await res.json();
    console.log("DEBUG simpan:", result);

    if (result.success) {
      alert("Jadwal berhasil disimpan!");
      document.getElementById("jadwalForm").reset();
      loadData(); // refresh tabel
    } else {
      alert("Gagal simpan: " + result.message);
    }

  } catch (err) {
    console.error("Error:", err);
    alert("Gagal menyimpan jadwal!");
  }
});

// === Load Data ===
async function loadData() {
  try {
    const res = await fetch(WORKER_URL, { method: "GET" });
    const result = await res.json();

    console.log("DEBUG hasil fetch jadwal:", result);

    const jadwalList = result.data;
    const tbody = document.getElementById("jadwalBody");
    tbody.innerHTML = "";

    if (!Array.isArray(jadwalList)) {
      console.error("Data bukan array:", jadwalList);
      return;
    }

    jadwalList.forEach(item => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${item.kode_unit || ""}</td>
        <td>${item.tanggal_inspeksi || ""}</td>
        <td>${item.lokasi_unit || ""}</td>
        <td><input type="checkbox" ${item.sudah_inspeksi === "sudah" ? "checked" : ""}></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Error load data:", err);
  }
}

// === Load pertama kali ===
loadData();

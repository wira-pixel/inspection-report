// URL Cloudflare Worker kamu
const scriptURL = "https://delicate-union-ad99.sayaryant.workers.dev";

// Pastikan form jadwal ada
const jadwalForm = document.getElementById("jadwalForm");
if (jadwalForm) {
  jadwalForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const tanggal = document.getElementById("tanggal").value.trim();
    const kode = document.getElementById("kode").value.trim();
    const lokasi = document.getElementById("lokasi").value.trim();

    if (!tanggal || !kode || !lokasi) {
      alert("Mohon lengkapi semua field!");
      return;
    }

    const data = { tanggal, kode, lokasi };

    // Tambah ke tabel (hanya di halaman Jadwal Inspeksi)
    const tbody = document.querySelector("#jadwalTable tbody");
    if (tbody) {
      const row = tbody.insertRow();
      row.insertCell(0).innerText = kode;
      row.insertCell(1).innerText = tanggal;
      row.insertCell(2).innerText = lokasi;
      row.insertCell(3).innerHTML = `<input type="checkbox">`;
    }

    // Kirim ke GSheet via Cloudflare Worker
    try {
      const res = await fetch(scriptURL, {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" }
      });

      if (res.ok) {
        alert("✅ Data berhasil disimpan ke GSheet!");
      } else {
        alert("⚠️ Gagal menyimpan ke server (status: " + res.status + ")");
      }
    } catch (error) {
      alert("❌ Error koneksi: " + error.message);
    }

    // Reset form
    e.target.reset();
  });
}

// URL Cloudflare Worker kamu
const scriptURL = "https://delicate-union-ad99.sayaryant.workers.dev";

// Fungsi tampil / sembunyi loading overlay
function showLoading() {
  document.getElementById("loadingOverlay").classList.add("active");
}
function hideLoading() {
  document.getElementById("loadingOverlay").classList.remove("active");
}

// Pastikan form jadwal ada
const jadwalForm = document.getElementById("jadwalForm");
if (jadwalForm) {
  jadwalForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const tanggal = document.getElementById("tanggal").value.trim();
    const kode    = document.getElementById("kode").value.trim();
    const lokasi  = document.getElementById("lokasi").value.trim();

    if (!tanggal || !kode || !lokasi) {
      alert("Mohon lengkapi semua field!");
      return;
    }

    // WAJIB: action untuk routing di Worker & GAS
    const payload = { action: "submitJadwal", tanggal, kode, lokasi };

    try {
      showLoading(); // tampilkan overlay

      const res = await fetch(scriptURL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // coba baca JSON; kalau gagal ya sudah, anggap teks biasa
      let result = {};
      try { result = await res.json(); } catch { /* ignore */ }

      if (!res.ok) {
        throw new Error(result.message || ("HTTP " + res.status));
      }

      // Tambahkan ke tabel hanya setelah sukses tersimpan
      const tbody = document.querySelector("#jadwalTable tbody");
      if (tbody) {
        const row = tbody.insertRow();
        row.insertCell(0).innerText = kode;
        row.insertCell(1).innerText = tanggal;
        row.insertCell(2).innerText = lokasi;
        row.insertCell(3).innerHTML = `<input type="checkbox">`;
      }

      alert(result.message || "✅ Jadwal berhasil disimpan!");
      e.target.reset();
    } catch (err) {
      alert("❌ Gagal menyimpan: " + err.message);
    } finally {
      hideLoading(); // sembunyikan overlay di akhir proses
    }
  });
}

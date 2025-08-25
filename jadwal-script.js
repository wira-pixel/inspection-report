// URL Cloudflare Worker kamu
const scriptURL = "https://delicate-union-ad99.sayaryant.workers.dev";

// Toast function
function showToast(msg, type = "success") {
  const toast = document.getElementById("toast");
  toast.innerText = msg;
  toast.className = "show " + type;
  setTimeout(() => { toast.className = toast.className.replace("show " + type, ""); }, 3000);
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
      showToast("Mohon lengkapi semua field!", "error");
      return;
    }

    // WAJIB: action untuk routing di Worker & GAS
    const payload = { action: "submitJadwal", tanggal, kode, lokasi };

    // tampilkan loading
    document.getElementById("loadingOverlay").classList.add("active");

    try {
      const res = await fetch(scriptURL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

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

      showToast(result.message || "✅ Jadwal berhasil disimpan!", "success");
      e.target.reset();
    } catch (err) {
      showToast("❌ Gagal menyimpan: " + err.message, "error");
    } finally {
      // sembunyikan loading
      document.getElementById("loadingOverlay").classList.remove("active");
    }
  });
}

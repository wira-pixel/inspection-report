// URL Cloudflare Worker kamu
const scriptURL = "https://delicate-union-ad99.sayaryant.workers.dev";

// Toast function
function showToast(msg, type = "success") {
  const toast = document.getElementById("toast");
  if (!toast) return console.warn("Elemen #toast tidak ditemukan");
  toast.innerText = msg;
  toast.className = "show " + type;
  setTimeout(() => {
    toast.className = toast.className.replace("show " + type, "");
  }, 3000);
}

// [BARU] Fungsi load semua jadwal dari server
async function loadJadwal() {
  try {
    const res = await fetch(scriptURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "getJadwal" }) // nanti AppScript/Worker harus support ini
    });

    const data = await res.json();

    const tbody = document.querySelector("#jadwalTable tbody");
    if (!tbody) return;

    tbody.innerHTML = ""; // kosongkan tabel dulu

    data.forEach(item => {
      const row = tbody.insertRow();
      row.insertCell(0).innerText = item.kode;
      row.insertCell(1).innerText = item.tanggal;
      row.insertCell(2).innerText = item.lokasi;
      row.insertCell(3).innerHTML = `<input type="checkbox" ${item.sudahInspeksi ? "checked" : ""}>`;
    });

  } catch (err) {
    showToast("❌ Gagal memuat jadwal: " + err.message, "error");
  }
}

// Panggil saat halaman sudah siap
document.addEventListener("DOMContentLoaded", loadJadwal); // [BARU]

// Pastikan form jadwal ada
const jadwalForm = document.getElementById("jadwalForm");
if (jadwalForm) {
  jadwalForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const tanggal = document.getElementById("tanggal")?.value.trim();
    const kode    = document.getElementById("kode")?.value.trim();
    const lokasi  = document.getElementById("lokasi")?.value.trim();

    if (!tanggal || !kode || !lokasi) {
      showToast("Mohon lengkapi semua field!", "error");
      return;
    }

    const payload = { action: "submitJadwal", tanggal, kode, lokasi };

    // tampilkan loading (null-safe)
    const overlay = document.getElementById("loadingOverlay");
    if (overlay) overlay.classList.add("active");

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

      // [UPDATE] -> sekarang tidak perlu insert manual, cukup reload dari server
      await loadJadwal(); 

      showToast(result.message || "✅ Jadwal berhasil disimpan!", "success");
      e.target.reset();
    } catch (err) {
      showToast("❌ Gagal menyimpan: " + err.message, "error");
    } finally {
      // sembunyikan loading (null-safe)
      const overlay2 = document.getElementById("loadingOverlay");
      if (overlay2) overlay2.classList.remove("active");
    }
  });
}

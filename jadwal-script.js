// Ganti URL ini dengan alamat Cloudflare Worker kamu
const scriptURL = "https://delicate-union-ad99.sayaryant.workers.dev";

document.getElementById("jadwalForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const tanggal = document.getElementById("tanggal").value;
  const kode = document.getElementById("kode").value;
  const lokasi = document.getElementById("lokasi").value;

  const data = { tanggal, kode, lokasi };

  // Tambah ke tabel
  const tbody = document.querySelector("#jadwalTable tbody");
  const row = tbody.insertRow();
  row.insertCell(0).innerText = kode;
  row.insertCell(1).innerText = tanggal;
  row.insertCell(2).innerText = lokasi;
  row.insertCell(3).innerHTML = `<input type="checkbox">`;

  // Kirim ke GSheet via Cloudflare Worker
  try {
    await fetch(scriptURL, {
      method: "POST",
      body: JSON.stringify(data),
      headers: { "Content-Type": "application/json" }
    });
    alert("Data berhasil disimpan!");
  } catch (error) {
    alert("Gagal menyimpan ke server: " + error);
  }

  // Reset form
  e.target.reset();
});
123

 // Ganti dengan URL Cloudflare Worker kamu
    const scriptURL = "https://delicate-union-ad99.sayaryant.workers.dev/jadwal";

    // Form submit ke Cloudflare Worker
    document.getElementById("jadwalForm").addEventListener("submit", async (e) => {
      e.preventDefault();

      const data = {
        tanggal: document.getElementById("tanggal").value,
        kodeUnit: document.getElementById("kodeUnit").value,
        lokasi: document.getElementById("lokasi").value,
        sudahInspeksi: "" // default kosong
      };

      try {
        const res = await fetch(scriptURL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });
        const result = await res.json();

        if (result.success) {
          alert("Data berhasil disimpan!");
          e.target.reset();
          loadJadwal();
        } else {
          alert("Gagal simpan: " + result.message);
        }
      } catch (err) {
        console.error("Error:", err);
        alert("Gagal menyimpan jadwal!");
      }
    });

    // Ambil data dari Cloudflare Worker
    async function loadJadwal() {
      try {
        const res = await fetch(scriptURL, { method: "GET" });
        const result = await res.json();

        const tbody = document.getElementById("jadwalBody");
        tbody.innerHTML = "";

        if (!Array.isArray(result.data)) {
          console.error("Data bukan array:", result);
          return;
        }

        result.data.forEach(row => {
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td>${row.kodeUnit || ""}</td>
            <td>${row.tanggal || ""}</td>
            <td>${row.lokasi || ""}</td>
            <td>${row.sudahInspeksi || "Belum"}</td>
          `;
          tbody.appendChild(tr);
        });
      } catch (err) {
        console.error("Error load data:", err);
      }
    }

    // Load pertama kali
    loadJadwal();
  </script>
</body>
</html>

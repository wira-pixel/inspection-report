// ==========================
// JADWAL — Form + Draft server-based (hari ini)
// ==========================
(() => {
  const WORKER_URL = "https://delicate-union-ad99.sayaryant.workers.dev/"; // pastikan trailing slash di Cloudflare Worker

  // ---------- UTIL ----------
  const pad2 = n => String(n).padStart(2, "0");
  const toDDMMYYYY = d => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
  const todayYMD = () => {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  };
  const anyToYMD = v => {
    if (!v) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    const d = new Date(v);
    if (!isNaN(d)) return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    return "";
  };

  async function postWorker(payload) {
    const r = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    // Jika worker mengembalikan HTML (mis. 404), ini akan melempar saat parse
    const text = await r.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error("Server mengembalikan HTML/404, periksa URL WORKER_URL & action.");
    }
  }

  async function getJadwal() {
    return await postWorker({ action: "getJadwal" });
  }

  // ---------- UI HELPERS ----------
  function showToast(msg, type = "success") {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = msg;
    el.className = `show ${type}`;
    setTimeout(() => (el.className = el.className.replace(`show ${type}`, "")), 2600);
  }
  function showOverlay() {
    const el = document.getElementById("loadingOverlay");
    if (el) el.classList.remove("hidden");
  }
  function hideOverlay() {
    const el = document.getElementById("loadingOverlay");
    if (el) el.classList.add("hidden");
  }
  function showInfo(msg) {
    const i = document.getElementById("infoMsg");
    if (i) {
      i.textContent = msg;
      i.classList.remove("hidden");
    }
  }
  function hideInfo() {
    const i = document.getElementById("infoMsg");
    if (i) i.classList.add("hidden");
  }

  // ---------- FORM SUBMIT ----------
  const formEl = document.getElementById("jadwalForm");
  if (formEl) {
    formEl.addEventListener("submit", async e => {
      e.preventDefault();
      const tanggal = document.getElementById("tanggal")?.value.trim();
      const kode = document.getElementById("kode")?.value.trim();
      const lokasi = document.getElementById("lokasi")?.value.trim();

      if (!tanggal || !kode || !lokasi) {
        showToast("Mohon lengkapi semua field!", "error");
        return;
      }

      showOverlay();
      try {
        const res = await postWorker({
          action: "submitJadwal",
          tanggal,
          kode,
          lokasi
        });
        if (!res?.success) throw new Error(res?.message || "Gagal simpan");
        showToast(res?.message || "✅ Jadwal tersimpan");
        formEl.reset();
        await loadDraft();
      } catch (err) {
        showToast("❌ " + err.message, "error");
      } finally {
        hideOverlay();
      }
    });
  }

  // ---------- DRAFT (HARI INI) ----------
  const STATUS_LIST = ["Selesai", "Ditunda"];
  const tbody = document.getElementById("draftTbody");
  const btnRefresh = document.getElementById("btnRefresh");
  const btnSubmitAll = document.getElementById("btnSubmitAll");

  async function loadDraft() {
    if (!tbody) return; // halaman ini mungkin tidak punya tabel draft
    showInfo("Memuat data…");
    try {
      const res = await getJadwal();
      if (!res?.success || !Array.isArray(res.data)) {
        tbody.innerHTML = `<tr><td colspan="5" class="muted">${res?.message || "Gagal memuat"}</td></tr>`;
        tbody.dataset.rows = "[]";
        return;
      }
      const today = todayYMD();
      const rows = res.data
        .map(r => ({
          kode: r.kode ?? r["kode"] ?? r["kode unit"] ?? "",
          lokasi: r.lokasi ?? r["lokasi"] ?? "",
          status: (r.status ?? r["status"] ?? "").toString(),
          tanggalYMD: anyToYMD(r.tanggal ?? r["tanggal"] ?? "")
        }))
        .filter(
          r =>
            r.tanggalYMD === today &&
            (r.status.trim() === "" || r.status.trim().toLowerCase() === "belum")
        )
        .sort((a, b) => String(a.kode).localeCompare(String(b.kode)));

      if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="muted">Tidak ada draft.</td></tr>`;
        tbody.dataset.rows = "[]";
        return;
      }

      const options = STATUS_LIST.map(s => `<option value="${s}">${s}</option>`).join("");
      tbody.innerHTML = rows
        .map(
          (r, i) =>
            `<tr data-idx="${i}">
              <td>${r.kode}</td>
              <td>${toDDMMYYYY(new Date(r.tanggalYMD))}</td>
              <td>${r.lokasi || "-"}</td>
              <td><select class="select-status">${options}</select></td>
              <td>
                <button class="btn btn-row js-submit">Kirim</button>
                <button class="btn btn-row btn-del js-delete">Hapus</button>
              </td>
            </tr>`
        )
        .join("");

      tbody.dataset.rows = JSON.stringify(rows);
    } finally {
      hideInfo();
    }
  }

  // Kirim satu baris / Hapus baris
  if (tbody) {
    tbody.addEventListener("click", async ev => {
      const target = ev.target;
      if (!(target instanceof HTMLElement)) return;
      const tr = target.closest("tr[data-idx]");
      if (!tr) return;
      const idx = Number(tr.dataset.idx);
      const rows = JSON.parse(tbody.dataset.rows || "[]");
      const row = rows[idx];
      if (!row) return;

      // A) Kirim (update status)
      if (target.classList.contains("js-submit")) {
        const status = tr.querySelector(".select-status")?.value || "Belum";
        showOverlay();
        try {
          const res = await postWorker({
            action: "updateJadwalStatus",
            kode: row.kode,
            tanggal: row.tanggalYMD,
            lokasi: row.lokasi || "",
            status
          });
          if (!res?.success) throw new Error(res?.message || "Gagal kirim status");
          showToast("✅ Status terkirim");
          await loadDraft();
        } catch (err) {
          showToast("❌ " + err.message, "error");
        } finally {
          hideOverlay();
        }
        return;
      }

      // B) Hapus (delete jadwal)
      if (target.classList.contains("js-delete")) {
        const ok = confirm(
          `Hapus jadwal:\n• Kode: ${row.kode}\n• Tanggal: ${toDDMMYYYY(
            new Date(row.tanggalYMD)
          )}\n• Lokasi: ${row.lokasi || "-"} ?`
        );
        if (!ok) return;

        showOverlay();
        try {
          const res = await postWorker({
            action: "deleteJadwal",
            kode: row.kode,
            tanggal: row.tanggalYMD,
            lokasi: row.lokasi || ""
          });
          if (!res?.success) throw new Error(res?.message || "Gagal menghapus");
          showToast("🗑️ Jadwal dihapus");
          await loadDraft();
        } catch (err) {
          showToast("❌ " + err.message, "error");
        } finally {
          hideOverlay();
        }
      }
    });
  }

  // Kirim semua
  if (btnSubmitAll && tbody) {
    btnSubmitAll.addEventListener("click", async () => {
      const rows = JSON.parse(tbody.dataset.rows || "[]");
      const trs = Array.from(tbody.querySelectorAll("tr[data-idx]"));
      if (!rows.length || !trs.length) return;

      showOverlay();
      try {
        for (const tr of trs) {
          const idx = Number(tr.getAttribute("data-idx") || "-1");
          if (idx < 0) continue;
          const row = rows[idx];
          if (!row) continue;
          const status = tr.querySelector(".select-status")?.value || "Belum";
          const res = await postWorker({
            action: "updateJadwalStatus",
            kode: row.kode,
            tanggal: row.tanggalYMD,
            lokasi: row.lokasi || "",
            status
          });
          if (!res?.success) throw new Error(res?.message || `Gagal: ${row.kode}`);
        }
        showToast("✅ Semua status terkirim");
        await loadDraft();
      } catch (err) {
        showToast("❌ " + err.message, "error");
      } finally {
        hideOverlay();
      }
    });
  }

  if (btnRefresh) btnRefresh.addEventListener("click", loadDraft);

  // init
  document.addEventListener("DOMContentLoaded", loadDraft);
})();

// ==========================
// DASHBOARD — Hari Ini + Draft (server-based)
// ==========================
(() => {
  const WORKER_URL = "https://delicate-union-ad99.sayaryant.workers.dev/";
  const AUTO_REFRESH_MS = 60_000;

  // ---------- UTIL ----------
  const pad2 = n => String(n).padStart(2,'0');
  const toDDMMYYYY = d => `${pad2(d.getDate())}/${pad2(d.getMonth()+1)}/${d.getFullYear()}`;
  const todayYMD = () => { const d=new Date(); return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; };
  const anyToYMD = v => {
    if (!v) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    const d = new Date(v); if (!isNaN(d)) return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
    return "";
  };
  const dispFromAny = v => { const y=anyToYMD(v); if(!y) return "-"; const [yy,mm,dd]=y.split("-"); return `${dd}/${mm}/${yy}`; };

  async function postWorker(payload){
    const r = await fetch(WORKER_URL, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify(payload)
    });
    return await r.json();
  }
  async function fetchJadwal(){
    // read all jadwal
    return await postWorker({ action:'getJadwal' });
  }

  // ---------- HARI INI ----------
  const twTbody  = document.getElementById("tw-tbody");
  const twMsg    = document.getElementById("tw-msg");
  const twDateEl = document.getElementById("tw-date");
  const twRefBtn = document.getElementById("tw-refresh");
  function twShowMsg(t){ twMsg.textContent=t; twMsg.classList.remove('tw-hidden'); }
  function twHideMsg(){ twMsg.classList.add('tw-hidden'); }

  async function loadToday(){
    if (twDateEl) twDateEl.textContent = `Hari ini: ${toDDMMYYYY(new Date())}`;
    twShowMsg("Memuat data…");
    const res = await fetchJadwal();
    if (!res?.success || !Array.isArray(res.data)){ twShowMsg(res?.message || "Gagal memuat data."); return; }
    twHideMsg();

    const today = todayYMD();
    const rows = res.data.map(r => ({
      kode: r.kode ?? r["kode"] ?? r["kode unit"] ?? r["unit"] ?? "",
      lokasi: r.lokasi ?? r["lokasi"] ?? r["site"] ?? r["location"] ?? "",
      status: (r.status ?? r["status"] ?? "").toString(),
      tanggalYMD: anyToYMD(r.tanggal ?? r["tanggal"] ?? r["date"] ?? ""),
      tanggalDisp: dispFromAny(r.tanggal ?? r["tanggal"] ?? r["date"] ?? "")
    }))
    .filter(r => r.tanggalYMD === today)
    .sort((a,b)=> String(a.kode).localeCompare(String(b.kode)));

    twTbody.innerHTML = rows.length
      ? rows.map(r => `<tr><td>${r.kode||'-'}</td><td>${r.tanggalDisp}</td><td>${r.lokasi||'-'}</td><td>${r.status||''}</td></tr>`).join('')
      : `<tr><td colspan="4" class="tw-muted">Tidak ada jadwal untuk hari ini.</td></tr>`;
  }
  twRefBtn?.addEventListener("click", loadToday);
  loadToday(); setInterval(loadToday, AUTO_REFRESH_MS);

  // ---------- DRAFT (server-based) ----------
  const stTbody   = document.getElementById('stage-tbody');
  const stMsg     = document.getElementById('sw-msg');
  const btnAll    = document.getElementById('sw-submit-all');
  const btnClear  = document.getElementById('sw-clear'); // sekarang jadi "bersihkan draft" = set semua kosong? kita biarkan utk hapus tampilan saja

  const STATUS_LIST = ["Belum","Proses","Selesai","Ditunda","Cancel"];

  function stageInfo(msg){ stMsg.textContent = msg; stMsg.classList.remove('tw-hidden'); setTimeout(()=>stMsg.classList.add('tw-hidden'), 1600); }

  async function loadDraft(){
    const res = await fetchJadwal();
    if (!res?.success || !Array.isArray(res.data)){
      stTbody.innerHTML = `<tr><td colspan="5" class="tw-muted">${res?.message || "Gagal memuat"}</td></tr>`;
      return;
    }
    const today = todayYMD();
    const rows = res.data.map(r => ({
      kode: r.kode ?? r["kode"] ?? r["kode unit"] ?? "",
      lokasi: r.lokasi ?? r["lokasi"] ?? "",
      status: (r.status ?? r["status"] ?? "").toString(),
      tanggalYMD: anyToYMD(r.tanggal ?? r["tanggal"] ?? "")
    }))
    // Draft = hari ini & status kosong atau "Belum"
    .filter(r => r.tanggalYMD === today && (r.status.trim() === "" || r.status.trim().toLowerCase() === "belum"))
    .sort((a,b)=> String(a.kode).localeCompare(String(b.kode)));

    if (!rows.length){
      stTbody.innerHTML = `<tr><td colspan="5" class="tw-muted">Tidak ada draft.</td></tr>`;
      return;
    }

    stTbody.innerHTML = rows.map((r,i) => {
      const opts = STATUS_LIST.map(s => `<option value="${s}">${s}</option>`).join('');
      return `
        <tr data-idx="${i}">
          <td>${r.kode}</td>
          <td>${toDDMMYYYY(new Date(r.tanggalYMD))}</td>
          <td>${r.lokasi || '-'}</td>
          <td><select class="select-status">${opts}</select></td>
          <td class="row-actions">
            <button class="btn-row js-submit">Kirim</button>
          </td>
        </tr>
      `;
    }).join('');

    // simpan rows untuk dipakai saat kirim
    stTbody.dataset.rows = JSON.stringify(rows);
  }

  // Kirim satu baris
  stTbody?.addEventListener('click', async (ev) => {
    if (!ev.target.classList.contains('js-submit')) return;
    const tr = ev.target.closest('tr[data-idx]');
    if (!tr) return;
    const idx = Number(tr.dataset.idx);
    const rows = JSON.parse(stTbody.dataset.rows || "[]");
    const row = rows[idx]; if (!row) return;

    const sel = tr.querySelector('.select-status');
    const status = sel?.value || "Belum";

    const res = await postWorker({
      action : 'updateJadwalStatus',
      kode   : row.kode,
      tanggal: row.tanggalYMD,
      lokasi : row.lokasi || '',
      status : status
    });
    if (res?.success){
      stageInfo('✅ Status terkirim');
      await loadDraft();
      await loadToday();
    }else{
      alert(res?.message || 'Gagal mengirim status');
    }
  });

  // Kirim semua berdasarkan pilihan masing-masing baris
  btnAll?.addEventListener('click', async () => {
    const rows = JSON.parse(stTbody.dataset.rows || "[]");
    const trs = Array.from(stTbody.querySelectorAll('tr[data-idx]'));
    for (const tr of trs){
      const idx = Number(tr.dataset.idx);
      const row = rows[idx]; if (!row) continue;
      const status = tr.querySelector('.select-status')?.value || "Belum";
      const res = await postWorker({
        action : 'updateJadwalStatus',
        kode   : row.kode,
        tanggal: row.tanggalYMD,
        lokasi : row.lokasi || '',
        status
      });
      if (!(res?.success)){ alert(`Gagal: ${row.kode}`); return; }
    }
    stageInfo('✅ Semua status terkirim');
    await loadDraft();
    await loadToday();
  });

  // Tombol "Bersihkan Draft" sekarang sekadar refresh (karena draft berasal dari server)
  btnClear?.addEventListener('click', loadDraft);

  // init
  loadDraft();
  setInterval(loadDraft, AUTO_REFRESH_MS);
})();

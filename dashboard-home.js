// ==========================
// DASHBOARD — Hari Ini + Draft Jadwal
// ==========================
(() => {
  const WORKER_URL = "https://delicate-union-ad99.sayaryant.workers.dev/"; // trailing slash
  const AUTO_REFRESH_MS = 60_000;
  const STAGED_KEY = 'stagedJadwal';
  const bc = new BroadcastChannel('jadwal-inspeksi');

  // ---------- UTIL ----------
  const pad2 = n => String(n).padStart(2,'0');
  const toDDMMYYYY = d => `${pad2(d.getDate())}/${pad2(d.getMonth()+1)}/${d.getFullYear()}`;
  const todayYMD = () => { const d=new Date(); return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; };
  function anyToYMD(val){
    if (!val) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(val).trim());
    if (m){ const d = new Date(Number(m[3]), Number(m[2])-1, Number(m[1])); return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; }
    const d = new Date(val); if (!isNaN(d)) return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
    return "";
  }
  function dispFromAny(val){
    const ymd = anyToYMD(val);
    if (!ymd) return "-";
    const [y,m,d] = ymd.split('-');
    return `${d}/${m}/${y}`;
  }
  function pick(obj, keys, fuzzy){
    for (const k of keys){ if (obj[k]!=null && obj[k] !== "") return obj[k]; }
    const lower={}; Object.keys(obj).forEach(k=>lower[k.toLowerCase().trim()]=k);
    for (const k of keys){ const lk=k.toLowerCase().trim(); if (lower[lk] && obj[lower[lk]]!=="") return obj[lower[lk]]; }
    if (Array.isArray(fuzzy)){ for (const k of Object.keys(obj)){ const norm=k.toLowerCase(); if (fuzzy.some(f=>norm.includes(f))){ const v=obj[k]; if (v!=null && v!=="") return v; }}}
    return "";
  }

  async function postWorker(payload){
    const r = await fetch(WORKER_URL, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify(payload)
    });
    return await r.json();
  }

  // ---------- WIDGET HARI INI ----------
  const twTbody  = document.getElementById("tw-tbody");
  const twMsg    = document.getElementById("tw-msg");
  const twDateEl = document.getElementById("tw-date");
  const twRefBtn = document.getElementById("tw-refresh");

  function twShowMsg(t){ twMsg.textContent=t; twMsg.classList.remove('tw-hidden'); }
  function twHideMsg(){ twMsg.classList.add('tw-hidden'); }

  async function fetchJadwal(){
    try{
      const u = new URL(WORKER_URL); u.searchParams.set("action","getJadwal"); u.searchParams.set("ts", Date.now());
      const r = await fetch(u.toString()); const d = await r.json();
      if (d?.success && Array.isArray(d.data)) return d;
    }catch(e){}
    const rp = await fetch(WORKER_URL, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ action:"getJadwal" })});
    return await rp.json();
  }

  async function loadToday(){
    if (twDateEl) twDateEl.textContent = `Hari ini: ${toDDMMYYYY(new Date())}`;
    twShowMsg("Memuat data…");
    const res = await fetchJadwal();
    if (!res?.success || !Array.isArray(res.data)){ twShowMsg(res?.message || "Gagal memuat data."); return; }
    twHideMsg();

    const today = todayYMD();
    const mapped = res.data.map(row => {
      const kode    = pick(row, ["kode","code","kode unit","unit","code unit"], ["kode","unit","code"]);
      const tanggal = pick(row, ["tanggal","date","tgl"], ["tanggal","date","tgl"]);
      const lokasi  = pick(row, ["lokasi","location","site"], ["lokasi","site","workshop","pit"]);
      const status  = pick(row, ["status"], ["status","sudah","belum"]) || "-";
      const ymd     = anyToYMD(tanggal);
      return { kode, lokasi, status, tanggalYMD: ymd, tanggalDisp: dispFromAny(tanggal) };
    });
    const rows = mapped.filter(r => r.tanggalYMD === today)
                       .sort((a,b)=> String(a.kode).localeCompare(String(b.kode)));

    twTbody.innerHTML = rows.length
      ? rows.map(r => `<tr><td>${r.kode||'-'}</td><td>${r.tanggalDisp}</td><td>${r.lokasi||'-'}</td><td>${r.status||'-'}</td></tr>`).join('')
      : `<tr><td colspan="4" class="tw-muted">Tidak ada jadwal untuk hari ini.</td></tr>`;
  }

  twRefBtn?.addEventListener("click", loadToday);
  loadToday();
  setInterval(loadToday, AUTO_REFRESH_MS);

  // ---------- WIDGET DRAFT ----------
  const stTbody   = document.getElementById('stage-tbody');
  const stMsg     = document.getElementById('sw-msg');
  const btnAll    = document.getElementById('sw-submit-all');
  const btnClear  = document.getElementById('sw-clear');

  const STATUS_LIST = ["Belum","Proses","Selesai","Ditunda","Cancel"];

  function getStaged(){
    try{ return JSON.parse(localStorage.getItem(STAGED_KEY) || '[]'); }catch{ return []; }
  }
  function setStaged(arr){
    localStorage.setItem(STAGED_KEY, JSON.stringify(arr || []));
  }
  function renderStage(){
    const arr = getStaged();
    if (!arr.length){
      stTbody.innerHTML = `<tr><td colspan="5" class="tw-muted">Tidak ada draft.</td></tr>`;
      return;
    }
    stTbody.innerHTML = arr.map((r,i) => {
      const opts = STATUS_LIST.map(s => `<option value="${s}" ${s===r.status?'selected':''}>${s}</option>`).join('');
      return `
        <tr data-idx="${i}">
          <td>${r.kode || '-'}</td>
          <td>${r.tanggalDisp || dispFromAny(r.tanggalYMD)}</td>
          <td>${r.lokasi || '-'}</td>
          <td>
            <select class="select-status">${opts}</select>
          </td>
          <td class="row-actions">
            <button class="btn-row js-submit">Kirim</button>
            <button class="btn-row js-remove">Hapus</button>
          </td>
        </tr>`;
    }).join('');
  }
  function stageInfo(msg){ stMsg.textContent = msg; stMsg.classList.remove('tw-hidden'); setTimeout(()=>stMsg.classList.add('tw-hidden'), 1800); }

  // Delegasi event untuk tombol per baris
  stTbody?.addEventListener('click', async (ev) => {
    const tr = ev.target.closest('tr[data-idx]');
    if (!tr) return;
    const idx = Number(tr.dataset.idx);
    const arr = getStaged();
    const item = arr[idx];
    if (!item) return;

    if (ev.target.classList.contains('js-remove')){
      arr.splice(idx,1);
      setStaged(arr);
      renderStage();
      stageInfo('Draft dihapus.');
      return;
    }

    if (ev.target.classList.contains('js-submit')){
      // ambil status dari select
      const sel = tr.querySelector('.select-status');
      item.status = sel?.value || item.status || 'Belum';

      // kirim ke Sheet via Worker→Apps Script
      const payload = {
        action: 'submitJadwal',
        kode   : item.kode,
        tanggal: item.tanggalYMD,   // Apps Script terima yyyy-mm-dd
        lokasi : item.lokasi || '',
        status : item.status
      };
      const res = await postWorker(payload);
      if (res?.success){
        arr.splice(idx,1);
        setStaged(arr);
        renderStage();
        stageInfo('Jadwal terkirim ke Sheet.');
        // refresh “Hari Ini” biar kelihatan langsung
        loadToday();
      } else {
        alert(res?.message || 'Gagal mengirim jadwal.');
      }
    }
  });

  btnAll?.addEventListener('click', async () => {
    let arr = getStaged();
    if (!arr.length) return;
    for (let i=0;i<arr.length;i++){
      const item = arr[i];
      const status = item.status || 'Belum';
      const res = await postWorker({
        action:'submitJadwal',
        kode:item.kode, tanggal:item.tanggalYMD,
        lokasi:item.lokasi||'', status
      });
      if (!(res?.success)){
        alert(`Gagal kirim: ${item.kode} — ${res?.message || ''}`);
        return;
      }
    }
    setStaged([]);
    renderStage();
    stageInfo('Semua draft dikirim.');
    loadToday();
  });

  btnClear?.addEventListener('click', () => {
    setStaged([]);
    renderStage();
    stageInfo('Draft dibersihkan.');
  });

  // Terima broadcast realtime dari halaman Jadwal
  bc.onmessage = ev => {
    const msg = ev.data;
    if (!msg || msg.type !== 'jadwal:new') return;
    const item = msg.data;
    // simpan ke storage jika belum ada (kunci sederhana: kode+tgl+lokasi)
    const keyOf = r => `${r.kode}__${r.tanggalYMD}__${r.lokasi||''}`;
    const arr = getStaged();
    if (!arr.some(r => keyOf(r) === keyOf(item))){
      arr.unshift(item); // prepend biar muncul di atas
      setStaged(arr);
      renderStage();
      stageInfo('Draft baru diterima.');
    }
  };

  // init
  renderStage();
})();

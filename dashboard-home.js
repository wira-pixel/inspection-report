// ==========================
// DASHBOARD — Jadwal Hari Ini (dalam iframe)
// ==========================
(() => {
  const WORKER_URL = "https://delicate-union-ad99.sayaryant.workers.dev/"; // trailing slash
  const AUTO_REFRESH_MS = 60_000;

  // Elements
  const tbody  = document.getElementById("tw-tbody");
  const msgEl  = document.getElementById("tw-msg");
  const dateEl = document.getElementById("tw-date");
  const btnRef = document.getElementById("tw-refresh");
  if (!tbody || !msgEl || !dateEl) return;

  // --- Utils tanggal ---
  const pad2 = n => String(n).padStart(2,"0");
  const toDDMMYYYY = d => `${pad2(d.getDate())}/${pad2(d.getMonth()+1)}/${d.getFullYear()}`;
  const todayYMD = () => {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  };
  function anyToYMD(val){
    if (val == null || val === "") return "";
    if (typeof val === "number"){
      const epoch = new Date(Date.UTC(1899,11,30));
      const d = new Date(epoch.getTime() + val*86400000);
      return isNaN(d) ? "" : `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
    }
    const s = String(val).trim();
    let m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
    if (m){
      const d = new Date(Number(m[3]), Number(m[2])-1, Number(m[1]));
      return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
    }
    m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (m) return s;
    const d = new Date(s);
    if (!isNaN(d)) return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
    return "";
  }
  function formatForDisplay(val){
    if (typeof val === "number"){
      const epoch = new Date(Date.UTC(1899,11,30));
      const d = new Date(epoch.getTime() + val*86400000);
      return isNaN(d) ? "-" : toDDMMYYYY(d);
    }
    const s = String(val || "").trim();
    let m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
    if (m) return s;
    m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
    const d = new Date(s);
    return isNaN(d) ? "-" : toDDMMYYYY(d);
  }

  // pick field dgn fallback (getJadwal dari Apps Script mengembalikan key lowercase)
  function pick(obj, keys, fuzzy){
    for (const k of keys){ if (obj[k] != null && obj[k] !== "") return obj[k]; }
    const lower={}; Object.keys(obj).forEach(k=>lower[k.toLowerCase().trim()]=k);
    for (const k of keys){ const lk=k.toLowerCase().trim(); if (lower[lk] && obj[lower[lk]]!=="") return obj[lower[lk]]; }
    if (Array.isArray(fuzzy)){
      for (const k of Object.keys(obj)){
        const norm=k.toLowerCase();
        if (fuzzy.some(f=>norm.includes(f))){
          const v=obj[k]; if (v!=null && v!=="") return v;
        }
      }
    }
    return "";
  }

  // --- Fetch jadwal (GET, fallback POST) ---
  async function fetchJadwal(){
    try{
      const u = new URL(WORKER_URL);
      u.searchParams.set("action","getJadwal");
      u.searchParams.set("ts", Date.now());
      const r = await fetch(u.toString());
      const d = await r.json();
      if (d?.success && Array.isArray(d.data)) return d;
    }catch(e){}
    const rp = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({ action:"getJadwal" })
    });
    return await rp.json();
  }

  // --- UI helpers ---
  const showMsg = t => { msgEl.textContent = t; msgEl.classList.remove("tw-hidden"); };
  const hideMsg = () => { msgEl.classList.add("tw-hidden"); };

  function renderRows(rows){
    tbody.innerHTML = "";
    if (!rows.length){
      tbody.innerHTML = `<tr><td colspan="4" class="tw-muted">Tidak ada jadwal untuk hari ini.</td></tr>`;
      return;
    }
    for (const r of rows){
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${r.kode || "-"}</td>
        <td>${r.tanggalDisp}</td>
        <td>${r.lokasi || "-"}</td>
        <td>${r.status || "-"}</td>
      `;
      tbody.appendChild(tr);
    }
  }

  async function loadToday(){
    dateEl.textContent = `Hari ini: ${toDDMMYYYY(new Date())}`;

    showMsg("Memuat data…");
    const res = await fetchJadwal();
    if (!res?.success || !Array.isArray(res.data)){
      showMsg(res?.message || "Gagal memuat data.");
      return;
    }
    hideMsg();

    const today = todayYMD();
    const mapped = res.data.map(row => {
      const kode    = pick(row, ["kode","code","kode unit","unit","code unit"], ["kode","unit","code"]);
      const tanggal = pick(row, ["tanggal","date","tgl"], ["tanggal","date","tgl"]);
      const lokasi  = pick(row, ["lokasi","location","site"], ["lokasi","site","workshop","pit"]);
      const status  = pick(row, ["status"], ["status","sudah","belum"]);
      const ymd     = anyToYMD(tanggal);
      return { kode, lokasi, status, tanggalDisp: formatForDisplay(tanggal), tanggalYMD: ymd };
    });

    const todayRows = mapped
      .filter(r => r.tanggalYMD === today)
      .sort((a,b)=> String(a.kode).localeCompare(String(b.kode)));

    renderRows(todayRows);
  }

  // Events + auto refresh
  btnRef?.addEventListener("click", loadToday);
  document.addEventListener("DOMContentLoaded", loadToday);
  loadToday();
  setInterval(loadToday, AUTO_REFRESH_MS);
})();

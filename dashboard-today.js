// ==========================
// DASHBOARD — Jadwal Hari Ini
// ==========================
const WORKER_URL = "https://delicate-union-ad99.sayaryant.workers.dev/"; // trailing slash

(() => {
  const tbody   = document.getElementById("today-tbody");
  const msgEl   = document.getElementById("todayMessage");
  const dateEl  = document.getElementById("todayDateText");
  const btnRef  = document.getElementById("refreshToday");

  if (!tbody || !msgEl || !dateEl) return;

  // --- Utils tanggal ---
  function toDDMMYYYY(d){
    const dd = String(d.getDate()).padStart(2,"0");
    const mm = String(d.getMonth()+1).padStart(2,"0");
    const yy = d.getFullYear();
    return `${dd}/${mm}/${yy}`;
  }
  function todayYMD(){
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm   = String(d.getMonth()+1).padStart(2,"0");
    const dd   = String(d.getDate()).padStart(2,"0");
    return `${yyyy}-${mm}-${dd}`;               // untuk pembanding
  }
  function anyToYMD(val){ // normalisasi "tanggal" apapun -> 'yyyy-mm-dd' (local)
    if (val == null || val === "") return "";
    // number (Excel/Sheets serial)
    if (typeof val === "number"){
      const epoch = new Date(Date.UTC(1899,11,30));
      const d = new Date(epoch.getTime() + val*86400000);
      return isNaN(d) ? "" : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    }
    if (typeof val === "string"){
      const s = val.trim();
      // dd/mm/yyyy
      const m1 = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
      if (m1){
        const d = new Date(Number(m1[3]), Number(m1[2])-1, Number(m1[1]));
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
      }
      // yyyy-mm-dd
      const m2 = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
      if (m2) return s;
      // ISO string
      const d = new Date(s);
      if (!isNaN(d)){
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
      }
    }
    return "";
  }
  function formatForDisplay(val){ // tampilkan di tabel
    if (typeof val === "number"){
      const epoch = new Date(Date.UTC(1899,11,30));
      const d = new Date(epoch.getTime() + val*86400000);
      return isNaN(d) ? "-" : toDDMMYYYY(d);
    }
    if (typeof val === "string"){
      const m1 = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(val.trim());
      if (m1) return val;
      const m2 = /^(\d{4})-(\d{2})-(\d{2})$/.exec(val.trim());
      if (m2) return `${m2[3]}/${m2[2]}/${m2[1]}`;
      const d = new Date(val);
      if (!isNaN(d)) return toDDMMYYYY(d);
    }
    return String(val || "-");
  }

  // pick field dgn fallback (sheet getJadwal mengembalikan key lowercase berdasar header)
  function pick(obj, keys, fuzzy){
    for (const k of keys){ if (obj[k] != null && obj[k] !== "") return obj[k]; }
    const lower = {};
    Object.keys(obj).forEach(k => lower[k.toLowerCase().trim()] = k);
    for (const k of keys){
      const lk = k.toLowerCase().trim();
      if (lower[lk] && obj[lower[lk]] !== "") return obj[lower[lk]];
    }
    if (fuzzy && fuzzy.length){
      for (const k of Object.keys(obj)){
        const norm = k.toLowerCase();
        if (fuzzy.some(f => norm.includes(f))){
          const v = obj[k];
          if (v != null && v !== "") return v;
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

  function showMsg(t){ msgEl.textContent = t; msgEl.classList.remove("hidden"); }
  function hideMsg(){ msgEl.classList.add("hidden"); }

  function renderRows(rows){
    tbody.innerHTML = "";
    if (!rows.length){
      tbody.innerHTML = `<tr><td colspan="4" class="muted">Tidak ada jadwal untuk hari ini.</td></tr>`;
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
    // tampilkan tanggal hari ini
    const now = new Date();
    dateEl.textContent = `Hari ini: ${toDDMMYYYY(now)}`;

    showMsg("Memuat data…");
    const res = await fetchJadwal();
    if (!res?.success || !Array.isArray(res.data)){
      showMsg(res?.message || "Gagal memuat data.");
      return;
    }
    hideMsg();

    // map & filter untuk hari ini
    const today = todayYMD();
    const mapped = res.data.map(row => {
      // getJadwal() di Apps Script kamu: key = header lowercase
      const kode    = pick(row, ["kode","code","kode unit","unit","code unit"], ["kode","code","unit"]);
      const tanggal = pick(row, ["tanggal","date","tgl"], ["tanggal","date","tgl"]);
      const lokasi  = pick(row, ["lokasi","location","site"], ["lokasi","location","site","workshop","pit"]);
      const status  = pick(row, ["status"], ["status","sudah","belum"]);
      const ymd     = anyToYMD(tanggal);
      return {
        kode, lokasi, status,
        tanggalRaw : tanggal,
        tanggalYMD : ymd,
        tanggalDisp: formatForDisplay(tanggal)
      };
    });

    const todayRows = mapped.filter(r => r.tanggalYMD === today);

    // urutkan: kode asc (opsional)
    todayRows.sort((a,b) => String(a.kode).localeCompare(String(b.kode)));

    renderRows(todayRows);
  }

  // events & auto refresh
  btnRef?.addEventListener("click", loadToday);
  document.addEventListener("DOMContentLoaded", loadToday);
  loadToday();
  // refresh tiap 60 detik
  setInterval(loadToday, 60_000);
})();

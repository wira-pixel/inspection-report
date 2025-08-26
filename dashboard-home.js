// ==========================
// DASHBOARD — Hari Ini + Draft + Grafik (server-based)
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
    const d = new Date(v);
    if (!isNaN(d)) return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
    // dd/mm/yyyy fallback
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(v).trim());
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    return "";
  };
  const dispFromYMD = ymd => ymd ? ymd.split("-").reverse().join("/") : "-";
  const daysInMonth = (y,m1_12)=> new Date(y, m1_12, 0).getDate();

  async function postWorker(payload){
    const r = await fetch(WORKER_URL, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify(payload)
    });
    return await r.json();
  }
  async function fetchJadwal(){
    return await postWorker({ action:'getJadwal' });
  }

  // ---------- DOM ----------
  // Hari ini
  const twTbody  = document.getElementById("tw-tbody");
  const twMsg    = document.getElementById("tw-msg");
  const twDateEl = document.getElementById("tw-date");
  const twRefBtn = document.getElementById("tw-refresh");
  function twShowMsg(t){ twMsg.textContent=t; twMsg.classList.remove('tw-hidden'); }
  function twHideMsg(){ twMsg.classList.add('tw-hidden'); }

  // Draft
  const stTbody   = document.getElementById('stage-tbody');
  const stMsg     = document.getElementById('sw-msg');
  const btnAll    = document.getElementById('sw-submit-all');
  const btnClear  = document.getElementById('sw-clear');

  const STATUS_LIST = ["Belum","Proses","Selesai","Ditunda","Cancel"];
  function stageInfo(msg){ stMsg.textContent = msg; stMsg.classList.remove('tw-hidden'); setTimeout(()=>stMsg.classList.add('tw-hidden'), 1600); }

  // Grafik
  const monthPicker  = document.getElementById('monthPicker');
  const monthSummary = document.getElementById('monthSummary');
  let chartStatus, chartMonthly;

  function ensureCharts(){
    if (!chartStatus){
      chartStatus = new Chart(document.getElementById("chartStatus"), {
        type: "doughnut",
        data: { labels:["Selesai","Proses","Ditunda","Belum/Kosong"], datasets:[{ data:[0,0,0,0] }] },
        options: { plugins:{ legend:{ position:"bottom", labels:{ color:"#dbeeff" } } } }
      });
    }
    if (!chartMonthly){
      chartMonthly = new Chart(document.getElementById("chartMonthly"), {
        type: "bar",
        data: { labels:[], datasets:[
          { label:"Jadwal", data:[] },
          { label:"Selesai", data:[] },
        ]},
        options: {
          scales:{
            x:{ ticks:{ color:"#dbeeff" } },
            y:{ ticks:{ color:"#dbeeff" }, beginAtZero:true, precision:0 }
          },
          plugins:{ legend:{ labels:{ color:"#dbeeff" } } }
        }
      });
    }
  }

  function updateStatusChart(todayRows){
    const c = { Selesai:0, Proses:0, Ditunda:0, Belum:0 };
    for (const r of todayRows){
      const s = (r.status||"").toLowerCase();
      if (s==="selesai") c.Selesai++;
      else if (s==="proses") c.Proses++;
      else if (s==="ditunda") c.Ditunda++;
      else c.Belum++;
    }
    chartStatus.data.datasets[0].data = [c.Selesai,c.Proses,c.Ditunda,c.Belum];
    chartStatus.update();
  }

  function updateMonthlyChart(allRows){
    const v = monthPicker?.value;
    if (!/^\d{4}-\d{2}$/.test(v||"")) return;
    const [yy,mm] = v.split('-').map(Number);
    const dim = daysInMonth(yy, mm);
    const labels = Array.from({length:dim}, (_,i)=> String(i+1));
    const total = Array(dim).fill(0);
    const done  = Array(dim).fill(0);

    for (const r of allRows){
      if (!r.tanggalYMD) continue;
      const [y,m,d] = r.tanggalYMD.split('-').map(Number);
      if (y===yy && m===mm){
        total[d-1] += 1;
        if ((r.status||"").toLowerCase()==="selesai") done[d-1] += 1;
      }
    }
    const sumT = total.reduce((a,b)=>a+b,0);
    const sumD = done.reduce((a,b)=>a+b,0);
    const pct  = sumT ? Math.round(sumD/sumT*100) : 0;
    if (monthSummary) monthSummary.textContent = `Total bulan ini: ${sumT} jadwal • Selesai: ${sumD} (${pct}%)`;

    chartMonthly.data.labels = labels;
    chartMonthly.data.datasets[0].data = total;
    chartMonthly.data.datasets[1].data = done;
    chartMonthly.update();
  }

  // ---------- RENDER ----------
  function normalizeRows(raw){
    return raw.map(r => ({
      kode       : r.kode ?? r["kode"] ?? r["kode unit"] ?? r["unit"] ?? "",
      lokasi     : r.lokasi ?? r["lokasi"] ?? r["site"] ?? r["location"] ?? "",
      status     : (r.status ?? r["status"] ?? "").toString().trim(),
      tanggalYMD : anyToYMD(r.tanggal ?? r["tanggal"] ?? r["date"] ?? "")
    })).filter(x => !!x.tanggalYMD);
  }

  function renderToday(rows){
    const today = todayYMD();
    const list = rows.filter(r => r.tanggalYMD === today)
                     .sort((a,b)=> String(a.kode).localeCompare(String(b.kode)));

    twTbody.innerHTML = list.length
      ? list.map(r => `<tr><td>${r.kode||'-'}</td><td>${dispFromYMD(r.tanggalYMD)}</td><td>${r.lokasi||'-'}</td><td>${r.status||''}</td></tr>`).join('')
      : `<tr><td colspan="4" class="tw-muted">Tidak ada jadwal untuk hari ini.</td></tr>`;

    updateStatusChart(list);
  }

  function renderDraft(rows){
    const today = todayYMD();
    const list = rows.filter(r => r.tanggalYMD === today && (r.status === "" || r.status.toLowerCase() === "belum"))
                     .sort((a,b)=> String(a.kode).localeCompare(String(b.kode)));

    if (!list.length){
      stTbody.innerHTML = `<tr><td colspan="5" class="tw-muted">Tidak ada draft.</td></tr>`;
      stTbody.dataset.rows = "[]";
      return;
    }

    stTbody.innerHTML = list.map((r,i) => {
      const opts = STATUS_LIST.map(s => `<option value="${s}">${s}</option>`).join('');
      return `
        <tr data-idx="${i}">
          <td>${r.kode}</td>
          <td>${dispFromYMD(r.tanggalYMD)}</td>
          <td>${r.lokasi || '-'}</td>
          <td><select class="select-status">${opts}</select></td>
          <td class="row-actions"><button class="btn-row js-submit">Kirim</button></td>
        </tr>`;
    }).join('');
    stTbody.dataset.rows = JSON.stringify(list);
  }

  // ---------- AKSI KIRIM ----------
  async function sendStatus(row, status){
    const res = await postWorker({
      action : 'updateJadwalStatus',
      kode   : row.kode,
      tanggal: row.tanggalYMD,
      lokasi : row.lokasi || '',
      status : status || ''
    });
    return res;
  }

  stTbody?.addEventListener('click', async (ev) => {
    if (!ev.target.classList.contains('js-submit')) return;
    const tr = ev.target.closest('tr[data-idx]');
    const idx = Number(tr.dataset.idx);
    const rows = JSON.parse(stTbody.dataset.rows || "[]");
    const row = rows[idx]; if (!row) return;

    const status = tr.querySelector('.select-status')?.value || "Belum";
    const res = await sendStatus(row, status);
    if (res?.success){
      stageInfo('✅ Status terkirim');
      await loadAll(); // refresh semuanya termasuk grafik
    }else{
      alert(res?.message || 'Gagal mengirim status');
    }
  });

  btnAll?.addEventListener('click', async () => {
    const rows = JSON.parse(stTbody.dataset.rows || "[]");
    const trs = Array.from(stTbody.querySelectorAll('tr[data-idx]'));
    for (const tr of trs){
      const idx = Number(tr.dataset.idx);
      const row = rows[idx]; if (!row) continue;
      const status = tr.querySelector('.select-status')?.value || "Belum";
      const res = await sendStatus(row, status);
      if (!(res?.success)){ alert(`Gagal: ${row.kode}`); return; }
    }
    stageInfo('✅ Semua status terkirim');
    await loadAll();
  });

  btnClear?.addEventListener('click', loadAll); // server-based, jadi refresh saja

  // ---------- LOAD SEMUA + GRAFIK ----------
  async function loadAll(){
    try{
      if (twDateEl) twDateEl.textContent = `Hari ini: ${toDDMMYYYY(new Date())}`;
      twShowMsg("Memuat data…"); stMsg?.classList.add('tw-hidden');
      ensureCharts();

      const res = await fetchJadwal();
      if (!res?.success || !Array.isArray(res.data)){
        twShowMsg(res?.message || "Gagal memuat data.");
        stTbody.innerHTML = `<tr><td colspan="5" class="tw-muted">${res?.message || "Gagal memuat"}</td></tr>`;
        return;
      }
      twHideMsg();

      const rows = normalizeRows(res.data);

      // inisialisasi monthPicker default (bulan ini)
      if (monthPicker && !monthPicker.value){
        const d = new Date();
        monthPicker.value = `${d.getFullYear()}-${pad2(d.getMonth()+1)}`;
      }

      renderToday(rows);
      renderDraft(rows);
      updateMonthlyChart(rows);

      monthPicker && (monthPicker.onchange = () => updateMonthlyChart(rows));
    }catch(err){
      twShowMsg(`Gagal memuat: ${err.message}`);
    }
  }

  // ---------- EVENTS ----------
  document.getElementById("tw-refresh")?.addEventListener("click", loadAll);

  // init & auto refresh
  loadAll();
  setInterval(loadAll, AUTO_REFRESH_MS);
})();

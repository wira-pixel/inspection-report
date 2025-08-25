// Realtime broadcast + staging lokal untuk draft jadwal (tidak kirim ke Sheet)
(() => {
  const JADWAL_CHANNEL = new BroadcastChannel('jadwal-inspeksi');
  const STAGED_KEY = 'stagedJadwal';

  const form = document.getElementById('jadwalForm');
  if (!form) return;

  const kodeEl    = document.getElementById('kode');
  const tanggalEl = document.getElementById('tanggal');
  const lokasiEl  = document.getElementById('lokasi');
  const toastEl   = document.getElementById('toast');

  const pad2 = n => String(n).padStart(2,'0');

  function toYMD(any){
    if (!any) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(any)) return any;           // yyyy-mm-dd
    const m1 = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(any).trim()); // dd/mm/yyyy
    if (m1) return `${m1[3]}-${m1[2]}-${m1[1]}`;
    const d = new Date(any);
    if (!isNaN(d)) return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
    return "";
  }
  function toDisp(any){
    const ymd = toYMD(any);
    if (!ymd) return "-";
    const [y,m,d] = ymd.split('-');
    return `${d}/${m}/${y}`;
  }

  function pushStaged(item){
    try{
      const arr = JSON.parse(localStorage.getItem(STAGED_KEY) || '[]');
      arr.unshift(item); // prepend biar draft terbaru di atas
      localStorage.setItem(STAGED_KEY, JSON.stringify(arr.slice(0,200)));
    }catch{}
  }
  function broadcastDraft(item){
    JADWAL_CHANNEL.postMessage({ type: 'jadwal:new', data: item });
  }
  function toast(msg){
    if (!toastEl) { alert(msg); return; }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    setTimeout(()=>toastEl.classList.remove('show'), 1800);
  }

  // Ambil alih submit: hanya staging + broadcast (tidak ke Sheet)
  const onSubmit = (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();  // blok handler submit lain (kalau ada)

    const kode = (kodeEl?.value || '').trim();
    const tgl  = (tanggalEl?.value || '').trim();
    const lok  = (lokasiEl?.value || '').trim();

    if (!kode || !tgl){
      alert('Kode & Tanggal wajib diisi.');
      return;
    }

    const item = {
      kode: kode,
      lokasi: lok,
      tanggalYMD : toYMD(tgl),
      tanggalDisp: toDisp(tgl),
      status     : 'Belum' // akan diedit di Dashboard
    };

    pushStaged(item);
    broadcastDraft(item);

    form.reset();
    toast('✅ Draft jadwal disimpan & dikirim ke Dashboard');
  };

  // Pakai capture=true agar listener ini dieksekusi lebih dulu
  form.addEventListener('submit', onSubmit, true);
})();

// ==========================
// LOGIN & REGISTER
// ==========================
const authForm = document.getElementById('authForm');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const authOutput = document.getElementById('authOutput');
const authContainer = document.getElementById('authContainer');
const formContainer = document.getElementById('formContainer');
const authUsername = document.getElementById('authUsername');
const authPassword = document.getElementById('authPassword');

// URL App Script Web App untuk auth
const APP_SCRIPT_URL = "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec"; // ganti dengan ID Web App mu

// Fungsi fetch ke Apps Script
async function postToSheet(payload) {
  try {
    const res = await fetch(APP_SCRIPT_URL, {
      method: 'POST',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch(err) {
    return { success:false, message: '❌ Koneksi gagal' };
  }
}

// Login
loginBtn.addEventListener('click', async () => {
  const username = authUsername.value.trim();
  const password = authPassword.value.trim();
  if(!username || !password){
    authOutput.innerHTML = '❌ Username & password harus diisi';
    authOutput.className = 'alert alert-danger mt-3 rounded-3';
    authOutput.classList.remove('d-none');
    return;
  }

  authOutput.innerHTML = '🔄 Memproses...';
  authOutput.className = 'alert alert-info mt-3 rounded-3';
  authOutput.classList.remove('d-none');

  const result = await postToSheet({ action:'login', username, password });
  if(result.success){
    authOutput.classList.add('d-none');
    authContainer.classList.add('d-none');
    formContainer.classList.remove('d-none');
    setToday();
  } else {
    authOutput.innerHTML = '❌ ' + result.message;
    authOutput.className = 'alert alert-danger mt-3 rounded-3';
  }
});

// Register
registerBtn.addEventListener('click', async () => {
  const username = authUsername.value.trim();
  const password = authPassword.value.trim();
  if(!username || !password){
    authOutput.innerHTML = '❌ Username & password harus diisi';
    authOutput.className = 'alert alert-danger mt-3 rounded-3';
    authOutput.classList.remove('d-none');
    return;
  }

  authOutput.innerHTML = '🔄 Memproses pendaftaran...';
  authOutput.className = 'alert alert-info mt-3 rounded-3';
  authOutput.classList.remove('d-none');

  const result = await postToSheet({ action:'register', username, password });
  if(result.success){
    authOutput.innerHTML = '✅ Registrasi berhasil, silahkan login';
    authOutput.className = 'alert alert-success mt-3 rounded-3';
  } else {
    authOutput.innerHTML = '❌ ' + result.message;
    authOutput.className = 'alert alert-danger mt-3 rounded-3';
  }
});

// ==========================
// FORM INSPEKSI (ORIGINAL)
// ==========================

const form = document.getElementById('myForm');
const itemsTableBody = document.querySelector('#itemsTable tbody');
const output = document.getElementById('output');
const overlay = document.getElementById('overlay');
let currentMainRow = null;

// URL Cloudflare Worker → ganti dengan URL Worker kamu
const CLOUD_FLARE_URL = "https://delicate-union-ad99.sayaryant.workers.dev/";

// Fungsi set tanggal hari ini
function setToday() {
  const el = document.getElementById('Date');
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth()+1).padStart(2,'0');
  const dd = String(today.getDate()).padStart(2,'0');
  el.value = `${yyyy}-${mm}-${dd}`;
}

// ==========================
// Tambah Row & SubRow
// ==========================
function addRow() {
  const row = document.createElement('tr');
  row.className = 'main-row';
  row.innerHTML = `
    <td><input type="text" name="description[]" class="form-control" placeholder="..." required></td>
    <td><input type="text" name="condition[]" class="form-control" placeholder="..." required></td>
    <td>
      <input type="file" name="file[]" accept="image/*" class="form-control fileInput">
      <img class="img-preview" style="display:none;">
    </td>
    <td><input type="text" name="partNumber[]" class="form-control" placeholder="Part Number"></td>
    <td><input type="text" name="namaBarang[]" class="form-control" placeholder="Nama Barang"></td>
    <td><input type="number" name="qty[]" class="form-control" placeholder="0" min="0"></td>
    <td><input type="text" name="satuan[]" class="form-control" placeholder="satuan"></td>
    <td class="text-center"><input type="checkbox" name="masukFPB[]"></td>
    <td class="text-center"><button type="button" class="btn btn-danger btn-sm removeRowBtn">Hapus</button></td>
  `;
  setupRow(row);
  itemsTableBody.appendChild(row);
  currentMainRow = row;
}

function addSubRow() {
  if (!currentMainRow) {
    alert('Tambahkan baris utama terlebih dahulu!');
    return;
  }
  const row = document.createElement('tr');
  row.className = 'sub-row';
  row.innerHTML = `
    <td class="no-border-left"></td>
    <td class="no-border-left"></td>
    <td class="no-border-left"></td>
    <td><input type="text" name="partNumber[]" class="form-control" placeholder="Part Number"></td>
    <td><input type="text" name="namaBarang[]" class="form-control" placeholder="Nama Barang"></td>
    <td><input type="number" name="qty[]" class="form-control" placeholder="0" min="0"></td>
    <td><input type="text" name="satuan[]" class="form-control" placeholder="satuan"></td>
    <td class="text-center"><input type="checkbox" name="masukFPB[]"></td>
    <td class="text-center"><button type="button" class="btn btn-danger btn-sm removeRowBtn">Hapus</button></td>
  `;
  setupRow(row, true);
  
  const mainRowIndex = Array.from(itemsTableBody.children).indexOf(currentMainRow);
  let insertAfter = currentMainRow;
  for (let i = mainRowIndex + 1; i < itemsTableBody.children.length; i++) {
    if (itemsTableBody.children[i].classList.contains('sub-row')) insertAfter = itemsTableBody.children[i];
    else break;
  }
  insertAfter.after(row);
}

function setupRow(row, isSub=false){
  const fileInput = row.querySelector('.fileInput');
  const imgPreview = row.querySelector('.img-preview');
  if(fileInput){
    fileInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if(file){
        const reader = new FileReader();
        reader.onload = ev => {
          imgPreview.src = ev.target.result;
          imgPreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
      } else { imgPreview.src=''; imgPreview.style.display='none'; }
    });
  }
  
  row.querySelector('.removeRowBtn').addEventListener('click', () => {
    if(row.classList.contains('main-row')){
      const rowIndex = Array.from(itemsTableBody.children).indexOf(row);
      for(let i=rowIndex+1;i<itemsTableBody.children.length;i++){
        if(itemsTableBody.children[i].classList.contains('sub-row')) { itemsTableBody.children[i].remove(); i--; }
        else break;
      }
    }
    row.remove();
    if(itemsTableBody.children.length===0) addRow();
  });

  row.addEventListener('click', ()=>{
    if(row.classList.contains('main-row')) currentMainRow = row;
    else{
      let mainRow = row.previousElementSibling;
      while(mainRow && !mainRow.classList.contains('main-row')) mainRow = mainRow.previousElementSibling;
      currentMainRow = mainRow;
    }
  });
}

// Event listener tambah row
document.getElementById('addRowBtn').addEventListener('click', addRow);
document.getElementById('addSubRowBtn').addEventListener('click', addSubRow);
addRow();

// ==========================
// SUBMIT FORM
// ==========================
form.addEventListener('submit', async e=>{
  e.preventDefault();
  overlay.classList.remove('d-none');
  const allInputs = form.querySelectorAll('input, button, select, textarea');
  allInputs.forEach(el=>el.disabled=true);

  const items = [];
  const rows = Array.from(itemsTableBody.querySelectorAll('tr'));
  for(let row of rows){
    const description = row.querySelector('input[name="description[]"]')?.value||'';
    const condition = row.querySelector('input[name="condition[]"]')?.value||'';
    const partNumber = row.querySelector('input[name="partNumber[]"]')?.value||'';
    const namaBarang = row.querySelector('input[name="namaBarang[]"]')?.value||'';
    const qty = row.querySelector('input[name="qty[]"]')?.value||0;
    const satuan = row.querySelector('input[name="satuan[]"]')?.value||'';
    const masukFPB = row.querySelector('input[name="masukFPB[]"]')?.checked||false;

    const fileInput = row.querySelector('input[type="file"]');
    let fileData = null;
    if(fileInput && fileInput.files[0]){
      fileData = await new Promise(resolve=>{
        const reader = new FileReader();
        reader.onload=e=>resolve(e.target.result);
        reader.readAsDataURL(fileInput.files[0]);
      });
    }

    items.push({ description, condition, partNumber, namaBarang, qty, satuan, masukFPB, file:fileData, fileName:fileInput?.files[0]?.name, isSubRow:row.classList.contains('sub-row') });
  }

  const formData = {
    date: form.date.value,
    site: form.site.value,
    codeUnit: form.codeUnit.value,
    hourMeter: form.hourMeter.value,
    inspectedBy: form.inspectedBy.value,
    priority: form.priority.value,
    items
  };

  try{
    const res = await fetch(CLOUD_FLARE_URL,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify(formData)
    });
    const result = await res.json();
    output.innerHTML = result.message + (result.pdfUrl?` <a href="${result.pdfUrl}" target="_blank">Lihat PDF</a>`:'');
    output.classList.remove('d-none');
    form.reset();
    itemsTableBody.innerHTML='';
    addRow();
    setToday();
  } catch(err){
    console.error("Error submit:",err);
    output.innerHTML = "❌ Gagal mengirim data.";
    output.classList.remove('d-none');
  } finally{
    overlay.classList.add('d-none');
    allInputs.forEach(el=>el.disabled=false);
  }
});

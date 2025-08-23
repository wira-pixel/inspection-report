document.addEventListener('DOMContentLoaded', () => {

  // ==========================
  // LOGIN & REGISTER
  // ==========================
  const authForm = document.getElementById('authForm');
  const loginBtn = document.getElementById('loginBtn');
  const registerBtn = document.getElementById('registerBtn');
  const authOutput = document.getElementById('authOutput');
  const authContainer = document.getElementById('authContainer');
  const formContainer = document.getElementById('formContainer');

  const registerForm = document.getElementById('registerForm');
  const toRegister = document.getElementById('toRegister');
  const toLogin = document.getElementById('toLogin');

  // URL Cloudflare Worker
  const CLOUD_FLARE_URL = "https://delicate-union-ad99.sayaryant.workers.dev/";

  async function postToSheet(payload){
    try{
      const res = await fetch(CLOUD_FLARE_URL,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify(payload)
      });
      if(!res.ok) throw new Error("HTTP "+res.status);
      const data = await res.json();
      console.log("Response:", data);
      return data;
    } catch(err){
      console.error("Error postToSheet:", err);
      return {success:false, message:'❌ Koneksi gagal. Pastikan Web App sudah di-deploy dan URL benar.'};
    }
  }

  // LOGIN
  if(loginBtn){
    loginBtn.addEventListener('click', async ()=>{
      const username = document.getElementById('authUsernameLogin')?.value.trim();
      const password = document.getElementById('authPasswordLogin')?.value.trim();
      if(!username || !password){
        authOutput.innerHTML='❌ Username & password harus diisi';
        authOutput.className='alert alert-danger mt-3 rounded-3';
        return;
      }
      authOutput.innerHTML='🔄 Memproses...';
      authOutput.className='alert alert-info mt-3 rounded-3';

      const result = await postToSheet({action:'login', username, password});
      if(result.success){
        authOutput.classList.add('d-none');
        authContainer.classList.add('d-none');
        formContainer.classList.remove('d-none');
        setToday();
      } else {
        authOutput.innerHTML='❌ '+result.message;
        authOutput.className='alert alert-danger mt-3 rounded-3';
      }
    });
  }

  // SWITCH LOGIN ↔ REGISTER
  if(toRegister && registerForm){
    toRegister.addEventListener('click', () => {
      authForm.classList.add('d-none');
      registerForm.classList.remove('d-none');
      toRegister.classList.add('d-none');
      toLogin.classList.remove('d-none');
    });
  }
  if(toLogin && registerForm){
    toLogin.addEventListener('click', () => {
      registerForm.classList.add('d-none');
      authForm.classList.remove('d-none');
      toLogin.classList.add('d-none');
      toRegister.classList.remove('d-none');
    });
  }

  // REGISTER
  const registerBtnSubmit = document.getElementById('registerBtnSubmit');
  if(registerBtnSubmit){
    registerBtnSubmit.addEventListener('click', async ()=>{
      const username = document.getElementById('authUsernameRegister')?.value.trim();
      const password = document.getElementById('authPasswordRegister')?.value.trim();
      if(!username || !password){
        authOutput.innerHTML='❌ Username & password harus diisi';
        authOutput.className='alert alert-danger mt-3 rounded-3';
        return;
      }
      authOutput.innerHTML='🔄 Memproses pendaftaran...';
      authOutput.className='alert alert-info mt-3 rounded-3';

      const result = await postToSheet({action:'register', username, password});
      if(result.success){
        authOutput.innerHTML='✅ Registrasi berhasil, silahkan login';
        authOutput.className='alert alert-success mt-3 rounded-3';
      } else {
        authOutput.innerHTML='❌ '+result.message;
        authOutput.className='alert alert-danger mt-3 rounded-3';
      }
    });
  }

  // ==========================
  // FORM INSPEKSI DYNAMIC
  // ==========================
  const inspectionForm = document.getElementById('inspectionForm');

  // Tambahkan table container di HTML jika belum ada
  let itemsTableBody;
  if(!document.getElementById('itemsTable')){
    const tableContainer = document.createElement('div');
    tableContainer.innerHTML = `
      <h3 class="text-center mb-3 text-gradient fw-bold">Detail Inspection</h3>
      <div class="table-responsive">
        <table class="table table-striped table-dark table-hover" id="itemsTable">
          <thead>
            <tr>
              <th>Description</th>
              <th>Condition</th>
              <th>Gambar</th>
              <th>Part Number</th>
              <th>Nama Barang</th>
              <th>Qty</th>
              <th>Satuan</th>
              <th>Masuk FPB</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
        <div class="mt-2">
          <button type="button" id="addRowBtn" class="btn btn-gradient btn-sm">Tambah Item</button>
          <button type="button" id="addSubRowBtn" class="btn btn-gradient btn-sm">Tambah Baris FPB</button>
        </div>
      </div>
    `;
    formContainer.appendChild(tableContainer);
  }
  itemsTableBody = document.querySelector('#itemsTable tbody');
  let currentMainRow = null;

  // SET TODAY
  function setToday(){
    const dateInput = document.getElementById('Date');
    if(dateInput){
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth()+1).padStart(2,'0');
      const dd = String(today.getDate()).padStart(2,'0');
      dateInput.value = `${yyyy}-${mm}-${dd}`;
    }
  }

  // ==========================
  // Tambah Row & SubRow
  // ==========================
  function addRow(){
    const row = document.createElement('tr');
    row.className = 'main-row';
    row.innerHTML = `
      <td><input type="text" name="description[]" class="form-control" required></td>
      <td><input type="text" name="condition[]" class="form-control" required></td>
      <td><input type="file" name="file[]" accept="image/*" class="form-control fileInput"><img class="img-preview" style="display:none;width:50px;"></td>
      <td><input type="text" name="partNumber[]" class="form-control"></td>
      <td><input type="text" name="namaBarang[]" class="form-control"></td>
      <td><input type="number" name="qty[]" class="form-control" min="0"></td>
      <td><input type="text" name="satuan[]" class="form-control"></td>
      <td class="text-center"><input type="checkbox" name="masukFPB[]"></td>
      <td class="text-center"><button type="button" class="btn btn-danger btn-sm removeRowBtn">Hapus</button></td>
    `;
    setupRow(row);
    itemsTableBody.appendChild(row);
    currentMainRow = row;
  }

  function addSubRow(){
    if(!currentMainRow){ alert('Tambahkan baris utama terlebih dahulu!'); return; }
    const row = document.createElement('tr');
    row.className = 'sub-row';
    row.innerHTML = `
      <td class="no-border-left"></td>
      <td class="no-border-left"></td>
      <td class="no-border-left"></td>
      <td><input type="text" name="partNumber[]" class="form-control"></td>
      <td><input type="text" name="namaBarang[]" class="form-control"></td>
      <td><input type="number" name="qty[]" class="form-control" min="0"></td>
      <td><input type="text" name="satuan[]" class="form-control"></td>
      <td class="text-center"><input type="checkbox" name="masukFPB[]"></td>
      <td class="text-center"><button type="button" class="btn btn-danger btn-sm removeRowBtn">Hapus</button></td>
    `;
    setupRow(row);
    let insertAfter = currentMainRow;
    let index = Array.from(itemsTableBody.children).indexOf(currentMainRow);
    for(let i=index+1;i<itemsTableBody.children.length;i++){
      if(itemsTableBody.children[i].classList.contains('sub-row')) insertAfter=itemsTableBody.children[i];
      else break;
    }
    insertAfter.after(row);
  }

  function setupRow(row){
    const fileInput = row.querySelector('.fileInput');
    const imgPreview = row.querySelector('.img-preview');
    if(fileInput){
      fileInput.addEventListener('change', e=>{
        const file = e.target.files[0];
        if(file){
          const reader = new FileReader();
          reader.onload = ev=>{
            imgPreview.src = ev.target.result;
            imgPreview.style.display='block';
          };
          reader.readAsDataURL(file);
        } else { imgPreview.src=''; imgPreview.style.display='none'; }
      });
    }

    row.querySelector('.removeRowBtn')?.addEventListener('click', ()=>{
      if(row.classList.contains('main-row')){
        let i = Array.from(itemsTableBody.children).indexOf(row)+1;
        while(i<itemsTableBody.children.length && itemsTableBody.children[i].classList.contains('sub-row')){
          itemsTableBody.children[i].remove();
        }
      }
      row.remove();
      if(itemsTableBody.children.length===0) addRow();
    });

    row.addEventListener('click', ()=>{
      if(row.classList.contains('main-row')) currentMainRow=row;
      else{
        let mainRow = row.previousElementSibling;
        while(mainRow && !mainRow.classList.contains('main-row')) mainRow = mainRow.previousElementSibling;
        currentMainRow=mainRow;
      }
    });
  }

  document.getElementById('addRowBtn')?.addEventListener('click', addRow);
  document.getElementById('addSubRowBtn')?.addEventListener('click', addSubRow);
  addRow();

  // ==========================
  // SUBMIT FORM INSPEKSI
  // ==========================
  inspectionForm?.addEventListener('submit', async e=>{
    e.preventDefault();
    const rows = Array.from(itemsTableBody.querySelectorAll('tr'));
    const items = [];
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
      items.push({description, condition, partNumber, namaBarang, qty, satuan, masukFPB, file:fileData, fileName:fileInput?.files[0]?.name, isSubRow:row.classList.contains('sub-row')});
    }

    const payload = {
      action:'submitForm',
      date: document.getElementById('Date')?.value || '',
      site: document.getElementById('site')?.value || '',
      codeUnit: document.getElementById('codeUnit')?.value || '',
      hourMeter: document.getElementById('hourMeter')?.value || '',
      inspectedBy: document.getElementById('inspectedBy')?.value || '',
      priority: document.getElementById('priority')?.value || '',
      items
    };

    const result = await postToSheet(payload);
    output.innerHTML = result.message + (result.pdfUrl?` <a href="${result.pdfUrl}" target="_blank">Lihat PDF</a>`:'');
    output.classList.remove('d-none');

    inspectionForm.reset();
    itemsTableBody.innerHTML='';
    addRow();
    setToday();
  });

});

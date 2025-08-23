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

  // Fungsi fetch ke Worker (payload fleksibel)
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

  // Login
  if(loginBtn){
    loginBtn.addEventListener('click', async ()=>{
      const usernameEl = document.getElementById('authUsernameLogin');
      const passwordEl = document.getElementById('authPasswordLogin');
      const username = usernameEl?.value.trim();
      const password = passwordEl?.value.trim();
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

  // Switch login ↔ register
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

  // Register
  const registerBtnSubmit = document.getElementById('registerBtnSubmit');
  if(registerBtnSubmit){
    registerBtnSubmit.addEventListener('click', async ()=>{
      const usernameEl = document.getElementById('authUsernameRegister');
      const passwordEl = document.getElementById('authPasswordRegister');
      const username = usernameEl?.value.trim();
      const password = passwordEl?.value.trim();
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
  // FORM INSPEKSI
  // ==========================
  const form = document.getElementById('inspectionForm');
  const output = document.getElementById('output');

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

  if(form){
    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const unitNumber = document.getElementById('unitNumber')?.value || '';
      const inspectorName = document.getElementById('inspectorName')?.value || '';
      const condition = document.getElementById('condition')?.value || '';

      const payload = {
        action:'submitInspection',
        unitNumber,
        inspectorName,
        condition,
      };

      const result = await postToSheet(payload);
      output.innerHTML = result.message + (result.pdfUrl?` <a href="${result.pdfUrl}" target="_blank">Lihat PDF</a>`:'');
      output.classList.remove('d-none');

      form.reset();
    });
  }

});

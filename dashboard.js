document.addEventListener("DOMContentLoaded", () => {
  const buttons = document.querySelectorAll(".sidebar button");
  const iframe = document.getElementById("iframe-content");
  const title = document.getElementById("panel-title");

  // Login
loginBtn.addEventListener('click', async ()=>{
  const username = document.getElementById('authUsernameLogin').value.trim();
  const password = document.getElementById('authPasswordLogin').value.trim();
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

// Switch login/register
toRegister.addEventListener('click', ()=>{
  authForm.classList.add('d-none');
  registerForm.classList.remove('d-none');
  toRegister.classList.add('d-none');
  toLogin.classList.remove('d-none');
});
toLogin.addEventListener('click', ()=>{
  registerForm.classList.add('d-none');
  authForm.classList.remove('d-none');
  toLogin.classList.add('d-none');
  toRegister.classList.remove('d-none');
});

// Register
document.getElementById('registerBtnSubmit').addEventListener('click', async ()=>{
  const username = document.getElementById('authUsernameRegister').value.trim();
  const password = document.getElementById('authPasswordRegister').value.trim();
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

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const page = btn.dataset.page;
      if (page === "home") {
        iframe.src = "about:blank";
        title.textContent = "Dashboard Utama";
        iframe.contentDocument?.write("<h2 style='padding:20px'>Selamat datang di Dashboard</h2>");
      } else {
        iframe.src = page;
        title.textContent = btn.textContent.replace("🏠 ","").replace("📝 ","").replace("💾 ","").replace("📅 ","");
      }
    });
  });
});


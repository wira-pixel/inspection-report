document.addEventListener("DOMContentLoaded", () => {
  const buttons = document.querySelectorAll(".sidebar button");
  const iframe = document.getElementById("iframe-content");
  const title = document.getElementById("panel-title");

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

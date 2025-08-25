document.addEventListener("DOMContentLoaded", () => {
  const buttons = document.querySelectorAll(".sidebar button");
  const iframe = document.getElementById("iframe-content");
  const title = document.getElementById("panel-title");

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const page = btn.dataset.page;
      const isHome = page === "home" || page === "dashboard-home.html";

      if (isHome) {
        // Muat halaman dashboard terpisah (HTML + CSS + JS sendiri)
        iframe.src = "dashboard-home.html";
        title.textContent = "Dashboard Utama";
        return; // jangan write() manual lagi
      }

      // Halaman lain tetap seperti biasa
      iframe.src = page;
      // Bersihkan emoji/prefix dari label tombol
      title.textContent = btn.textContent
        .replace("🏠 ","")
        .replace("📝 ","")
        .replace("💾 ","")
        .replace("📅 ","")
        .trim();
    });
  });

  // (Opsional) jika mau default langsung ke Dashboard saat pertama kali load:
  // const defaultBtn = Array.from(buttons).find(b => b.dataset.page === "home" || b.dataset.page === "dashboard-home.html");
  // defaultBtn?.click();
});

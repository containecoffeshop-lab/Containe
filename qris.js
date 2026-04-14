document.addEventListener("DOMContentLoaded", () => {
  const qrisPopup = document.getElementById("qrisPopup");
  const closeQris = document.getElementById("closeQris");
  const qrisDone = document.getElementById("qrisDone");
  const finalizeBtn = document.getElementById("finalizeOrder");

  // contoh variabel metode pembayaran
  let paymentMethod = "cash"; 

  // klik finalize order
  finalizeBtn.addEventListener("click", () => {
    if (paymentMethod === "qris") {
      qrisPopup.style.display = "flex"; // tampilkan popup
    } else {
      alert("Metode pembayaran bukan QRIS");
    }
  });

  // tombol close
  closeQris.addEventListener("click", () => {
    qrisPopup.style.display = "none";
  if (closeQris) closeQris.addEventListener("click", () => {
    if (qrisPopup) qrisPopup.style.display = "none";
  });

  // tombol selesai
  qrisDone.addEventListener("click", () => {
    qrisPopup.style.display = "none";
  if (qrisDone) qrisDone.addEventListener("click", () => {
    if (qrisPopup) qrisPopup.style.display = "none";
    // lanjut ke cetak struk
    window.location.href = "receipt.html";
    window.open("receipt.html", "_blank");
  });

  // contoh: klik tombol grid QRIS
  document.querySelector("[data-method='qris']").addEventListener("click", () => {
    paymentMethod = "qris";
  });
}); 
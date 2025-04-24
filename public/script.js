document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById('invoice-form');
  const totalDisplay = document.getElementById('total-display');
  const todayDate = document.getElementById('today-date');
  const itemsContainer = document.getElementById('items-container');
  const customerSignInput = document.querySelector('[name="customerSign"]');

  let customerSignData = "";
  let downloadURL = ""; // Store server-provided download URL

  // Dark Mode Setup
  const darkToggle = document.getElementById("dark-mode-toggle");
  if (localStorage.getItem("dark-mode") === "true") {
    document.body.classList.add("dark");
    darkToggle.textContent = "☀️";
  }

  darkToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    const isDark = document.body.classList.contains("dark");
    darkToggle.textContent = isDark ? "☀️" : "🌙";
    localStorage.setItem("dark-mode", isDark);
  });

  // Set today's date
  todayDate.textContent = new Date().toLocaleDateString();

  // Convert file to Base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      if (!file) reject(new Error("No file provided"));
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  };

  // Add new item row
  function addItem() {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <input type="text" name="description" placeholder="Description" required>
      <input type="number" name="qty" placeholder="Qty" min="1" required>
      <input type="number" name="rate" placeholder="Rate" min="0" step="0.01" required>
      <button type="button" class="delete-item">❌ Remove</button>
    `;
    itemsContainer.appendChild(div);

    div.querySelectorAll("input").forEach(input => {
      input.addEventListener("input", calculateTotal);
    });

    div.querySelector(".delete-item").addEventListener("click", () => {
      div.remove();
      calculateTotal();
    });
  }

  document.getElementById("add-item").addEventListener("click", addItem);
  addItem(); // Initial row

  function calculateTotal() {
    const items = [...document.querySelectorAll(".item")];
    let total = 0;
    items.forEach(item => {
      const qty = parseFloat(item.querySelector('[name="qty"]').value) || 0;
      const rate = parseFloat(item.querySelector('[name="rate"]').value) || 0;
      total += qty * rate;
    });
    totalDisplay.textContent = total.toLocaleString();
    return total;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const statusMsg = document.createElement("p");
    statusMsg.className = "status-message";
    statusMsg.textContent = "⏳ Generating and sending invoice...";
    document.getElementById("invoice-output").prepend(statusMsg);

    const formData = new FormData(form);
    const buyer = formData.get("buyer");
    const email = formData.get("email");
    const phone = formData.get("phone");

    const items = [];
    let total = 0;

    const itemElements = document.querySelectorAll(".item");
    for (const el of itemElements) {
      const description = el.querySelector('input[name="description"]').value;
      const qty = parseInt(el.querySelector('input[name="qty"]').value) || 0;
      const rate = parseFloat(el.querySelector('input[name="rate"]').value) || 0;
      const amount = qty * rate;
      total += amount;

      items.push({ description, qty, rate, amount });
    }

    items.push({ description: "", qty: "", rate: "", amount: "" });

    const customerSignFile = customerSignInput.files[0];
    try {
      customerSignData = customerSignFile ? await fileToBase64(customerSignFile) : "";

      const payload = {
        buyer,
        email,
        phone,
        total,
        items,
        customerSign: customerSignData,
        templateType: "puppeteer",
      };

      const apiUrl = window.location.hostname.includes('localhost')
        ? 'http://localhost:3000/api/invoice'
        : '/api/invoice';

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-second timeout

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Server error: ${response.status} - ${text}`);
      }

      const data = await response.json();
      const whatsappLink = data.whatsappLink;
      const managerSign = data.managerSign;
      downloadURL = data.downloadURL;

      const today = new Date();
      const day = today.getDate().toString().padStart(2, "0");
      const month = (today.getMonth() + 1).toString().padStart(2, "0");
      const year = today.getFullYear();

      const html = `
        <div id="final-invoice" class="invoice-wrapper">
          <style>
            .rainbow-text {
              background: linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              font-weight: bold;
              font-size: 16px;
            }
            .invoice-wrapper { font-family: Arial, sans-serif; font-size: 14px; padding: 20px; }
            .invoice-header { text-align: center; }
            .invoice-header img { width: 80px; }
            .invoice-header h2 { margin: 5px 0; font-size: 18px; }
            .services { font-size: 12px; color: #444; text-align: center; margin-bottom: 5px; }
            .motto { font-size: 14px; color: #444; font-style: italic; text-align: center; margin-bottom: 5px; }
            .contact { font-size: 12px; margin: 2px 0; }
            .invoice-title { text-align: center; font-size: 16px; font-weight: bold; margin: 10px 0; }
            .invoice-meta { display: flex; justify-content: space-between; margin: 10px 0; font-size: 14px; }
            .meta-right { display: flex; gap: 10px; }
            .meta-right p { margin: 0; }
            .invoice-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
            .invoice-table th, .invoice-table td { border: 1px solid #000; padding: 6px; text-align: left; height: 30px; }
            .invoice-table th { background-color: #f0f0f0; font-weight: bold; }
            .invoice-table td.numeric { text-align: right; }
            .invoice-total { margin-top: 20px; font-size: 14px; }
            .invoice-total p { margin: 5px 0; }
            .invoice-note { font-size: 12px; font-style: italic; margin-top: 10px; }
            .invoice-signatures { display: flex; justify-content: space-between; margin-top: 30px; }
            .signature-block { width: 45%; text-align: center; }
            .signature-img { max-height: 40px; margin-bottom: 6px; }
          </style>
          <div class="invoice-header">
            <img src="/images/logo.png" width="80" alt="Company Logo" />
            <h2>D'MORE TECH ENGINEERING & TRADING COMPANY</h2>
            <p class="motto"><strong>Motto:</strong> prendre le risque</p>
            <p class="services">Deal with sales of electronics such as TVs, home theater, freezer, ovon, microwave, Freezers, Generators, solar products, etc. sales, repair and maintenance</p>
            <p class="contact">OFFICE ADDRESS: Iyana Barrack, Ojoo Ibadan</p>
            <p class="contact">EMAIL:📧 olanilyi44@gmail.com,dmoretech44@gmail.com</p>
            <p class="contact">TEL: 📞 08142259939, 09030804218, 07057339815</p>
            <p class="contact">RC: 3415570</p>
          </div>
          <h3 class="invoice-title">CASH SALES INVOICE</h3>
          <div class="invoice-meta">
            <div class="meta-left">
              <p><strong>TO:</strong> ${buyer}</p>
            </div>
            <div class="meta-right">
              <p><strong>DAY:</strong> ${day}</p>
              <p><strong>MONTH:</strong> ${month}</p>
              <p><strong>YEAR:</strong> ${year}</p>
            </div>
          </div>
          <table class="invoice-table">
            <thead>
              <tr>
                <th style="width: 10%;">S/N</th>
                <th style="width: 40%;">Description of Goods</th>
                <th style="width: 10%;">Qty</th>
                <th style="width: 20%;">Rate</th>
                <th style="width: 20%;">Amount (₦)</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${item.description || ""}</td>
                  <td class="numeric">${item.qty || ""}</td>
                  <td class="numeric">${item.rate ? item.rate.toLocaleString() : ""}</td>
                  <td class="numeric">${item.amount ? item.amount.toLocaleString() : ""}</td>
                </tr>`).join("")}
            </tbody>
          </table>
          <div class="invoice-total">
            <p style="text-align: right;"><strong>TOTAL ₦</strong> ${total.toLocaleString()}</p>
            <p><strong>Amount in words:</strong> Generated by server</p>
          </div>
          <p class="invoice-note">Please Note: Goods sold in good condition are not returnable or exchanged. Thanks for your patronage.</p>
          <div class="invoice-signatures">
            <div class="signature-block">
              <p class="signature-label">Customer Signature</p>
              ${customerSignData ? `<img src="${customerSignData}" alt="Customer Signature" class="signature-img" />` : '<p class="pending">No signature provided</p>'}
            </div>
            <div class="signature-block">
              <p class="signature-label">Manager Signature</p>
              ${managerSign ? `<img src="${managerSign}" alt="Manager Signature" class="signature-img" />` : '<p class="rainbow-text">D\'more Tech</p>'}
            </div>
          </div>
        </div>
      `;

      document.getElementById("invoice-output").innerHTML = html;
      document.getElementById("invoice-preview").style.display = "block";

      const whatsappBtn = `<a href="${whatsappLink}" target="_blank" class="btn">📲 WhatsApp</a>`;
      const saveBtn = `<button onclick="saveToLocal()" class="btn">💾 Save</button>`;
      const previewBtn = `<button onclick="previewPDF()" class="btn">👁️ Preview PDF</button>`;
      const downloadBtn = `<a href="${downloadURL}" target="_blank" class="btn" download>⬇️ Download Invoice</a>`;

      const btnContainer = document.createElement("div");
      btnContainer.className = "action-buttons";
      btnContainer.innerHTML = `${whatsappBtn} ${saveBtn} ${previewBtn} ${downloadBtn}`;

      document.getElementById("invoice-output").appendChild(btnContainer);

      statusMsg.textContent = "✅ Invoice sent successfully!";
      statusMsg.style.color = "green";

    } catch (err) {
      statusMsg.textContent = `❌ Failed to send invoice: ${err.message}`;
      statusMsg.style.color = "red";
      console.error("Error:", err);
    }
  });

  // Preview PDF
  window.previewPDF = () => {
    if (!downloadURL) {
      alert("No invoice available for preview.");
      return;
    }
    window.open(downloadURL, "_blank");
  };

  // Save to local storage
  window.saveToLocal = () => {
    const invoiceData = document.getElementById("invoice-output").innerHTML;
    const invoices = JSON.parse(localStorage.getItem("invoices") || "[]");
    invoices.push({ html: invoiceData, date: new Date().toISOString() });
    localStorage.setItem("invoices", JSON.stringify(invoices));
    alert("✅ Invoice saved locally!");
  };
});

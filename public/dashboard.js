// public/dashboard.js
async function fetchInvoices() {
    try {
      const res = await fetch("/api/invoices");
      if (!res.ok) throw new Error("Failed to fetch invoices");
      const invoices = await res.json();
  
      const tbody = document.querySelector("#invoice-table tbody");
      invoices.forEach((inv, i) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${i + 1}</td>
          <td>${inv.email}</td>
          <td>${inv.phone}</td>
          <td>₦${inv.total}</td>
          <td>${inv.date}</td>
          <td>
            <a href="/invoices/invoice_${inv.id}.pdf" download>⬇️ Download</a>
          </td>
        `;
        tbody.appendChild(tr);
      });
    } catch (err) {
      console.error("Dashboard error:", err);
      alert("Failed to load invoices.");
    }
  }

  td.innerHTML = `
  <a href="/invoices/invoice_${inv.id}.pdf" download>⬇️ PDF</a><br>
  <a href="mailto:${inv.email}?subject=D'MORE TECH Invoice&body=Please find your invoice for ₦${inv.total} attached.">📧 Gmail</a>
`;

  
  fetchInvoices();
  
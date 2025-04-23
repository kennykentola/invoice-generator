const nodemailer = require('nodemailer');
const { ToWords } = require('to-words');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Initialize ToWords with Naira configuration
const toWords = new ToWords({
  localeCode: 'en-NG',
  currencyOptions: {
    name: 'Naira',
    plural: 'Naira',
    symbol: '₦',
    fractionalUnit: {
      name: 'Kobo',
      plural: 'Kobo',
      symbol: '',
    },
  },
});

// Vercel serverless function
module.exports = async (req, res) => {
  // Restrict to POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();
  const { email, phone, items, total, customerSign, buyer } = req.body;

  // Validate required fields
  if (!email || !phone || !items || !total || !buyer) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const totalInWords = toWords.convert(total, { currency: true, ignoreDecimal: true });
  const invoiceId = uuidv4(); // Generate unique invoice ID
  const fileName = `invoice_${invoiceId}.pdf`;

  try {
    // Initialize PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margin: 20,
      bufferPages: true,
    });

    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', async () => {
      const pdfBuffer = Buffer.concat(buffers);

      // Configure Nodemailer transporter
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.MAIL_SENDER,
          pass: process.env.MAIL_PASS,
        },
        pool: true,
      });

      // Verify transporter
      await transporter.verify();

      // Email options
      const mailOptions = {
        from: process.env.MAIL_SENDER,
        to: email,
        cc: process.env.MAIL_CC || '',
        subject: "D'MORE TECH Invoice",
        html: `<p>Dear ${buyer},<br>Please find your invoice attached as a PDF. Thank you!</p>`,
        attachments: [
          {
            filename: fileName,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      };

      // Send email
      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ Email sent: ${info.messageId}`);

      // Generate WhatsApp link (no download URL in serverless, instruct to check email)
      const whatsappLink = `https://wa.me/${phone}?text=${encodeURIComponent(
        `Hello ${buyer}, your invoice from D'MORE TECH Amount is ₦${total}. Please check your email for the invoice PDF.`
      )}`;

      // Generate PDF data URI for frontend download
      const pdfDataUri = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;

      const endTime = Date.now();
      console.log(`Request processed in ${endTime - startTime}ms`);

      // Respond with success
      res.status(200).json({
        message: 'Invoice sent and PDF generated.',
        whatsappLink,
        downloadURL: pdfDataUri, // Use data URI instead of public URL
        managerSign: '', // Manager signature handled in PDF
      });
    });

    // PDF Content Generation
    doc.font('Helvetica');

    // Header: Images and Company Info
    let logoBuffer, electronicsBuffer, generatorFanBuffer, generatorHomeBuffer, managerSignBuffer;
    try {
      logoBuffer = fs.readFileSync(path.join(__dirname, '..', 'public', 'images', 'logo.png'));
      doc.image(logoBuffer, (doc.page.width - 80) / 2, 20, { width: 80 }); // Centered logo
    } catch (err) {
      console.warn('Logo image not found:', err.message);
    }

    // Side images (left and right)
    try {
      electronicsBuffer = fs.readFileSync(path.join(__dirname, '..', 'public', 'images', 'gen.jpg'));
      doc.image(electronicsBuffer, 20, 20, { width: 100 }); // Left side
    } catch (err) {
      console.warn('Electronics image not found:', err.message);
    }
    try {
      generatorFanBuffer = fs.readFileSync(path.join(__dirname, '..', 'public', 'images', 'fan.jpg'));
      generatorHomeBuffer = fs.readFileSync(path.join(__dirname, '..', 'public', 'images', 'home.png'));
      doc.image(generatorFanBuffer, doc.page.width - 120, 20, { width: 100 }); // Right side
      doc.image(generatorHomeBuffer, doc.page.width - 120, 130, { width: 100 }); // Right side below
    } catch (err) {
      console.warn('Generator images not found:', err.message);
    }

    // Company details
    doc.moveDown(14); // Adjust position after images
    doc.fontSize(18).text("D'MORE TECH ENGINEERING & TRADING COMPANY", { align: 'center' });
    doc.fontSize(14).text("Motto: prendre le risque", { align: 'center' });
    doc.fontSize(12).text(
      "Deal with sales of electronics such as TVs, home theater, freezer, oven, microwave, generator, air conditioner, blender, solar products, etc. sales, repair and maintenance",
      50,
      doc.y,
      { align: 'center', width: doc.page.width - 100 }
    );
    doc.fontSize(12).text("Office Address: Iyana Barack, Ojoo Ibadan", { align: 'center' });
    doc.fontSize(12).text("Email: olanlyl14@gmail.com, dmoretech44@gmail.com", { align: 'center' });
    doc.fontSize(12).text("Tel: 08142259939, 09030804218, 07057339815", { align: 'center' });
    doc.fontSize(12).text("RC: 3413570", { align: 'center' });
    doc.moveDown(2);

    // Title with border
    doc.fontSize(16).text("CASH SALES INVOICE", { align: 'center' });
    doc.rect(50, doc.y - 20, doc.page.width - 100, 30).stroke(); // Border around title
    doc.moveDown();

    // Buyer and Date
    const date = new Date();
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();

    doc.fontSize(12);
    const buyerY = doc.y;
    doc.text(`TO: ${buyer}`, 50, buyerY);
    doc.text(`DAY: ${day}`, 400, buyerY, { width: 50, align: 'center' });
    doc.rect(400, buyerY - 5, 50, 20).stroke(); // Date box
    doc.text(`MONTH: ${month}`, 460, buyerY, { width: 50, align: 'center' });
    doc.rect(460, buyerY - 5, 50, 20).stroke();
    doc.text(`YEAR: ${year}`, 520, buyerY, { width: 50, align: 'center' });
    doc.rect(520, buyerY - 5, 50, 20).stroke();
    doc.moveDown();

    // Table Header
    const tableTop = doc.y;
    doc.font('Helvetica-Bold');
    doc.text('S/N', 50, tableTop, { width: 30 });
    doc.text('Description of Goods', 80, tableTop, { width: 200 });
    doc.text('Qty', 280, tableTop, { width: 50, align: 'right' });
    doc.text('Rate (₦)', 330, tableTop, { width: 80, align: 'right' });
    doc.text('Amount (₦)', 410, tableTop, { width: 80, align: 'right' });

    // Draw table header borders
    doc.rect(50, tableTop - 5, 30, 20).fillAndStroke('#f0f0f0', '#000');
    doc.rect(80, tableTop - 5, 200, 20).fillAndStroke('#f0f0f0', '#000');
    doc.rect(280, tableTop - 5, 50, 20).fillAndStroke('#f0f0f0', '#000');
    doc.rect(330, tableTop - 5, 80, 20).fillAndStroke('#f0f0f0', '#000');
    doc.rect(410, tableTop - 5, 80, 20).fillAndStroke('#f0f0f0', '#000');
    doc.fillColor('black'); // Reset fill color
    doc.moveDown();

    // Table Rows
    doc.font('Helvetica');
    let serialNumber = 1;
    let yPosition = doc.y;
    items.forEach((item) => {
      doc.text(`${serialNumber++}`, 50, yPosition, { width: 30 });
      doc.text(item.description || '', 80, yPosition, { width: 200 });
      doc.text(item.qty || '', 280, yPosition, { width: 50, align: 'right' });
      doc.text(item.rate ? Number(item.rate).toLocaleString('en-NG') : '', 330, yPosition, {
        width: 80,
        align: 'right',
      });
      doc.text(item.amount ? Number(item.amount).toLocaleString('en-NG') : '', 410, yPosition, {
        width: 80,
        align: 'right',
      });
      // Draw row borders
      doc.rect(50, yPosition - 5, 30, 20).stroke();
      doc.rect(80, yPosition - 5, 200, 20).stroke();
      doc.rect(280, yPosition - 5, 50, 20).stroke();
      doc.rect(330, yPosition - 5, 80, 20).stroke();
      doc.rect(410, yPosition - 5, 80, 20).stroke();
      yPosition += 20;
    });

    // Add two empty rows
    for (let i = 0; i < 2; i++) {
      doc.text(`${serialNumber++}`, 50, yPosition, { width: 30 });
      doc.text('', 80, yPosition, { width: 200 });
      doc.text('', 280, yPosition, { width: 50, align: 'right' });
      doc.text('', 330, yPosition, { width: 80, align: 'right' });
      doc.text('', 410, yPosition, { width: 80, align: 'right' });
      // Draw row borders
      doc.rect(50, yPosition - 5, 30, 20).stroke();
      doc.rect(80, yPosition - 5, 200, 20).stroke();
      doc.rect(280, yPosition - 5, 50, 20).stroke();
      doc.rect(330, yPosition - 5, 80, 20).stroke();
      doc.rect(410, yPosition - 5, 80, 20).stroke();
      yPosition += 20;
    }

    // Total
    doc.moveDown();
    const totalText = `TOTAL ₦${Number(total).toLocaleString('en-NG')}`;
    doc.text(totalText, 410, doc.y, { width: 80, align: 'right' });
    doc.rect(410, doc.y - 5, 80, 20).stroke(); // Border around total
    doc.moveDown();
    doc.text(`Amount in words: ${totalInWords}`, 50, doc.y);

    // Note
    doc.moveDown();
    doc.fontSize(10).text(
      'Please Note: Goods sold in good condition are not returnable or exchanged. Thanks for your patronage.',
      { align: 'left' }
    );

    // Signatures
    doc.moveDown(2);
    const signY = doc.y;

    // Customer Signature
    doc.text("Customer's Signature", 50, signY, { align: 'center', width: 200 });
    if (customerSign && customerSign.startsWith('data:image/')) {
      try {
        const base64Data = customerSign.split(',')[1];
        const customerSignBuffer = Buffer.from(base64Data, 'base64');
        doc.image(customerSignBuffer, 50, signY + 20, { width: 150 });
        doc.text('_____________________', 50, signY + 60, { width: 150, align: 'center' });
      } catch (err) {
        console.error('Error adding customer signature:', err.message);
        doc.text('_____________________', 50, signY + 20, { width: 150, align: 'center' });
      }
    } else {
      doc.text('No signature provided', 50, signY + 20, { width: 150, align: 'center' });
    }

    // Manager Signature
    doc.text("Manager's Signature", 350, signY, { align: 'center', width: 200 });
    try {
      managerSignBuffer = fs.readFileSync(
        path.join(__dirname, '..', 'public', 'images', 'manager_signature.png')
      );
      doc.image(managerSignBuffer, 350, signY + 20, { width: 150 });
      doc.text('_____________________', 350, signY + 60, { width: 150, align: 'center' });
    } catch (err) {
      console.warn('Manager signature not found, using fallback text:', err.message);
      doc
        .fontSize(12)
        .fillColor('blue')
        .text("D'more Tech", 350, signY + 20, { width: 150, align: 'center' });
    }

    // Finalize PDF
    doc.end();
  } catch (err) {
    const endTime = Date.now();
    console.error(`Request failed after ${endTime - startTime}ms:`, err);
    res.status(500).json({ error: `Failed to generate or send invoice: ${err.message}` });
  }
};

// HTML generator
function generateInvoiceHTML({ logoURL, electronicsURL,generatorhomeURL, generatorFanURL, buyer, items, total, totalInWords, customerSign, managerSign }) {
  const date = new Date();
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();

  // Generate table rows for products
  let serialNumber = 1;
  const tableRows = items.map((item) => `
    <tr>
      <td>${serialNumber++}</td>
      <td>${item.description || ""}</td>
      <td class="numeric">${item.qty || ""}</td>
      <td class="numeric">${item.rate ? Number(item.rate).toLocaleString("en-NG") : ""}</td>
      <td class="numeric">${item.amount ? Number(item.amount).toLocaleString("en-NG") : ""}</td>
    </tr>
  `);

  // Add two empty rows at the end
  tableRows.push(`
    <tr>
      <td>${serialNumber++}</td>
      <td></td>
      <td class="numeric"></td>
      <td class="numeric"></td>
      <td class="numeric"></td>
    </tr>
  `);
  tableRows.push(`
    <tr>
      <td>${serialNumber++}</td>
      <td></td>
      <td class="numeric"></td>
      <td class="numeric"></td>
      <td class="numeric"></td>
    </tr>
  `);

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <style>
      body { font-family: Arial, sans-serif; font-size: 14px; padding: 20px; box-sizing: border-box; }
      .header, .footer, .signatures { page-break-inside: avoid; }
      .header { display: flex; align-items: center; justify-content: space-between; text-align: center; }
      .header-left, .header-right { width: 20%; }
      .header-center { width: 60%; }
      .header img.logo { width: 80px; }
      .header img.side-img { width: 100%; max-width: 120px; }
      .header h2 { margin: 5px 0; font-size: 18px; }
      .services { font-size: 12px; color: #444; text-align: center; margin-bottom: 5px; }
      .motto { font-size: 14px; color: #444; font-style: italic; text-align: center; margin-bottom: 5px;font-weight: bold; }
      .contact-info { font-size: 12px; margin: 2px 0; text-align: center; }
      .title { text-align: center; font-size: 16px; font-weight: bold; margin: 10px 0; border: 2px solid #000;border-radius: 5px;  }
      .info-row { display: flex; justify-content: space-between; margin: 10px 0; font-size: 14px; }
      .date-box { display: flex; gap: 10px; border-radius: 5px; text-align: center; }
      .date-box span { display: inline-block; width: 100px; text-align: center; border: 1px solid #000; padding: 2px; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; page-break-inside: auto; }
      tr { page-break-inside: avoid; page-break-after: auto; }
      th, td { border: 1px solid #000; padding: 6px; text-align: left; height: 30px; }
      th { background-color: #f0f0f0; font-weight: bold; }
      td.numeric { text-align: right; }
      .footer { margin-top: 20px; font-size: 14px; }
      .footer p { margin: 5px 0; }
      .amount-words { display: flex; justify-content: space-between; margin-top: 10px; }
      .amount-words span { display: inline-block;  text-align: center; }
      .note { font-size: 12px; font-style: italic; margin-top: 10px; }
      .signatures { display: flex; justify-content: space-between; margin-top: 30px; }
      .sign-box { width: 45%; text-align: center; }
      .sign-box img { max-height: 40px; margin-bottom: 6px; }
      .rainbow-text {
        background: linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        font-weight: bold;
        font-size: 16px;
      }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="header-left">
        <img src="${electronicsURL}" class="side-img" alt="Electronics" />
      </div>
      <div class="header-center">
        <img src="${logoURL}" class="logo" alt="D'More Tech Logo" />
        <h2>D'MORE TECH ENGINEERING & TRADING COMPANY</h2>
        <p class="motto"><strong style="font-size: 16px;">Motto:</strong> prendre le risque</p>
        <p class="contact-info">Deal with sales of electronics such as TVs, home theater, freezer, oven, microwave, generator, air conditioner, blender, solar products, etc. sales, repair and maintenance</p>
        <p class="contact-info"><strong>Office Address:</strong> Iyana Barack, Ojoo Ibadan</p>
        <p class="contact-info"><strong>Email:</strong> olanlyl14@gmail.com, dmoretech44@gmail.com</p>
        <p class="contact-info"><strong>Tel:</strong> 08142259939, 09030804218, 07057339815</p>
        <p class="contact-info"><strong>RC:</strong> 3413570</p>
      </div>
      <div class="header-right">
        <img src="${generatorFanURL}" class="side-img" alt="Generator and Fan" />
        <img src="${generatorhomeURL}" class="side-img" alt="Generator and HOME" />
      </div>
    </div>

    <div class="title">CASH SALES INVOICE</div>

    <div class="info-row">
      <p><strong>TO:</strong> ${buyer}</p>
      <div class="date-box">
        <span><strong>DAY:</strong> ${day}</span>
        <span><strong>MONTH:</strong> ${month}</span>
        <span><strong>YEAR:</strong> ${year}</span>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 10%;">S/N</th>
          <th style="width: 40%;">Description of Goods</th>
          <th style="width: 10%;">Qty</th>
          <th style="width: 20%;">Rate (₦)</th>
          <th style="width: 20%;">Amount (₦)</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows.join('')}
      </tbody>
    </table>

    <div class="footer">
      <p style="text-align: right; border: 1px solid #000;"><strong>TOTAL ₦</strong> ${Number(total).toLocaleString("en-NG")}</p>
      <p><strong>Amount in words:</strong> ${totalInWords}</p>
      <div class="amount-words">
        <span></span>
        <span></span>
      </div>
    </div>

    <p class="note">Please Note: Goods sold in good condition are not returnable or exchanged. Thanks for your patronage.</p>

    <div class="signatures">
      <div class="sign-box">
        <div class="sign-label">Customer's Signature</div>
        ${customerSign ? `<img src="${customerSign}" alt="Customer Signature" />_____________________` : '<p>No signature provided</p>'}
      </div>
      <div class="sign-box">
        <div class="sign-label">Manager's Signature</div>
        ${managerSign ? `<img src="${managerSign}" alt="Manager Signature" />__________________` : '<p class="rainbow-text">D\'more Tech</p>'}
      </div>
    </div>
  </body>
  </html>`;
}

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});




// require('dotenv').config();

// const express = require('express');
// const cors = require('cors');
// const fs = require('fs');
// const path = require('path');
// const nodemailer = require('nodemailer');
// const { ToWords } = require('to-words');
// const PDFDocument = require('pdfkit');
// const { v4: uuidv4 } = require('uuid');

// const app = express();
// const PORT = process.env.PORT || 3000;

// // Initialize toWords with Naira configuration
// const toWords = new ToWords({
//   localeCode: 'en-NG',
//   currencyOptions: {
//     name: 'Naira',
//     plural: 'Naira',
//     symbol: '₦',
//     fractionalUnit: {
//       name: 'Kobo',
//       plural: 'Kobo',
//       symbol: '',
//     },
//   },
// });

// // Middleware setup
// app.use(cors());
// app.use(express.json({ limit: '20mb' }));
// app.use(express.static(path.join(__dirname, 'public')));

// // Invoice directory for local storage
// const invoicesDir = path.join(__dirname, 'invoices');
// if (!fs.existsSync(invoicesDir)) {
//   fs.mkdirSync(invoicesDir);
// }
// app.use('/invoices', express.static(invoicesDir));

// // Serve the frontend (index.html)
// app.get('/', (req, res) => {
//   res.sendFile(path.join(__dirname, 'index.html'));
// });

// // Invoice API
// app.post('/api/invoice', async (req, res) => {
//   const { email, phone, items, total, customerSign, buyer } = req.body;
//   const id = uuidv4();
//   const fileName = `invoice_${id}.pdf`;
//   const filePath = path.join(invoicesDir, fileName);
//   const publicURL = `http://localhost:${PORT}/invoices/${fileName}`;
//   const totalInWords = toWords.convert(total, { currency: true, ignoreDecimal: true });

//   try {
//     console.log("Items received:", items);

//     // Generate PDF using pdfkit
//     const doc = new PDFDocument({
//       size: 'A4',
//       margin: 20,
//     });

//     const stream = fs.createWriteStream(filePath);
//     doc.pipe(stream);

//     const buffers = [];
//     doc.on('data', buffers.push.bind(buffers));

//     // Add content to the PDF
//     doc.font('Helvetica');

//     // Header
//     doc.fontSize(18).text("D'MORE TECH ENGINEERING & TRADING COMPANY", { align: 'center' });
//     doc.fontSize(14).text("Motto: prendre le risque", { align: 'center' });
//     doc.fontSize(12).text("Deal with sales of electronics such as TVs, home theater, freezer, oven, microwave, generator, air conditioner, blender, solar products, etc. sales, repair and maintenance", { align: 'center' });
//     doc.fontSize(12).text("Office Address: Iyana Barack, Ojoo Ibadan", { align: 'center' });
//     doc.fontSize(12).text("Email: olanlyl14@gmail.com, dmoretech44@gmail.com", { align: 'center' });
//     doc.fontSize(12).text("Tel: 08142259939, 09030804218, 07057339815", { align: 'center' });
//     doc.fontSize(12).text("RC: 3413570", { align: 'center' });
//     doc.moveDown();

//     // Title
//     doc.fontSize(16).text("CASH SALES INVOICE", { align: 'center' });
//     doc.moveDown();

//     // Buyer and Date
//     const date = new Date();
//     const day = date.getDate().toString().padStart(2, '0');
//     const month = (date.getMonth() + 1).toString().padStart(2, '0');
//     const year = date.getFullYear();

//     doc.fontSize(12).text(`TO: ${buyer}`, 50, doc.y);
//     doc.text(`DAY: ${day}   MONTH: ${month}   YEAR: ${year}`, 400, doc.y - 15, { align: 'right' });
//     doc.moveDown();

//     // Table Header
//     const tableTop = doc.y;
//     doc.font('Helvetica-Bold');
//     doc.text('S/N', 50, tableTop, { width: 30 });
//     doc.text('Description of Goods', 80, tableTop, { width: 200 });
//     doc.text('Qty', 280, tableTop, { width: 50, align: 'right' });
//     doc.text('Rate (₦)', 330, tableTop, { width: 80, align: 'right' });
//     doc.text('Amount (₦)', 410, tableTop, { width: 80, align: 'right' });
//     doc.moveDown();

//     // Table Rows
//     doc.font('Helvetica');
//     let serialNumber = 1;
//     let yPosition = doc.y;
//     items.forEach((item) => {
//       doc.text(`${serialNumber++}`, 50, yPosition, { width: 30 });
//       doc.text(item.description || "", 80, yPosition, { width: 200 });
//       doc.text(item.qty || "", 280, yPosition, { width: 50, align: 'right' });
//       doc.text(item.rate ? Number(item.rate).toLocaleString("en-NG") : "", 330, yPosition, { width: 80, align: 'right' });
//       doc.text(item.amount ? Number(item.amount).toLocaleString("en-NG") : "", 410, yPosition, { width: 80, align: 'right' });
//       yPosition += 20;
//     });

//     // Add empty rows
//     for (let i = 0; i < 2; i++) {
//       doc.text(`${serialNumber++}`, 50, yPosition, { width: 30 });
//       doc.text("", 80, yPosition, { width: 200 });
//       doc.text("", 280, yPosition, { width: 50, align: 'right' });
//       doc.text("", 330, yPosition, { width: 80, align: 'right' });
//       doc.text("", 410, yPosition, { width: 80, align: 'right' });
//       yPosition += 20;
//     }

//     // Total
//     doc.moveDown();
//     doc.text(`TOTAL ₦${Number(total).toLocaleString("en-NG")}`, { align: 'right' });
//     doc.moveDown();
//     doc.text(`Amount in words: ${totalInWords}`, 50, doc.y);

//     // Note
//     doc.moveDown();
//     doc.fontSize(10).text("Please Note: Goods sold in good condition are not returnable or exchanged. Thanks for your patronage.", { align: 'left' });

//     // Signatures
//     doc.moveDown(2);
//     doc.text("Customer's Signature: _____________________", 50, doc.y);
//     doc.text("Manager's Signature: _____________________", 350, doc.y, { align: 'right' });

//     doc.end();

//     // Wait for the stream to finish writing the PDF
//     await new Promise((resolve, reject) => {
//       stream.on('finish', resolve);
//       stream.on('error', reject);
//     });

//     const pdfBuffer = Buffer.concat(buffers);

//     // Send email with PDF attachment
//     const transporter = nodemailer.createTransport({
//       service: 'gmail',
//       auth: {
//         user: process.env.MAIL_SENDER,
//         pass: process.env.MAIL_PASS,
//       },
//     });

//     await transporter.verify();

//     const mailOptions = {
//       from: process.env.MAIL_SENDER,
//       to: email,
//       cc: process.env.MAIL_CC || "",
//       subject: "D'MORE TECH Invoice",
//       html: `<p>Dear ${buyer},<br>Please find your invoice attached as a PDF AND DOWNLOAD. Thank you!</p>`,
//       attachments: [
//         {
//           filename: fileName,
//           path: filePath,
//           contentType: 'application/pdf',
//         },
//       ],
//     };

//     const info = await transporter.sendMail(mailOptions);
//     console.log("✅ Email sent:", info.messageId);

//     // Generate a data URI for the PDF to return to the frontend
//     const pdfDataUri = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;

//     const whatsappLink = `https://wa.me/${phone}?text=${encodeURIComponent(`Hello ${buyer}, your invoice from D'MORE TECH Amount is ₦${total}. you can download your invoice on this link <br> copy the link and paste to any browsers: ${publicURL}`)}`;

//     res.json({
//       message: "Invoice sent and PDF generated.",
//       whatsappLink,
//       pdfDataUri,
//       managerSign: '',
//     });

//   } catch (err) {
//     console.error("❌ Error generating invoice:", err);
//     res.status(500).json({ error: `Failed to generate or send invoice: ${err.message}` });
//   }
// });

// // Start the server
// app.listen(PORT, () => {
//   console.log(`🚀 Server running at http://localhost:${PORT}`);
// });
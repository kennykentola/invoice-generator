require('dotenv').config();

const nodemailer = require('nodemailer');
const { ToWords } = require('to-words');
const puppeteer = require('puppeteer');
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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, phone, items, total, customerSign, buyer } = req.body;

  if (!email || !phone || !items || !total || !buyer) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const totalInWords = toWords.convert(total, { currency: true, ignoreDecimal: true });
  const invoiceId = uuidv4();
  const fileName = `invoice_${invoiceId}.pdf`;

  try {
    // Load images as base64
    const logoBase64 = fs.readFileSync(path.join(__dirname, '..', 'public', 'images', 'logo.png'), 'base64');
    const logoURL = `data:image/png;base64,${logoBase64}`;

    const electronicsBase64 = fs.readFileSync(path.join(__dirname, '..', 'public', 'images', 'gen.jpg'), 'base64');
    const electronicsURL = `data:image/png;base64,${electronicsBase64}`;

    const generatorFanBase64 = fs.readFileSync(path.join(__dirname, '..', 'public', 'images', 'fan.jpg'), 'base64');
    const generatorFanURL = `data:image/png;base64,${generatorFanBase64}`;

    const generatorhomeBase64 = fs.readFileSync(path.join(__dirname, '..', 'public', 'images', 'home.png'), 'base64');
    const generatorhomeURL = `data:image/png;base64,${generatorhomeBase64}`;

    let managerSignURL = '';
    try {
      const managerSignBase64 = fs.readFileSync(path.join(__dirname, '..', 'public', 'images', 'manager_signature.png'), 'base64');
      managerSignURL = `data:image/png;base64,${managerSignBase64}`;
    } catch (err) {
      console.warn("Manager signature not found, falling back to frontend default:", err.message);
      managerSignURL = '';
    }

    const htmlContent = generateInvoiceHTML({
      logoURL,
      electronicsURL,
      generatorFanURL,
      generatorhomeURL,
      buyer,
      items,
      total,
      totalInWords,
      customerSign,
      managerSign: managerSignURL,
    });

    // Launch Puppeteer for Vercel
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      executablePath: process.env.CHROME_BIN || null, // Vercel sets this
    });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });

    await page.evaluateHandle('document.fonts.ready');
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
      preferCSSPageSize: true,
    });

    await browser.close();

    // Configure Nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAIL_SENDER,
        pass: process.env.MAIL_PASS,
      },
      pool: true, // Use connection pooling for serverless
    });

    // Verify transporter
    try {
      await transporter.verify();
      console.log("✅ Transporter verified successfully");
    } catch (err) {
      console.error("❌ Transporter verification failed:", err.message);
      throw new Error("Failed to verify email transporter: " + err.message);
    }

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

    const whatsappLink = `https://wa.me/${phone}?text=${encodeURIComponent(
      `Hello ${buyer}, your invoice from D'MORE TECH Amount is ₦${total}. Please check your email for the invoice PDF.`
    )}`;

    const pdfDataUri = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;

    res.status(200).json({
      message: 'Invoice sent and PDF generated.',
      whatsappLink,
      downloadURL: pdfDataUri,
      managerSign: managerSignURL,
    });

  } catch (err) {
    console.error(`❌ Error in invoice generation or email sending:`, err);
    res.status(500).json({ error: `Failed to generate or send invoice: ${err.message}` });
  }
};

// HTML generator (unchanged as it produces the correct design)
function generateInvoiceHTML({ logoURL, electronicsURL, generatorhomeURL, generatorFanURL, buyer, items, total, totalInWords, customerSign, managerSign }) {
  const date = new Date();
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear ..

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

  // Ensure 10 rows total by adding empty rows
  const rowsToAdd = 10 - items.length;
  for (let i = 0; i < rowsToAdd; i++) {
    tableRows.push(`
      <tr>
        <td>${serialNumber++}</td>
        <td></td>
        <td class="numeric"></td>
        <td class="numeric"></td>
        <td class="numeric"></td>
      </tr>
    `);
  }

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
      .motto { font-size: 14px; color: #444; font-style: italic; text-align: center; margin-bottom: 5px; font-weight: bold; }
      .contact-info { font-size: 12px; margin: 2px 0; text-align: center; }
      .title { text-align: center; font-size: 16px; font-weight: bold; margin: 10px 0; border: 2px solid #000; border-radius: 5px; }
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
      .amount-words span { display: inline-block; text-align: center; }
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
        <p class="contact-info">Deal with sales of electronics such as TVs, home theater, freezer, oven, microwave, Freezers, Generators, solar products, etc. sales, repair and maintenance</p>
        <p class="contact-info"><strong>Office Address:</strong> Iyana Barrack, Ojoo Ibadan</p>
        <p class="contact-info"><strong>Email:</strong> 📧 olanilyi44@gmail.com,dmoretech44@gmail.com</p>
        <p class="contact-info"><strong>Tel:</strong> 📞 08142259939, 09030804218, 07057339815</p>
        <p class="contact-info"><strong>RC:</strong> 3415570</p>
      </div>
      <div class="header-right">
        <img src="${generatorFanURL}" class="side-img" alt="Generator and Fan" />
        <img src="${generatorhomeURL}" class="side-img" alt="Generator and HOME" />
      </div>
    </div>

    <div class="title">CASH SALES INVOICE</div>

    <div class="info-row">
      <p><strong>TO:</strong> ${buyer.charAt(0).toUpperCase() + buyer.slice(1)}</p>
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
};
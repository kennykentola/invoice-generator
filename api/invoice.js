require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const { ToWords } = require('to-words');
const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize toWords with Naira configuration
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

// Middleware setup
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Ensure invoices directory exists and serve it statically
const invoicesDir = path.join(__dirname, 'invoices');
if (!fs.existsSync(invoicesDir)) {
  fs.mkdirSync(invoicesDir);
}
app.use('/invoices', express.static(invoicesDir));

// Serve the frontend (index.html)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Invoice API
app.post('/api/invoice', async (req, res) => {
  const { email, phone, items, total, customerSign, buyer } = req.body;
  const id = uuidv4();
  const fileName = `invoice_${id}.pdf`;
  const filePath = path.join(invoicesDir, fileName);
  const publicURL = `${req.protocol}://${req.get('host')}/invoices/${fileName}`;
  const totalInWords = toWords.convert(total, { currency: true, ignoreDecimal: true });

  try {
    console.log("Items received:", items);

    // Load images as base64 (since Vercel can access the public directory)
    const readImage = (filePath, defaultBase64 = '') => {
      try {
        return Buffer.from(fs.readFileSync(filePath)).toString('base64');
      } catch (err) {
        console.warn(`Failed to read ${filePath}: ${err.message}`);
        return defaultBase64;
      }
    };

    const logoBase64 = readImage(path.join(__dirname, 'public/images/logo.png'));
    const logoURL = logoBase64 ? `data:image/png;base64,${logoBase64}` : '';

    const electronicsBase64 = readImage(path.join(__dirname, 'public/images/gen.jpg'));
    const electronicsURL = electronicsBase64 ? `data:image/png;base64,${electronicsBase64}` : '';

    const generatorFanBase64 = readImage(path.join(__dirname, 'public/images/fan.jpg'));
    const generatorFanURL = generatorFanBase64 ? `data:image/png;base64,${generatorFanBase64}` : '';

    const generatorhomeBase64 = readImage(path.join(__dirname, 'public/images/home.png'));
    const generatorhomeURL = generatorhomeBase64 ? `data:image/png;base64,${generatorhomeBase64}` : '';

    let managerSignURL = '';
    const managerSignBase64 = readImage(path.join(__dirname, 'public/images/manager_signature.png'));
    if (managerSignBase64) {
      managerSignURL = `data:image/png;base64,${managerSignBase64}`;
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

    // Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      executablePath: process.env.CHROME_BIN || null,
    });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });

    await page.evaluateHandle('document.fonts.ready');
    await page.pdf({
      path: filePath,
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
      preferCSSPageSize: true,
    });

    await browser.close();

    // Send email with PDF link instead of attachment
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAIL_SENDER,
        pass: process.env.MAIL_PASS,
      },
    });

    await transporter.verify();

    const mailOptions = {
      from: process.env.MAIL_SENDER,
      to: email,
      cc: process.env.MAIL_CC || '',
      subject: "D'MORE TECH Invoice",
      html: `<p>Dear ${buyer},<br>Please download your invoice from the following link:<br><a href="${publicURL}">${publicURL}</a><br>Thank you!</p>`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent:", info.messageId);

    // Create WhatsApp link with download URL
    const whatsappLink = `https://wa.me/${phone}?text=${encodeURIComponent(`Hello ${buyer}, your invoice from D'MORE TECH Amount is ₦${total}. You can download your invoice here: ${publicURL}`)}`;

    res.json({
      message: "Invoice link sent and PDF generated.",
      whatsappLink,
      downloadURL: publicURL,
      managerSign: managerSignURL,
    });

  } catch (err) {
    console.error("❌ Error generating invoice:", err);
    res.status(500).json({ error: `Failed to generate or send invoice: ${err.message}` });
  }
});

// HTML generator (unchanged)
function generateInvoiceHTML({ logoURL, electronicsURL, generatorhomeURL, generatorFanURL, buyer, items, total, totalInWords, customerSign, managerSign }) {
  const date = new Date();
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();

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
      .title { text-align: center; font-size: 16px; font-weight: bold; margin: 10px 0; border: 2px solid #000;border-radius: 5px; }
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
});

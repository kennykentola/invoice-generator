// require('dotenv').config();

// const express = require('express');
// const fs = require('fs');
// const cors = require('cors');
// const path = require('path');
// const nodemailer = require('nodemailer');
// const { ToWords } = require('to-words');
// const puppeteer = require('puppeteer');
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
// app.use(express.static('public'));

// // Invoice directory
// const invoicesDir = path.join(__dirname, 'invoices');
// if (!fs.existsSync(invoicesDir)) {
//   fs.mkdirSync(invoicesDir);
// }
// app.use('/invoices', express.static(invoicesDir));

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

//     const logoBase64 = fs.readFileSync('./public/images/logo.png', 'base64');
//     const logoURL = `data:image/png;base64,${logoBase64}`;

//     const electronicsBase64 = fs.readFileSync('./public/images/gen.jpg', 'base64');
//     const electronicsURL = `data:image/png;base64,${electronicsBase64}`;

//     const generatorFanBase64 = fs.readFileSync('./public/images/fan.jpg', 'base64');
//     const generatorFanURL = `data:image/png;base64,${generatorFanBase64}`;

//     const generatorhomeBase64 = fs.readFileSync('./public/images/home.png', 'base64');
//     const generatorhomeURL = `data:image/png;base64,${generatorhomeBase64}`;

//     let managerSignURL = '';
//     try {
//       const managerSignBase64 = fs.readFileSync('./public/images/manager_signature.png', 'base64');
//       managerSignURL = `data:image/png;base64,${managerSignBase64}`;
//     } catch (err) {
//       console.warn("Manager signature not found, falling back to frontend default:", err.message);
//       managerSignURL = '';
//     }

//     const htmlContent = generateInvoiceHTML({
//       logoURL,
//       electronicsURL,
//       generatorFanURL,
//       generatorhomeURL,
//       buyer,
//       items,
//       total,
//       totalInWords,
//       customerSign,
//       managerSign: managerSignURL,
//     });

//     const browser = await puppeteer.launch({
//       headless: 'new',
//       args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
//     });
//     const page = await browser.newPage();
//     await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });

//     await page.evaluateHandle('document.fonts.ready');
//     await page.pdf({
//       path: filePath,
//       format: 'A4',
//       printBackground: true,
//       margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
//       preferCSSPageSize: true,
//     });

//     await browser.close();

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

//     const whatsappLink = `https://wa.me/${phone}?text=${encodeURIComponent(`Hello ${buyer}, your invoice from D'MORE TECH Amount is ₦${total}. you can download your invoce on this link <br> copy the link and paste to any browsers: ${publicURL}`)}`;

//     res.json({
//       message: "Invoice sent and PDF generated.",
//       whatsappLink,
//       downloadURL: publicURL,
//       managerSign: managerSignURL,
//     });

//   } catch (err) {
//     console.error("❌ Error generating invoice:", err);
//     res.status(500).json({ error: 'Failed to generate or send invoice.' });
//   }
// });

// // HTML generator
// function generateInvoiceHTML({ logoURL, electronicsURL,generatorhomeURL, generatorFanURL, buyer, items, total, totalInWords, customerSign, managerSign }) {
//   const date = new Date();
//   const day = date.getDate().toString().padStart(2, '0');
//   const month = (date.getMonth() + 1).toString().padStart(2, '0');
//   const year = date.getFullYear();

//   // Generate table rows for products
//   let serialNumber = 1;
//   const tableRows = items.map((item) => `
//     <tr>
//       <td>${serialNumber++}</td>
//       <td>${item.description || ""}</td>
//       <td class="numeric">${item.qty || ""}</td>
//       <td class="numeric">${item.rate ? Number(item.rate).toLocaleString("en-NG") : ""}</td>
//       <td class="numeric">${item.amount ? Number(item.amount).toLocaleString("en-NG") : ""}</td>
//     </tr>
//   `);

//   // Add two empty rows at the end
//   tableRows.push(`
//     <tr>
//       <td>${serialNumber++}</td>
//       <td></td>
//       <td class="numeric"></td>
//       <td class="numeric"></td>
//       <td class="numeric"></td>
//     </tr>
//   `);
//   tableRows.push(`
//     <tr>
//       <td>${serialNumber++}</td>
//       <td></td>
//       <td class="numeric"></td>
//       <td class="numeric"></td>
//       <td class="numeric"></td>
//     </tr>
//   `);

//   return `
//   <!DOCTYPE html>
//   <html>
//   <head>
//     <meta charset="UTF-8">
//     <style>
//       body { font-family: Arial, sans-serif; font-size: 14px; padding: 20px; box-sizing: border-box; }
//       .header, .footer, .signatures { page-break-inside: avoid; }
//       .header { display: flex; align-items: center; justify-content: space-between; text-align: center; }
//       .header-left, .header-right { width: 20%; }
//       .header-center { width: 60%; }
//       .header img.logo { width: 80px; }
//       .header img.side-img { width: 100%; max-width: 120px; }
//       .header h2 { margin: 5px 0; font-size: 18px; }
//       .services { font-size: 12px; color: #444; text-align: center; margin-bottom: 5px; }
//       .motto { font-size: 14px; color: #444; font-style: italic; text-align: center; margin-bottom: 5px;font-weight: bold; }
//       .contact-info { font-size: 12px; margin: 2px 0; text-align: center; }
//       .title { text-align: center; font-size: 16px; font-weight: bold; margin: 10px 0; border: 2px solid #000;border-radius: 5px;  }
//       .info-row { display: flex; justify-content: space-between; margin: 10px 0; font-size: 14px; }
//       .date-box { display: flex; gap: 10px; border-radius: 5px; text-align: center; }
//       .date-box span { display: inline-block; width: 100px; text-align: center; border: 1px solid #000; padding: 2px; }
//       table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; page-break-inside: auto; }
//       tr { page-break-inside: avoid; page-break-after: auto; }
//       th, td { border: 1px solid #000; padding: 6px; text-align: left; height: 30px; }
//       th { background-color: #f0f0f0; font-weight: bold; }
//       td.numeric { text-align: right; }
//       .footer { margin-top: 20px; font-size: 14px; }
//       .footer p { margin: 5px 0; }
//       .amount-words { display: flex; justify-content: space-between; margin-top: 10px; }
//       .amount-words span { display: inline-block;  text-align: center; }
//       .note { font-size: 12px; font-style: italic; margin-top: 10px; }
//       .signatures { display: flex; justify-content: space-between; margin-top: 30px; }
//       .sign-box { width: 45%; text-align: center; }
//       .sign-box img { max-height: 40px; margin-bottom: 6px; }
//       .rainbow-text {
//         background: linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet);
//         -webkit-background-clip: text;
//         -webkit-text-fill-color: transparent;
//         font-weight: bold;
//         font-size: 16px;
//       }
//     </style>
//   </head>
//   <body>
//     <div class="header">
//       <div class="header-left">
//         <img src="${electronicsURL}" class="side-img" alt="Electronics" />
//       </div>
//       <div class="header-center">
//         <img src="${logoURL}" class="logo" alt="D'More Tech Logo" />
//         <h2>D'MORE TECH ENGINEERING & TRADING COMPANY</h2>
//         <p class="motto"><strong style="font-size: 16px;">Motto:</strong> prendre le risque</p>
//         <p class="contact-info">Deal with sales of electronics such as TVs, home theater, freezer, oven, microwave, generator, air conditioner, blender, solar products, etc. sales, repair and maintenance</p>
//         <p class="contact-info"><strong>Office Address:</strong> Iyana Barack, Ojoo Ibadan</p>
//         <p class="contact-info"><strong>Email:</strong> olanlyl14@gmail.com, dmoretech44@gmail.com</p>
//         <p class="contact-info"><strong>Tel:</strong> 08142259939, 09030804218, 07057339815</p>
//         <p class="contact-info"><strong>RC:</strong> 3413570</p>
//       </div>
//       <div class="header-right">
//         <img src="${generatorFanURL}" class="side-img" alt="Generator and Fan" />
//         <img src="${generatorhomeURL}" class="side-img" alt="Generator and HOME" />
//       </div>
//     </div>

//     <div class="title">CASH SALES INVOICE</div>

//     <div class="info-row">
//       <p><strong>TO:</strong> ${buyer}</p>
//       <div class="date-box">
//         <span><strong>DAY:</strong> ${day}</span>
//         <span><strong>MONTH:</strong> ${month}</span>
//         <span><strong>YEAR:</strong> ${year}</span>
//       </div>
//     </div>

//     <table>
//       <thead>
//         <tr>
//           <th style="width: 10%;">S/N</th>
//           <th style="width: 40%;">Description of Goods</th>
//           <th style="width: 10%;">Qty</th>
//           <th style="width: 20%;">Rate (₦)</th>
//           <th style="width: 20%;">Amount (₦)</th>
//         </tr>
//       </thead>
//       <tbody>
//         ${tableRows.join('')}
//       </tbody>
//     </table>

//     <div class="footer">
//       <p style="text-align: right; border: 1px solid #000;"><strong>TOTAL ₦</strong> ${Number(total).toLocaleString("en-NG")}</p>
//       <p><strong>Amount in words:</strong> ${totalInWords}</p>
//       <div class="amount-words">
//         <span></span>
//         <span></span>
//       </div>
//     </div>

//     <p class="note">Please Note: Goods sold in good condition are not returnable or exchanged. Thanks for your patronage.</p>

//     <div class="signatures">
//       <div class="sign-box">
//         <div class="sign-label">Customer's Signature</div>
//         ${customerSign ? `<img src="${customerSign}" alt="Customer Signature" />_____________________` : '<p>No signature provided</p>'}
//       </div>
//       <div class="sign-box">
//         <div class="sign-label">Manager's Signature</div>
//         ${managerSign ? `<img src="${managerSign}" alt="Manager Signature" />__________________` : '<p class="rainbow-text">D\'more Tech</p>'}
//       </div>
//     </div>
//   </body>
//   </html>`;
// }

// // Start the server
// app.listen(PORT, () => {
//   console.log(`🚀 Server running at http://localhost:${PORT}`);
// });



// require('dotenv').config();

// const express = require('express');
// const cors = require('cors');
// const fs = require('fs');
// const path = require('path');
// const nodemailer = require('nodemailer');
// const { ToWords } = require('to-words');
// const puppeteer = require('puppeteer');
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

// // Serve the frontend (index.html)
// app.get('/', (req, res) => {
//   res.sendFile(path.join(__dirname, 'index.html'));
// });

// // Invoice API
// app.post('/api/invoice', async (req, res) => {
//   const { email, phone, items, total, customerSign, buyer } = req.body;
//   const id = uuidv4();
//   const fileName = `invoice_${id}.pdf`;
//   const totalInWords = toWords.convert(total, { currency: true, ignoreDecimal: true });

//   try {
//     console.log("Items received:", items);

//     // Load images as base64 (since Vercel can access the public directory)
//     const logoBase64 = Buffer.from(fs.readFileSync(path.join(__dirname, 'public/images/logo.png'))).toString('base64');
//     const logoURL = `data:image/png;base64,${logoBase64}`;

//     const electronicsBase64 = Buffer.from(fs.readFileSync(path.join(__dirname, 'public/images/gen.jpg'))).toString('base64');
//     const electronicsURL = `data:image/png;base64,${electronicsBase64}`;

//     const generatorFanBase64 = Buffer.from(fs.readFileSync(path.join(__dirname, 'public/images/fan.jpg'))).toString('base64');
//     const generatorFanURL = `data:image/png;base64,${generatorFanBase64}`;

//     const generatorhomeBase64 = Buffer.from(fs.readFileSync(path.join(__dirname, 'public/images/home.png'))).toString('base64');
//     const generatorhomeURL = `data:image/png;base64,${generatorhomeURL}`;

//     let managerSignURL = '';
//     try {
//       const managerSignBase64 = Buffer.from(fs.readFileSync(path.join(__dirname, 'public/images/manager_signature.png'))).toString('base64');
//       managerSignURL = `data:image/png;base64,${managerSignBase64}`;
//     } catch (err) {
//       console.warn("Manager signature not found, falling back to frontend default:", err.message);
//       managerSignURL = '';
//     }

//     const htmlContent = generateInvoiceHTML({
//       logoURL,
//       electronicsURL,
//       generatorFanURL,
//       generatorhomeURL,
//       buyer,
//       items,
//       total,
//       totalInWords,
//       customerSign,
//       managerSign: managerSignURL,
//     });

//     // Launch Puppeteer for Vercel
//     const browser = await puppeteer.launch({
//       headless: 'new',
//       args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
//       executablePath: process.env.CHROME_BIN || null, // Vercel sets this
//     });
//     const page = await browser.newPage();
//     await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });

//     await page.evaluateHandle('document.fonts.ready');
//     const pdfBuffer = await page.pdf({
//       format: 'A4',
//       printBackground: true,
//       margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
//       preferCSSPageSize: true,
//     });

//     await browser.close();

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
//       html: `<p>Dear ${buyer},<br>Please find your invoice attached as a PDF. Thank you!</p>`,
//       attachments: [
//         {
//           filename: fileName,
//           content: pdfBuffer,
//           contentType: 'application/pdf',
//         },
//       ],
//     };

//     const info = await transporter.sendMail(mailOptions);
//     console.log("✅ Email sent:", info.messageId);

//     // Generate a data URI for the PDF to return to the frontend
//     const pdfDataUri = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;

//     // Create WhatsApp link with a message (no download URL since we can't write to disk on Vercel)
//     const whatsappLink = `https://wa.me/${phone}?text=${encodeURIComponent(`Hello ${buyer}, your invoice from D'MORE TECH Amount is ₦${total}.`)}`;

//     res.json({
//       message: "Invoice sent and PDF generated.",
//       whatsappLink,
//       pdfDataUri, // Send the PDF as a data URI
//       managerSign: managerSignURL,
//     });

//   } catch (err) {
//     console.error("❌ Error generating invoice:", err);
//     res.status(500).json({ error: `Failed to generate or send invoice: ${err.message}` });
//   }
// });

// // HTML generator (unchanged)
// function generateInvoiceHTML({ logoURL, electronicsURL, generatorhomeURL, generatorFanURL, buyer, items, total, totalInWords, customerSign, managerSign }) {
//   const date = new Date();
//   const day = date.getDate().toString().padStart(2, '0');
//   const month = (date.getMonth() + 1).toString().padStart(2, '0');
//   const year = date.getFullYear();

//   let serialNumber = 1;
//   const tableRows = items.map((item) => `
//     <tr>
//       <td>${serialNumber++}</td>
//       <td>${item.description || ""}</td>
//       <td class="numeric">${item.qty || ""}</td>
//       <td class="numeric">${item.rate ? Number(item.rate).toLocaleString("en-NG") : ""}</td>
//       <td class="numeric">${item.amount ? Number(item.amount).toLocaleString("en-NG") : ""}</td>
//     </tr>
//   `);

//   tableRows.push(`
//     <tr>
//       <td>${serialNumber++}</td>
//       <td></td>
//       <td class="numeric"></td>
//       <td class="numeric"></td>
//       <td class="numeric"></td>
//     </tr>
//   `);
//   tableRows.push(`
//     <tr>
//       <td>${serialNumber++}</td>
//       <td></td>
//       <td class="numeric"></td>
//       <td class="numeric"></td>
//       <td class="numeric"></td>
//     </tr>
//   `);

//   return `
//   <!DOCTYPE html>
//   <html>
//   <head>
//     <meta charset="UTF-8">
//     <style>
//       body { font-family: Arial, sans-serif; font-size: 14px; padding: 20px; box-sizing: border-box; }
//       .header, .footer, .signatures { page-break-inside: avoid; }
//       .header { display: flex; align-items: center; justify-content: space-between; text-align: center; }
//       .header-left, .header-right { width: 20%; }
//       .header-center { width: 60%; }
//       .header img.logo { width: 80px; }
//       .header img.side-img { width: 100%; max-width: 120px; }
//       .header h2 { margin: 5px 0; font-size: 18px; }
//       .services { font-size: 12px; color: #444; text-align: center; margin-bottom: 5px; }
//       .motto { font-size: 14px; color: #444; font-style: italic; text-align: center; margin-bottom: 5px;font-weight: bold; }
//       .contact-info { font-size: 12px; margin: 2px 0; text-align: center; }
//       .title { text-align: center; font-size: 16px; font-weight: bold; margin: 10px 0; border: 2px solid #000;border-radius: 5px;  }
//       .info-row { display: flex; justify-content: space-between; margin: 10px 0; font-size: 14px; }
//       .date-box { display: flex; gap: 10px; border-radius: 5px; text-align: center; }
//       .date-box span { display: inline-block; width: 100px; text-align: center; border: 1px solid #000; padding: 2px; }
//       table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; page-break-inside: auto; }
//       tr { page-break-inside: avoid; page-break-after: auto; }
//       th, td { border: 1px solid #000; padding: 6px; text-align: left; height: 30px; }
//       th { background-color: #f0f0f0; font-weight: bold; }
//       td.numeric { text-align: right; }
//       .footer { margin-top: 20px; font-size: 14px; }
//       .footer p { margin: 5px 0; }
//       .amount-words { display: flex; justify-content: space-between; margin-top: 10px; }
//       .amount-words span { display: inline-block;  text-align: center; }
//       .note { font-size: 12px; font-style: italic; margin-top: 10px; }
//       .signatures { display: flex; justify-content: space-between; margin-top: 30px; }
//       .sign-box { width: 45%; text-align: center; }
//       .sign-box img { max-height: 40px; margin-bottom: 6px; }
//       .rainbow-text {
//         background: linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet);
//         -webkit-background-clip: text;
//         -webkit-text-fill-color: transparent;
//         font-weight: bold;
//         font-size: 16px;
//       }
//     </style>
//   </head>
//   <body>
//     <div class="header">
//       <div class="header-left">
//         <img src="${electronicsURL}" class="side-img" alt="Electronics" />
//       </div>
//       <div class="header-center">
//         <img src="${logoURL}" class="logo" alt="D'More Tech Logo" />
//         <h2>D'MORE TECH ENGINEERING & TRADING COMPANY</h2>
//         <p class="motto"><strong style="font-size: 16px;">Motto:</strong> prendre le risque</p>
//         <p class="contact-info">Deal with sales of electronics such as TVs, home theater, freezer, oven, microwave, generator, air conditioner, blender, solar products, etc. sales, repair and maintenance</p>
//         <p class="contact-info"><strong>Office Address:</strong> Iyana Barack, Ojoo Ibadan</p>
//         <p class="contact-info"><strong>Email:</strong> olanlyl14@gmail.com, dmoretech44@gmail.com</p>
//         <p class="contact-info"><strong>Tel:</strong> 08142259939, 09030804218, 07057339815</p>
//         <p class="contact-info"><strong>RC:</strong> 3413570</p>
//       </div>
//       <div class="header-right">
//         <img src="${generatorFanURL}" class="side-img" alt="Generator and Fan" />
//         <img src="${generatorhomeURL}" class="side-img" alt="Generator and HOME" />
//       </div>
//     </div>

//     <div class="title">CASH SALES INVOICE</div>

//     <div class="info-row">
//       <p><strong>TO:</strong> ${buyer}</p>
//       <div class="date-box">
//         <span><strong>DAY:</strong> ${day}</span>
//         <span><strong>MONTH:</strong> ${month}</span>
//         <span><strong>YEAR:</strong> ${year}</span>
//       </div>
//     </div>

//     <table>
//       <thead>
//         <tr>
//           <th style="width: 10%;">S/N</th>
//           <th style="width: 40%;">Description of Goods</th>
//           <th style="width: 10%;">Qty</th>
//           <th style="width: 20%;">Rate (₦)</th>
//           <th style="width: 20%;">Amount (₦)</th>
//         </tr>
//       </thead>
//       <tbody>
//         ${tableRows.join('')}
//       </tbody>
//     </table>

//     <div class="footer">
//       <p style="text-align: right; border: 1px solid #000;"><strong>TOTAL ₦</strong> ${Number(total).toLocaleString("en-NG")}</p>
//       <p><strong>Amount in words:</strong> ${totalInWords}</p>
//       <div class="amount-words">
//         <span></span>
//         <span></span>
//       </div>
//     </div>

//     <p class="note">Please Note: Goods sold in good condition are not returnable or exchanged. Thanks for your patronage.</p>

//     <div class="signatures">
//       <div class="sign-box">
//         <div class="sign-label">Customer's Signature</div>
//         ${customerSign ? `<img src="${customerSign}" alt="Customer Signature" />_____________________` : '<p>No signature provided</p>'}
//       </div>
//       <div class="sign-box">
//         <div class="sign-label">Manager's Signature</div>
//         ${managerSign ? `<img src="${managerSign}" alt="Manager Signature" />__________________` : '<p class="rainbow-text">D\'more Tech</p>'}
//       </div>
//     </div>
//   </body>
//   </html>`;
// }

// // Start the server
// app.listen(PORT, () => {
//   console.log(`🚀 Server running at http://localhost:${PORT}`);
// });






// require('dotenv').config();

// const express = require('express');
// const fs = require('fs');
// const cors = require('cors');
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
// app.use(express.static('public'));

// // Serve the frontend (index.html)
// app.get('/', (req, res) => {
//   res.sendFile(path.join(__dirname, 'index.html'));
// });

// // Invoice API
// app.post('/api/invoice', async (req, res) => {
//   const { email, phone, items, total, customerSign, buyer } = req.body;
//   const id = uuidv4();
//   const fileName = `invoice_${id}.pdf`;

//   const totalInWords = toWords.convert(total, { currency: true, ignoreDecimal: true });

//   try {
//     // Initialize PDF document
//     const doc = new PDFDocument({
//       size: 'A4',
//       margin: 20,
//       bufferPages: true,
//     });

//     const buffers = [];
//     doc.on('data', buffers.push.bind(buffers));
//     doc.on('end', async () => {
//       const pdfBuffer = Buffer.concat(buffers);

//       // Configure Nodemailer transporter
//       const transporter = nodemailer.createTransport({
//         service: 'gmail',
//         auth: {
//           user: process.env.MAIL_SENDER,
//           pass: process.env.MAIL_PASS,
//         },
//       });

//       await transporter.verify();

//       const mailOptions = {
//         from: process.env.MAIL_SENDER,
//         to: email,
//         cc: process.env.MAIL_CC || "",
//         subject: "D'MORE TECH Invoice",
//         html: `<p>Dear ${buyer},<br>Please find your invoice attached as a PDF AND DOWNLOAD. Thank you!</p>`,
//         attachments: [
//           {
//             filename: fileName,
//             content: pdfBuffer,
//             contentType: 'application/pdf',
//           },
//         ],
//       };

//       const info = await transporter.sendMail(mailOptions);
//       console.log("✅ Email sent:", info.messageId);

//       const whatsappLink = `https://wa.me/${phone}?text=${encodeURIComponent(`Hello ${buyer}, your invoice from D'MORE TECH Amount is ₦${total}. Please check your email for the invoice PDF.`)}`;

//       const downloadURL = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;

//       res.json({
//         message: "Invoice sent and PDF generated.",
//         whatsappLink,
//         downloadURL,
//         managerSign: '',
//       });
//     });

//     // PDF Content Generation
//     doc.font('Helvetica');

//     // Function to check and add new page if needed
//     const checkPageOverflow = (yPosition, spaceNeeded) => {
//       const pageHeight = doc.page.height - doc.page.margins.bottom;
//       if (yPosition + spaceNeeded > pageHeight) {
//         doc.addPage();
//         return doc.page.margins.top;
//       }
//       return yPosition;
//     };

//     // Header: Images and Company Info
//     let logoBuffer, electronicsBuffer, generatorFanBuffer, generatorHomeBuffer, managerSignBuffer;
//     try {
//       logoBuffer = fs.readFileSync(path.join(__dirname, 'public', 'images', 'logo.png'));
//       doc.image(logoBuffer, (doc.page.width - 100) / 2, 15, { width: 100 });
//     } catch (err) {
//       console.warn('Logo image not found:', err.message);
//     }

//     try {
//       electronicsBuffer = fs.readFileSync(path.join(__dirname, 'public', 'images', 'gen.jpg'));
//       doc.image(electronicsBuffer, 15, 15, { width: 110 });
//     } catch (err) {
//       console.warn('Electronics image not found:', err.message);
//     }
//     try {
//       generatorFanBuffer = fs.readFileSync(path.join(__dirname, 'public', 'images', 'fan.jpg'));
//       generatorHomeBuffer = fs.readFileSync(path.join(__dirname, 'public', 'images', 'home.png'));
//       doc.image(generatorFanBuffer, doc.page.width - 125, 15, { width: 110 });
//       doc.image(generatorHomeBuffer, doc.page.width - 125, 130, { width: 110 });
//     } catch (err) {
//       console.warn('Generator images not found:', err.message);
//     }

//     doc.moveDown(14);
//     doc.fontSize(18).font('Helvetica-Bold').text("D'MORE TECH ENGINEERING & TRADING COMPANY", { align: 'center' });
//     doc.fontSize(14).font('Helvetica-Bold').text("Motto: prendre le risque", { align: 'center' });
//     doc.fontSize(12).font('Helvetica').text(
//       "Deal with sales of electronics such as TVs, home theater, freezer, oven, microwave, Freezers, Generators, solar products, etc. sales, repair and maintenance",
//       50,
//       doc.y,
//       { align: 'center', width: doc.page.width - 100 }
//     );
//     doc.text("Office Address: Iyana Barrack, Ojoo Ibadan", { align: 'center' });
//     doc.text("Email: 📧 olanilyi44@gmail.com,dmoretech44@gmail.com", { align: 'center' });
//     doc.text("Tel: 📞 08142259939, 09030804218, 07057339815", { align: 'center' });
//     doc.text("RC: 3415570", { align: 'center' });
//     doc.moveDown(3);

//     // Title with border
//     doc.fontSize(16).font('Helvetica-Bold').text("CASH SALES INVOICE", { align: 'center' });
//     doc.lineWidth(2);
//     doc.rect(50, doc.y - 20, doc.page.width - 100, 40).stroke();
//     doc.lineWidth(1);
//     doc.moveDown(2);

//     // Buyer and Date
//     const date = new Date();
//     const day = date.getDate().toString().padStart(2, '0');
//     const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Ensure month is always set
//     const year = date.getFullYear();

//     doc.fontSize(12);
//     let yPosition = doc.y;
//     doc.text(`TO: ${buyer.charAt(0).toUpperCase() + buyer.slice(1)}`, 50, yPosition); // Capitalize buyer name
//     doc.font('Helvetica-Bold');
//     doc.text(`DAY: ${day}`, 390, yPosition, { width: 50, align: 'center' });
//     doc.rect(390, yPosition - 5, 50, 25).stroke();
//     doc.text(`MONTH: ${month}`, 455, yPosition, { width: 50, align: 'center' });
//     doc.rect(455, yPosition - 5, 50, 25).stroke();
//     doc.text(`YEAR: ${year}`, 520, yPosition, { width: 50, align: 'center' });
//     doc.rect(520, yPosition - 5, 50, 25).stroke();
//     doc.font('Helvetica');
//     doc.moveDown(2);

//     // Table Header
//     yPosition = doc.y;
//     yPosition = checkPageOverflow(yPosition, 20); // Check for header
//     doc.font('Helvetica-Bold').fontSize(12);
//     doc.text('S/N', 50, yPosition, { width: 50 });
//     doc.text('Description of Goods', 100, yPosition, { width: 200 });
//     doc.text('Qty', 300, yPosition, { width: 50, align: 'right' });
//     doc.text('Rate (₦)', 350, yPosition, { width: 100, align: 'right' });
//     doc.text('Amount (₦)', 450, yPosition, { width: 100, align: 'right' });

//     doc.rect(50, yPosition - 5, 50, 20).fillAndStroke('#f0f0f0', '#000');
//     doc.rect(100, yPosition - 5, 200, 20).fillAndStroke('#f0f0f0', '#000');
//     doc.rect(300, yPosition - 5, 50, 20).fillAndStroke('#f0f0f0', '#000');
//     doc.rect(350, yPosition - 5, 100, 20).fillAndStroke('#f0f0f0', '#000');
//     doc.rect(450, yPosition - 5, 100, 20).fillAndStroke('#f0f0f0', '#000');
//     doc.fillColor('black');
//     doc.moveDown();

//     // Table Rows
//     doc.font('Helvetica').fontSize(12);
//     let serialNumber = 1;
//     yPosition = doc.y;

//     // Render items
//     items.forEach((item) => {
//       yPosition = checkPageOverflow(yPosition, 30); // Check for each row
//       const textY = yPosition + 7;
//       doc.text(`${serialNumber++}`, 50, textY, { width: 50 });
//       doc.text(item.description || '', 100, textY, { width: 200 });
//       doc.text(item.qty || '', 300, textY, { width: 50, align: 'right' });
//       doc.text(item.rate ? Number(item.rate).toLocaleString('en-NG') : '', 350, textY, {
//         width: 100,
//         align: 'right',
//       });
//       doc.text(item.amount ? Number(item.amount).toLocaleString('en-NG') : '', 450, textY, {
//         width: 100,
//         align: 'right',
//       });
//       doc.rect(50, yPosition, 50, 30).stroke();
//       doc.rect(100, yPosition, 200, 30).stroke();
//       doc.rect(300, yPosition, 50, 30).stroke();
//       doc.rect(350, yPosition, 100, 30).stroke();
//       doc.rect(450, yPosition, 100, 30).stroke();
//       yPosition += 30;
//     });

//     // Ensure 10 rows total by adding empty rows
//     const rowsToAdd = 10 - items.length;
//     for (let i = 0; i < rowsToAdd; i++) {
//       yPosition = checkPageOverflow(yPosition, 30);
//       const textY = yPosition + 7;
//       doc.text(`${serialNumber++}`, 50, textY, { width: 50 });
//       doc.text('', 100, textY, { width: 200 });
//       doc.text('', 300, textY, { width: 50, align: 'right' });
//       doc.text('', 350, textY, { width: 100, align: 'right' });
//       doc.text('', 450, textY, { width: 100, align: 'right' });
//       doc.rect(50, yPosition, 50, 30).stroke();
//       doc.rect(100, yPosition, 200, 30).stroke();
//       doc.rect(300, yPosition, 50, 30).stroke();
//       doc.rect(350, yPosition, 100, 30).stroke();
//       doc.rect(450, yPosition, 100, 30).stroke();
//       yPosition += 30;
//     }

//     // Total
//     yPosition = checkPageOverflow(yPosition, 20);
//     doc.moveDown(1);
//     const totalText = `TOTAL ₦${Number(total).toLocaleString('en-NG')}`;
//     doc.fontSize(12).font('Helvetica-Bold');
//     doc.text(totalText, 450, yPosition, { width: 100, align: 'right' });
//     doc.rect(450, yPosition - 5, 100, 20).stroke();
//     doc.font('Helvetica');

//     // Amount in Words
//     yPosition = checkPageOverflow(yPosition + 20, 20);
//     doc.moveDown(0.5);
//     doc.fontSize(12).text(`Amount in words: ${totalInWords}`, 50, yPosition);

//     // Note
//     yPosition = checkPageOverflow(yPosition + 20, 20);
//     doc.moveDown(0.5);
//     doc.fontSize(10).font('Helvetica-Oblique').text(
//       'Please Note: Goods sold in good condition are not returnable or exchanged. Thanks for your patronage.',
//       50,
//       yPosition,
//       { align: 'left' }
//     );
//     doc.font('Helvetica');

//     // Signatures
//     yPosition = checkPageOverflow(yPosition + 20, 80);
//     doc.moveDown(4);
//     const signY = yPosition;

//     doc.fontSize(12).text("Customer's Signature", 50, signY, { align: 'center', width: 200 });
//     if (customerSign && customerSign.startsWith('data:image/')) {
//       try {
//         const base64Data = customerSign.split(',')[1];
//         const customerSignBuffer = Buffer.from(base64Data, 'base64');
//         doc.image(customerSignBuffer, 50, signY + 20, { width: 150 });
//         doc.text('_____________________', 50, signY + 60, { width: 150, align: 'center' });
//       } catch (err) {
//         console.error('Error adding customer signature:', err.message);
//         doc.text('No signature provided', 50, signY + 20, { width: 150, align: 'center' });
//       }
//     } else {
//       doc.text('No signature provided', 50, signY + 20, { width: 150, align: 'center' });
//     }

//     doc.fontSize(12).text("Manager's Signature", 350, signY, { align: 'center', width: 200 });
//     try {
//       managerSignBuffer = fs.readFileSync(path.join(__dirname, 'public', 'images', 'manager_signature.png'));
//       doc.image(managerSignBuffer, 350, signY + 20, { width: 150 });
//       doc.text('_____________________', 350, signY + 60, { width: 150, align: 'center' });
//     } catch (err) {
//       console.warn('Manager signature not found, using fallback text:', err.message);
//       doc
//         .fontSize(12)
//         .fillColor('blue')
//         .text("D'more Tech", 350, signY + 20, { width: 150, align: 'center' });
//     }

//     // Finalize PDF
//     doc.end();
//   } catch (err) {
//     console.error("❌ Error generating invoice:", err);
//     res.status(500).json({ error: 'Failed to generate or send invoice.' });
//   }
// });

// // Start the server
// app.listen(PORT, () => {
//   console.log(`🚀 Server running at http://localhost:${PORT}`);
// });








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

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
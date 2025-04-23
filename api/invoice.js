const nodemailer = require('nodemailer');
const { ToWords } = require('to-words');
const PDFDocument = require('pdfkit');

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

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();

  const { email, phone, items, total, customerSign, buyer } = req.body;
  const totalInWords = toWords.convert(total, { currency: true, ignoreDecimal: true });

  try {
    // Generate PDF using pdfkit
    const doc = new PDFDocument({
      size: 'A4',
      margin: 20,
    });

    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', async () => {
      const pdfBuffer = Buffer.concat(buffers);

      // Send email with PDF attachment
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.MAIL_SENDER,
          pass: process.env.MAIL_PASS,
        },
        pool: true,
      });

      const mailOptions = {
        from: process.env.MAIL_SENDER,
        to: email,
        cc: process.env.MAIL_CC || "",
        subject: "D'MORE TECH Invoice",
        html: `<p>Dear ${buyer},<br>Please find your invoice attached as a PDF. Thank you!</p>`,
        attachments: [
          {
            filename: `invoice_${Date.now()}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      };

      await transporter.sendMail(mailOptions);

      const pdfDataUri = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;
      const whatsappLink = `https://wa.me/${phone}?text=${encodeURIComponent(`Hello ${buyer}, your invoice from D'MORE TECH Amount is ₦${total}. Please check your email for the invoice PDF.`)}`;

      const endTime = Date.now();
      console.log(`Request processed in ${endTime - startTime}ms`);

      res.status(200).json({
        message: "Invoice sent and PDF generated.",
        whatsappLink,
        pdfDataUri,
        managerSign: '',
      });
    });

    // Add content to the PDF
    doc.font('Helvetica');

    // Header
    doc.fontSize(18).text("D'MORE TECH ENGINEERING & TRADING COMPANY", { align: 'center' });
    doc.fontSize(14).text("Motto: prendre le risque", { align: 'center' });
    doc.fontSize(12).text("Deal with sales of electronics such as TVs, home theater, freezer, oven, microwave, generator, air conditioner, blender, solar products, etc. sales, repair and maintenance", { align: 'center' });
    doc.fontSize(12).text("Office Address: Iyana Barack, Ojoo Ibadan", { align: 'center' });
    doc.fontSize(12).text("Email: olanlyl14@gmail.com, dmoretech44@gmail.com", { align: 'center' });
    doc.fontSize(12).text("Tel: 08142259939, 09030804218, 07057339815", { align: 'center' });
    doc.fontSize(12).text("RC: 3413570", { align: 'center' });
    doc.moveDown();

    // Title
    doc.fontSize(16).text("CASH SALES INVOICE", { align: 'center' });
    doc.moveDown();

    // Buyer and Date
    const date = new Date();
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();

    doc.fontSize(12).text(`TO: ${buyer}`, 50, doc.y);
    doc.text(`DAY: ${day}   MONTH: ${month}   YEAR: ${year}`, 400, doc.y - 15, { align: 'right' });
    doc.moveDown();

    // Table Header
    const tableTop = doc.y;
    doc.font('Helvetica-Bold');
    doc.text('S/N', 50, tableTop, { width: 30 });
    doc.text('Description of Goods', 80, tableTop, { width: 200 });
    doc.text('Qty', 280, tableTop, { width: 50, align: 'right' });
    doc.text('Rate (₦)', 330, tableTop, { width: 80, align: 'right' });
    doc.text('Amount (₦)', 410, tableTop, { width: 80, align: 'right' });
    doc.moveDown();

    // Table Rows
    doc.font('Helvetica');
    let serialNumber = 1;
    let yPosition = doc.y;
    items.forEach((item) => {
      doc.text(`${serialNumber++}`, 50, yPosition, { width: 30 });
      doc.text(item.description || "", 80, yPosition, { width: 200 });
      doc.text(item.qty || "", 280, yPosition, { width: 50, align: 'right' });
      doc.text(item.rate ? Number(item.rate).toLocaleString("en-NG") : "", 330, yPosition, { width: 80, align: 'right' });
      doc.text(item.amount ? Number(item.amount).toLocaleString("en-NG") : "", 410, yPosition, { width: 80, align: 'right' });
      yPosition += 20;
    });

    // Add empty rows
    for (let i = 0; i < 2; i++) {
      doc.text(`${serialNumber++}`, 50, yPosition, { width: 30 });
      doc.text("", 80, yPosition, { width: 200 });
      doc.text("", 280, yPosition, { width: 50, align: 'right' });
      doc.text("", 330, yPosition, { width: 80, align: 'right' });
      doc.text("", 410, yPosition, { width: 80, align: 'right' });
      yPosition += 20;
    }

    // Total
    doc.moveDown();
    doc.text(`TOTAL ₦${Number(total).toLocaleString("en-NG")}`, { align: 'right' });
    doc.moveDown();
    doc.text(`Amount in words: ${totalInWords}`, 50, doc.y);

    // Note
    doc.moveDown();
    doc.fontSize(10).text("Please Note: Goods sold in good condition are not returnable or exchanged. Thanks for your patronage.", { align: 'left' });

    // Signatures
    doc.moveDown(2);
    doc.text("Customer's Signature: _____________________", 50, doc.y);
    doc.text("Manager's Signature: _____________________", 350, doc.y, { align: 'right' });

    doc.end();
  } catch (err) {
    const endTime = Date.now();
    console.error(`Request failed after ${endTime - startTime}ms:`, err);
    res.status(500).json({ error: `Failed to generate or send invoice: ${err.message}` });
  }
};
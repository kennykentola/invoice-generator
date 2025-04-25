const fs = require('fs');
const path = require('path');

const invoicesDir = path.join(__dirname, '..', 'invoices');

module.exports = async (req, res) => {
  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: 'Missing invoice id' });
  }

  const fileName = `invoice_${id}.pdf`;
  const filePath = path.join(invoicesDir, fileName);

  try {
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Invoice not found or expired' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (err) {
    console.error('Error serving invoice:', err);
    res.status(500).json({ error: 'Failed to serve invoice' });
  }
};

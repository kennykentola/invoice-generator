// /api/download.js
import { pdfStorage } from './invoice';

export default function handler(req, res) {
  const { id } = req.query;
  const pdfBase64 = pdfStorage.get(id);

  if (!pdfBase64) {
    return res.status(404).json({ error: 'Invoice not found or expired' });
  }

  const pdfBuffer = Buffer.from(pdfBase64, 'base64');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=invoice_${id}.pdf`);
  res.send(pdfBuffer);

  // Clean up
  pdfStorage.delete(id);
}
const fs = require('fs');
const path = require('path');

const invoicesDir = path.join(__dirname, '..', 'invoices');
const DAYS_TO_KEEP = 80;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

async function cleanupOldInvoices() {
  try {
    const files = await fs.promises.readdir(invoicesDir);
    const now = Date.now();

    for (const file of files) {
      if (file.endsWith('.pdf')) {
        const filePath = path.join(invoicesDir, file);
        const stats = await fs.promises.stat(filePath);
        const ageInDays = (now - stats.mtimeMs) / MS_PER_DAY;

        if (ageInDays > DAYS_TO_KEEP) {
          await fs.promises.unlink(filePath);
          console.log(`Deleted old invoice: ${file}`);
        }
      }
    }
    console.log('Cleanup completed.');
  } catch (err) {
    console.error('Error during cleanup:', err);
  }
}

cleanupOldInvoices();

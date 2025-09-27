const Tesseract = require('tesseract.js');
const fs = require('fs');

async function runOCR(imagePath) {
  // Note: tesseract.js launches workers and can be slow on first run.
  const worker = await Tesseract.createWorker();
  await worker.load();
  await worker.loadLanguage('eng');
  await worker.initialize('eng');

  const { data } = await worker.recognize(imagePath);
  await worker.terminate();

  return { text: data.text, confidence: data.confidence || 0.75 };
}

module.exports = { runOCR };

const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const { runOCR } = require('./ocr');
const { processSurvey } = require('./pipeline');

// POST /api/parse
// Accepts either { text: "..." } or multipart/form-data with `image` or both.
router.post('/parse', upload.single('image'), async (req, res) => {
  try {
    const { text } = req.body;
    let ocrResult = null;

    if (req.file) {
      // run OCR on uploaded image
      ocrResult = await runOCR(req.file.path);
    }

    const rawText = text || (ocrResult && ocrResult.text) || null;
    const confidence = ocrResult ? ocrResult.confidence : 1.0;

    if (!rawText) {
      return res.status(400).json({ status: 'error', message: 'No text or image provided' });
    }

    const result = await processSurvey({ raw_text: rawText, ocr_confidence: confidence });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

module.exports = router;

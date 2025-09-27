/**
 * processSurvey({ raw_text, ocr_confidence })
 * - parse text into fields
 * - compute missing fields
 * - map to factors
 * - score and produce risk_level (low/medium/high)
 * - return recommendations
 */

const { safeLower } = require('./utils');

const EXPECTED_FIELDS = ['age', 'smoker', 'exercise', 'diet', 'alcohol', 'bmi'];

function parseKeyValueText(raw) {
  // Very simple parser: looks for lines like "Key: value" or JSON inside
  let answers = {};

  try {
    const maybeJson = raw.trim();
    if (maybeJson.startsWith('{')) {
      const parsed = JSON.parse(maybeJson);
      return parsed;
    }
  } catch (e) {
    // ignore
  }

  // fallback parse line-by-line
  raw.split(/\n|;|,/).forEach(line => {
    const m = line.split(':');
    if (m.length >= 2) {
      const k = m[0].trim().toLowerCase();
      const v = m.slice(1).join(':').trim();
      answers[k] = v;
    }
  });

  // Normalize keys to expected names
  const normalized = {};
  Object.keys(answers).forEach(k => {
    const key = k.replace(/\s+/g, '_');
    normalized[key] = answers[k];
  });

  return normalized;
}

function normalizeAnswers(rawAnswers) {
  const a = {};
  if ('age' in rawAnswers) {
    const age = parseInt(rawAnswers.age);
    if (!isNaN(age)) a.age = age;
  }
  if ('smoker' in rawAnswers) {
    const v = safeLower(rawAnswers.smoker);
    a.smoker = v === 'yes' || v === 'true' || v === 'y' || v === '1' || v.includes('smok');
  }
  if ('exercise' in rawAnswers) {
    a.exercise = safeLower(rawAnswers.exercise);
  }
  if ('diet' in rawAnswers) {
    a.diet = safeLower(rawAnswers.diet);
  }
  if ('alcohol' in rawAnswers) {
    const v = safeLower(rawAnswers.alcohol || '');
    a.alcohol = v === 'yes' || v === 'true' || v === 'often' || v.includes('daily');
  }
  if ('bmi' in rawAnswers) {
    const n = parseFloat(String(rawAnswers.bmi).replace(/[^0-9.]/g, ''));
    if (!isNaN(n)) a.bmi = n;
  }
  return a;
}

function getMissingFields(normalized) {
  const missing = [];
  EXPECTED_FIELDS.forEach(f => {
    if (!(f in normalized)) missing.push(f);
  });
  return missing;
}

function extractFactors(normalized) {
  const factors = [];
  if (normalized.smoker) factors.push('smoking');
  if (normalized.diet && (normalized.diet.includes('high sugar') || normalized.diet.includes('junk') || normalized.diet.includes('fried') || normalized.diet.includes('processed'))) factors.push('poor diet');
  if (normalized.exercise && (normalized.exercise.includes('rare') || normalized.exercise.includes('none') || normalized.exercise.includes('little') )) factors.push('low exercise');
  if (typeof normalized.bmi === 'number' && normalized.bmi >= 30) factors.push('obesity');
  if (normalized.alcohol) factors.push('alcohol use');
  return { factors, confidence: 0.85 };
}

function computeScoreAndRisk(factors, normalized) {
  // Base score 0..100
  let score = 0;
  // each factor adds points
  const factorWeights = {
    'smoking': 30,
    'poor diet': 20,
    'low exercise': 15,
    'obesity': 25,
    'alcohol use': 10
  };
  factors.forEach(f => {
    score += factorWeights[f] || 5;
  });

  // age adjustment
  if (normalized.age && normalized.age >= 60) score += 10;
  else if (normalized.age && normalized.age >= 45) score += 5;

  if (score > 100) score = 100;

  let risk_level = 'low';
  if (score >= 70) risk_level = 'high';
  else if (score >= 40) risk_level = 'medium';

  return { score, risk_level, rationale: factors };
}

function generateRecommendations(factors, risk_level) {
  const recs = [];
  if (factors.includes('smoking')) recs.push('Quit smoking — seek support from cessation programs and consult a healthcare professional.');
  if (factors.includes('poor diet')) recs.push('Reduce sugar and processed foods; increase vegetables, whole grains, and lean proteins.');
  if (factors.includes('low exercise')) recs.push('Aim for at least 30 minutes of moderate activity (brisk walking) on most days.');
  if (factors.includes('obesity')) recs.push('Work with a dietitian to set a safe weight-loss plan; consider supervised exercise programs.');
  if (factors.includes('alcohol use')) recs.push('Limit alcohol intake; discuss safe limits with your clinician.');

  if (risk_level === 'high' && !recs.find(r => r.toLowerCase().includes('consult'))) recs.push('Schedule a check-up with a primary care provider for personalized assessment.');

  return recs;
}

async function processSurvey({ raw_text, ocr_confidence = 1.0 }) {
  // Step 1: parse
  const rawAnswers = parseKeyValueText(raw_text || '');
  const normalized = normalizeAnswers(rawAnswers);
  const missing_fields = getMissingFields(normalized);

  // Guardrail: if >50% expected fields missing -> incomplete_profile
  if (missing_fields.length / EXPECTED_FIELDS.length > 0.5) {
    return { status: 'incomplete_profile', reason: '>50% fields missing', parsed: normalized, missing_fields };
  }

  // Step 2: factor extraction
  const { factors, confidence: factors_conf } = extractFactors(normalized);

  // Step 3: risk classification
  const { score, risk_level, rationale } = computeScoreAndRisk(factors, normalized);

  // Step 4: recommendations
  const recommendations = generateRecommendations(factors, risk_level);

  return {
    status: 'ok',
    answers: normalized,
    missing_fields,
    confidence: Math.min(1, 0.5 + ocr_confidence * 0.5),
    factors,
    factors_confidence: factors_conf,
    risk: { risk_level, score, rationale },
    recommendations
  };
}

module.exports = { processSurvey };

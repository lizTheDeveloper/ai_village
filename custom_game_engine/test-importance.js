// Test importance calculation
const factors = {
  emotionalIntensity: 0.7,
  novelty: 0,
  goalRelevance: 0,
  socialSignificance: 0,
  survivalRelevance: 0.8
};

// Clamp function
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// Validate inputs
const validated = {
  emotionalIntensity: clamp(factors.emotionalIntensity, 0, 1),
  novelty: clamp(factors.novelty, 0, 1),
  goalRelevance: clamp(factors.goalRelevance, 0, 1),
  socialSignificance: clamp(factors.socialSignificance, 0, 1),
  survivalRelevance: clamp(factors.survivalRelevance, 0, 1),
};

// Calculate with normalized weights
let importance =
  validated.emotionalIntensity * 0.25 +
  validated.novelty * 0.25 +
  validated.goalRelevance * 0.167 +
  validated.socialSignificance * 0.125 +
  validated.survivalRelevance * 0.208;

console.log('Base importance (before boosts):', importance);

// Apply boosts
if (validated.novelty >= 0.9) {
  importance += 0.1;
  console.log('Applied novelty boost (+0.1)');
}
if (validated.goalRelevance >= 0.9) {
  importance += 0.1;
  console.log('Applied goal boost (+0.1)');
}
if (validated.survivalRelevance >= 0.9) {
  importance += 0.1;
  console.log('Applied survival boost (+0.1)');
}

console.log('Importance after boosts:', importance);

// Final clamp
importance = clamp(importance, 0, 1);
console.log('Final importance (clamped):', importance);

const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const pool = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const SYSTEM_PROMPT = `You are a non-medical supplement and lifestyle coach for generally healthy adults.
You do NOT diagnose or treat diseases, and you always recommend talking to a healthcare professional before starting any new supplement protocol.

Goals:
Use the user's goals (fitness/performance, health/energy, or longevity), current supplement stack, and diet to suggest a simple, realistic supplement plan.
Prioritize safety, fundamentals, and cost-effectiveness over exotic or risky supplements.
Keep daily pill counts reasonable and respect the user's stated budget and preferences.

Rules:
Keep language clear and simple.
Avoid medical claims, diagnose/treat language, or specific medical advice.
Clearly label what is optional vs. foundational.
You MUST respond with only a valid JSON object — no markdown, no explanation, no text outside the JSON.`;

function buildLifestyleBlock(profile) {
  const g = profile.goal_profile;
  if (g === 'fitness_performance') {
    return [
      `Training days per week: ${profile.training_days_per_week ?? 'not specified'}`,
      `Training style: ${profile.training_style ?? 'not specified'}`,
      `Experience level: ${profile.experience_level ?? 'not specified'}`,
    ].join('\n');
  }
  if (g === 'health_energy') {
    return [
      `Sleep quality: ${profile.sleep_quality_1_5 ?? 'not specified'} / 5`,
      `Stress level: ${profile.stress_level_1_5 ?? 'not specified'} / 5`,
      `Caffeine use: ${profile.caffeine_use ?? 'not specified'}`,
    ].join('\n');
  }
  if (g === 'longevity') {
    return [
      `Age range: ${profile.age_range ?? 'not specified'}`,
      `Open to bloodwork: ${profile.open_to_bloodwork ? 'yes' : 'no'}`,
      `Family history notes: ${profile.family_history_notes || 'none provided'}`,
    ].join('\n');
  }
  return 'Not specified';
}

function fillTemplate(profile, supplements) {
  const avoidList = Array.isArray(profile.avoid_categories) && profile.avoid_categories.length
    ? profile.avoid_categories.join(', ')
    : 'none';

  const supplementsJson = supplements.length
    ? JSON.stringify(
        supplements.map(s => ({
          name: s.name,
          brand: s.brand || undefined,
          type: s.supplement_type || undefined,
          servings_per_day: s.servings_per_day,
        })),
        null,
        2
      )
    : '[]';

  return `Here is the user's profile and data:

* Stack experience: ${profile.stack_experience ?? 'not specified'}
* Main goal profile: ${profile.goal_profile ?? 'not specified'}
* Training / lifestyle details:
${buildLifestyleBlock(profile)}
* Diet type: ${profile.diet_type ?? 'not specified'}
* Diet description (from their own words):
"""
${profile.diet_description || 'No description provided.'}
"""
* Budget level: ${profile.budget_level ?? 'not specified'}
* Max daily pills they are willing to take: ${profile.max_daily_pills ?? 'not specified'}
* Categories to avoid: ${avoidList}
* Current supplement stack (if any):
${supplementsJson}

Respond with ONLY this JSON structure (no markdown fences, no extra text):
{
  "summary": "2-3 sentence overview of their situation and goal track",
  "stackEvaluation": {
    "keep": ["supplement name or empty array if no stack"],
    "reconsider": ["supplement name or reason, or empty array"]
  },
  "foundations": [
    {
      "name": "supplement type name",
      "timing": "e.g. Morning with food",
      "rationale": "1-2 sentence non-medical rationale"
    }
  ],
  "niceToHave": [
    {
      "name": "supplement type name",
      "timing": "e.g. Pre-workout",
      "rationale": "1-2 sentence non-medical rationale"
    }
  ],
  "dietHabits": [
    "Simple actionable diet habit 1",
    "Simple actionable diet habit 2",
    "Simple actionable diet habit 3"
  ],
  "disclaimer": "One short sentence reminding them this is general info, not medical advice."
}

Do not mention brand names. Focus on supplement types. Keep foundations to 3-5 items max. niceToHave can be empty array if not appropriate.`;
}

// POST /recommend
router.post('/', async (req, res) => {
  try {
    const userResult = await pool.query('SELECT profile FROM users WHERE id = $1', [req.user.userId]);
    const profile = userResult.rows[0]?.profile;
    if (!profile) {
      return res.status(400).json({ error: 'Profile not set up yet. Please complete onboarding first.' });
    }

    const suppResult = await pool.query(
      'SELECT name, brand, supplement_type, servings_per_day FROM supplements WHERE user_id = $1 ORDER BY created_at ASC',
      [req.user.userId]
    );
    const supplements = suppResult.rows;

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: fillTemplate(profile, supplements) }],
    });

    const raw = message.content[0].text.trim()
      .replace(/^```(?:json)?\n?/, '')
      .replace(/\n?```$/, '');

    const plan = JSON.parse(raw);
    res.json({ plan });
  } catch (err) {
    console.error('Recommend error:', err?.status, err?.message);
    if (err instanceof SyntaxError) {
      return res.status(422).json({ error: 'Could not parse AI response' });
    }
    res.status(500).json({ error: err?.message || 'Server error' });
  }
});

module.exports = router;

const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// POST /scan — analyze a supplement bottle photo and extract details
router.post('/', async (req, res) => {
  const { image, mediaType } = req.body;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  console.log('ANTHROPIC_API_KEY loaded:', apiKey ? `${apiKey.slice(0, 16)}...` : 'MISSING');
  const client = new Anthropic({ apiKey });

  if (!image) {
    return res.status(400).json({ error: 'image (base64) is required' });
  }

  const imageMediaType = mediaType || 'image/jpeg';

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 1024,
      system: `You are a non-medical supplement and lifestyle coach for generally healthy adults.
You do NOT diagnose or treat diseases, and you always recommend talking to a healthcare professional before starting any new supplement protocol.

Goals:
Use the user's goals (fitness/performance, health/energy, or longevity), current supplement stack, and diet to suggest a simple, realistic supplement plan.
Prioritize safety, fundamentals, and cost-effectiveness over exotic or risky supplements.
Keep daily pill counts reasonable and respect the user's stated budget and preferences.

When you respond, you MUST:
Keep the answer in clear, simple language.
Avoid medical claims, diagnose/treat language, or specific medical advice.
Clearly label what is optional vs. foundational.
Emphasize that this is general educational information, not personalized medical advice.`,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: imageMediaType,
                data: image,
              },
            },
            {
              type: 'text',
              text: `Look at this supplement bottle and extract the following information. Return ONLY a JSON object with these exact keys (use null for anything you cannot determine):

{
  "name": "product name (e.g. Vitamin D3, Omega-3 Fish Oil)",
  "brand": "brand/manufacturer name",
  "supplement_type": "one of: vitamin, mineral, omega, protein, probiotic, herb, amino_acid, other",
  "servings_per_bottle": <integer or null>,
  "servings_per_day": <integer or null>,
  "amazon_link": "direct Amazon.com product URL if you can identify the exact product with high confidence, otherwise null"
}

For amazon_link: only provide a real URL if you are highly confident it matches this exact product (brand + name + size/count). If unsure, return null — a search URL will be generated automatically as a fallback.

Return only the JSON object, no other text.`,
            },
          ],
        },
      ],
    });

    const text = message.content[0].text.trim();

    // Strip markdown code fences if present
    const jsonStr = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    const parsed = JSON.parse(jsonStr);

    // Fall back to an Amazon search URL when Claude couldn't find a direct link
    if (!parsed.amazon_link) {
      const query = [parsed.brand, parsed.name].filter(Boolean).join(' ');
      if (query) {
        parsed.amazon_link = `https://www.amazon.com/s?k=${encodeURIComponent(query)}`;
      }
    }

    res.json(parsed);
  } catch (err) {
    console.error('Scan error:', err?.status, err?.message, err?.error);
    if (err instanceof SyntaxError) {
      return res.status(422).json({ error: 'Could not parse AI response as JSON' });
    }
    res.status(500).json({ error: err?.message || 'Server error during scan' });
  }
});

module.exports = router;

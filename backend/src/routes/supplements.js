const express = require('express');
const pool = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /supplements — list all supplements with computed days_remaining
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        *,
        CASE
          WHEN servings_per_day > 0
          THEN ROUND(remaining_servings / servings_per_day)
          ELSE NULL
        END AS days_remaining
      FROM supplements
      WHERE user_id = $1
      ORDER BY created_at DESC`,
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /supplements — add a new supplement
router.post('/', async (req, res) => {
  const { name, brand, supplement_type, servings_per_bottle, amazon_link, low_stock_threshold } = req.body;
  const servings_per_day = req.body.servings_per_day || 1;

  if (!name || !servings_per_bottle) {
    return res.status(400).json({ error: 'name and servings_per_bottle are required' });
  }

  const remaining_servings = servings_per_bottle;

  try {
    const result = await pool.query(
      `INSERT INTO supplements
        (user_id, name, brand, supplement_type, servings_per_bottle, servings_per_day, remaining_servings, amazon_link, low_stock_threshold)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [req.user.userId, name, brand, supplement_type, servings_per_bottle, servings_per_day, remaining_servings, amazon_link, low_stock_threshold ?? 7]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /supplements/:id — update a supplement
router.put('/:id', async (req, res) => {
  const { name, brand, supplement_type, servings_per_bottle, servings_per_day, remaining_servings, amazon_link, low_stock_threshold } = req.body;

  try {
    const result = await pool.query(
      `UPDATE supplements
       SET name                = COALESCE($1, name),
           brand               = COALESCE($2, brand),
           supplement_type     = COALESCE($3, supplement_type),
           servings_per_bottle = COALESCE($4, servings_per_bottle),
           servings_per_day    = COALESCE($5, servings_per_day),
           remaining_servings  = COALESCE($6, remaining_servings),
           amazon_link         = COALESCE($7, amazon_link),
           low_stock_threshold = COALESCE($8, low_stock_threshold)
       WHERE id = $9 AND user_id = $10
       RETURNING *`,
      [name, brand, supplement_type, servings_per_bottle, servings_per_day, remaining_servings, amazon_link, low_stock_threshold, req.params.id, req.user.userId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Supplement not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /supplements/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM supplements WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.userId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Supplement not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

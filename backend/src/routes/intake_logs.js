const express = require('express');
const pool = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /intake_logs?supplement_id=X — list logs, optionally filtered by supplement
router.get('/', async (req, res) => {
  const { supplement_id } = req.query;

  try {
    let query = `SELECT il.* FROM intake_logs il
                 JOIN supplements s ON s.id = il.supplement_id
                 WHERE il.user_id = $1`;
    const params = [req.user.userId];

    if (supplement_id) {
      query += ` AND il.supplement_id = $2`;
      params.push(supplement_id);
    }

    query += ` ORDER BY il.taken_at DESC`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /intake_logs — log a supplement intake
router.post('/', async (req, res) => {
  const { supplement_id, servings_taken, taken_at } = req.body;
  if (!supplement_id) {
    return res.status(400).json({ error: 'supplement_id is required' });
  }

  try {
    // Verify the supplement belongs to this user
    const suppCheck = await pool.query(
      'SELECT id FROM supplements WHERE id = $1 AND user_id = $2',
      [supplement_id, req.user.userId]
    );
    if (!suppCheck.rows[0]) return res.status(404).json({ error: 'Supplement not found' });

    const result = await pool.query(
      `INSERT INTO intake_logs (user_id, supplement_id, servings_taken, taken_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.user.userId, supplement_id, servings_taken ?? 1, taken_at ?? new Date()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /intake_logs/:id — remove a log entry
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM intake_logs WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.userId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Log entry not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

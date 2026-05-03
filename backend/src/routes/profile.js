const express = require('express');
const pool = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /profile
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT profile FROM users WHERE id = $1', [req.user.userId]);
    res.json(result.rows[0]?.profile || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /profile
router.put('/', async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE users SET profile = $1 WHERE id = $2 RETURNING profile',
      [req.body, req.user.userId]
    );
    res.json(result.rows[0].profile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

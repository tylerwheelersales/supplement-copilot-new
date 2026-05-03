const express = require('express');
const app = express();

app.use(express.json({ limit: '20mb' }));

app.use('/auth', require('./src/routes/auth'));
app.use('/supplements', require('./src/routes/supplements'));
app.use('/intake_logs', require('./src/routes/intake_logs'));
app.use('/scan', require('./src/routes/scan'));
app.use('/profile', require('./src/routes/profile'));
app.use('/recommend', require('./src/routes/recommend'));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

module.exports = app;

require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const API_KEY = process.env.DEEPSEEK_API_KEY;
const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// 状态检查
app.get('/api/status', (req, res) => {
  res.json({
    ok: true,
    hasKey: !!API_KEY && API_KEY.length > 5,
    model: MODEL
  });
});

// DeepSeek 代理
app.post('/api/recommend', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Missing prompt' });
  }

  if (!API_KEY || API_KEY.length < 10) {
    return res.status(503).json({ error: 'NO_KEY' });
  }

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1200,
        temperature: 0.85
      })
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      console.error('DeepSeek error:', response.status, errBody);
      return res.status(response.status).json({
        error: errBody?.error?.message || `HTTP ${response.status}`
      });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    res.json({ result: text });

  } catch (err) {
    console.error('Server error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`API Key: ${API_KEY ? '✓ 已配置' : '✗ 未配置（将使用内置推荐）'}`);
});

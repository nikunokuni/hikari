export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, texts } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Gemini API key is not configured in Vercel.' });
  }

  // Google I/O発表の軽量・高速最新モデル
  const model = 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  let prompt = '';
  if (action === 'question') {
    prompt = `ジャーナリングアプリ「ひかり」のユーザーに今日の問いかけをひとつ生成してください。ルール：
①句点で終わる（？をつけない）
②答えを迫らない、圧がない
③15〜25文字程度
④問いかけの文のみ返す（説明や余計な文字は一切不要）。
例：「今日、体はどんな感じですか。」`;
  } else if (action === 'analyze') {
    if (!texts) {
      return res.status(400).json({ error: 'Missing texts for analysis' });
    }
    prompt = `以下はユーザーがジャーナリングアプリに書いた記録です。繰り返し出てくる言葉やテーマ、感情のパターンを、やさしく、押しつけがましくなく、1〜2文で短い気づきとして伝えてください。分析という冷たい雰囲気ではなく、そっと置くようなあたたかい文体でお願いします。\n\n${texts}`;
  } else {
    return res.status(400).json({ error: 'Invalid action' });
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 200, temperature: 0.7 }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(500).json({ error: 'Gemini API error', details: errorData });
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    return res.status(200).json({ result: reply });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
}
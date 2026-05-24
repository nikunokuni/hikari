import { sql } from '@vercel/postgres';

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

  try {
    // データベーステーブルがなければ自動構築
    await sql`
      CREATE TABLE IF NOT EXISTS user_states (
        user_id VARCHAR(255) PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // データの取得 (GET)
    if (req.method === 'GET') {
      const { userId } = req.query;
      if (!userId) {
        return res.status(400).json({ error: 'Missing userId' });
      }
      const { rows } = await sql`
        SELECT data FROM user_states WHERE user_id = ${userId};
      `;
      if (rows.length === 0) {
        return res.status(200).json({ data: null });
      }
      return res.status(200).json({ data: rows[0].data });
    }

    // データの保存/同期 (POST)
    if (req.method === 'POST') {
      const { userId, data } = req.body;
      if (!userId || !data) {
        return res.status(400).json({ error: 'Missing userId or data' });
      }

      await sql`
        INSERT INTO user_states (user_id, data, updated_at)
        VALUES (${userId}, ${JSON.stringify(data)}, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id)
        DO UPDATE SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP;
      `;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Database error', details: error.message });
  }
}
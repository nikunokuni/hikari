import { sql } from '@vercel/postgres';

// 直近24時間以内に同期のあった利用者数を、そっと数えて返すだけのエンドポイント
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS user_states (
        user_id VARCHAR(255) PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const { rows } = await sql`
      SELECT COUNT(*)::int AS count
      FROM user_states
      WHERE updated_at > NOW() - INTERVAL '24 hours';
    `;
    const count = rows[0]?.count ?? 0;
    return res.status(200).json({ count });
  } catch (error) {
    console.error('[active-users] 人数の取得に失敗しました:', error);
    return res.status(500).json({ error: 'Database error', details: error.message });
  }
}

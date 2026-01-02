import { createClient } from '@vercel/kv';

const kv = createClient({
  url: process.env.KINNST_KV_REST_API_URL,
  token: process.env.KINNST_KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  // One-time fix: rename Manual -> Weitere
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ') || authHeader.substring(7) !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const eventIds = await kv.smembers('radar:events');
  let updated = 0;

  for (const id of eventIds) {
    const event = await kv.hgetall(`radar:event:${id}`);
    if (event && event.source === 'Manual') {
      await kv.hset(`radar:event:${id}`, { source: 'Weitere' });
      updated++;
    }
  }

  return res.status(200).json({ updated, message: `${updated} events updated from Manual to Weitere` });
}

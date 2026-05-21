const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

function empty(status = 204) {
  return new Response(null, { status, headers: CORS });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    if (request.method === 'OPTIONS') return empty(204);

    // GET /templates — return all templates sorted by savedAt desc
    if (request.method === 'GET' && pathname === '/templates') {
      const list = await env.CARNAUBA_TEMPLATES.list();
      const templates = await Promise.all(
        list.keys.map(async ({ name }) => {
          const value = await env.CARNAUBA_TEMPLATES.get(name);
          return value ? JSON.parse(value) : null;
        })
      );
      const sorted = templates
        .filter(Boolean)
        .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
      return json(sorted);
    }

    // POST /templates — upsert a template (body: {id, name, savedAt, grupos})
    if (request.method === 'POST' && pathname === '/templates') {
      let body;
      try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
      if (!body?.id || !body?.name) return json({ error: 'id and name required' }, 400);
      await env.CARNAUBA_TEMPLATES.put(body.id, JSON.stringify(body));
      return json(body, 201);
    }

    // DELETE /templates/:id
    const deleteMatch = pathname.match(/^\/templates\/(.+)$/);
    if (request.method === 'DELETE' && deleteMatch) {
      const id = decodeURIComponent(deleteMatch[1]);
      await env.CARNAUBA_TEMPLATES.delete(id);
      return empty(204);
    }

    return json({ error: 'Not found' }, 404);
  },
};

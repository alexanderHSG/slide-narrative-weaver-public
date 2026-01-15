import { openNeo4jForRequest, cors } from './dbRouter.js';

export function withNeo4j(handler) {
  return async (event, context) => {
    context.callbackWaitsForEmptyEventLoop = false;
    if (event.httpMethod === 'OPTIONS') return cors(204);

    let session, databaseName, role, requestId, overrideUsed;
    try {
      const opened = await openNeo4jForRequest(event);
      if (opened.error) {
        const { statusCode, headers, body } = opened.error;
        return { statusCode, headers: { ...cors(200).headers, ...(headers || {}) }, body: JSON.stringify(body || {}) };
      }

      ({ session, databaseName, role, requestId, overrideUsed } = opened);

      const { statusCode = 200, headers = {}, body } =
        (await handler({ event, context, session, databaseName, role })) || {};

      return {
        statusCode,
        headers: { 
          ...headers, 
          ...cors(200).headers, 
          'X-Resolved-Database': databaseName, 
          'X-Override-Used': overrideUsed, 
          'X-Req-Id': requestId,
        },
        body: typeof body === 'string' ? body : JSON.stringify(body ?? {}),
      };
    } catch (e) {
      console.error('[withNeo4j] error:', e);
      return cors(500, { error: e.message });
    } finally {
      try { if (session) await session.close(); } catch {}
    }
  };
}


export default async function loadFromNeo4j(
  description,
  limit = 3,
  guidancePrompt = '',
  searchType = 'all'
) {
  const res = await fetch('/.netlify/functions/loadFromNeo4j', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description, limit, guidancePrompt, searchType })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`loadFromNeo4j failed: ${err.error||res.status}`);
  }

  const slides = await res.json();
  return slides;
}
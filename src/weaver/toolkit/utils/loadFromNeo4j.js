export default async function findSlidesByKeywords(
  text,
  limit = 3,
  refinementPrompt = '',
  searchType = 'all'
) {
  const res = await fetch('/.netlify/functions/findSlidesByKeywords', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      limit,
      refinementPrompt,
      searchType
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`findSlidesByKeywords failed: ${err.error||res.status}`);
  }

  return await res.json();
}

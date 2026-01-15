export async function enhanceDescription(description, refinementPrompt) {
  const res = await fetch('/.netlify/functions/enhance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ description, refinementPrompt })
  });

  const payload = await res.json()
  if (!res.ok) {
    throw new Error(payload.error || 'Enhancement failed')
  }
  return payload.enhanced
}
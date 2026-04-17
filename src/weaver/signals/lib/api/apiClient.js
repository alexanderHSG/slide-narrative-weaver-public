import { supabase } from "../auth/supabaseClient"
const BASE_URL = '/.netlify/functions';

export async function callShortTitle(description) {
  const res = await fetch(`${BASE_URL}/shortTitle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ description })
  })

  const { title, error } = await res.json()
  if (!res.ok) throw new Error(error || 'Title generation failed')
  return title
}

export async function callGenerateSlides({
  title,
  slideCount,
  refinementPrompt,
  outcome
}) {
  const res = await fetch(`${BASE_URL}/generateSlides`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ title, slideCount, refinementPrompt, outcome })
  })
  const payload = await res.json()
  if (!res.ok) throw new Error(payload.error || 'Slide generation failed')
  return payload 
}

export async function callEmbeddings(input, model = 'text-embedding-3-large') {
  const res = await fetch(`${BASE_URL}/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ input, model })
  })

  const payload = await res.json()
  if (!res.ok) throw new Error(payload.error || 'Embedding failed')
  return payload
}

export async function callEvaluateSlides(storyPointDescription, slides) {
  const res = await fetch(`${BASE_URL}/evaluateSlides`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ storyPointDescription, slides })
  })
  const payload = await res.json()
  if (!res.ok) throw new Error(payload.error || 'Evaluation failed')
  return payload.result
}

export async function callFetchSimilarSlides(
  embedding, 
  limit = 5,
  { searchType = 'all', canvasIds = [] } = {},
) {
  const res = await fetch(`${BASE_URL}/fetchSimilarSlides`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ embedding, limit, searchType, canvasIds })
  })
  const { slides, error } = await res.json()
  if (!res.ok) throw new Error(error || 'FetchSimilarSlides failed')
  return slides
}

export async function callSetupNeo4jSchema() {
  const res = await fetch(`${BASE_URL}/setupNeo4jSchema`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin'
  })
  const payload = await res.json()
  if (!res.ok) throw new Error(payload.error || 'Schema setup failed')
  return payload
}

export async function callGetSlideDeckInfo(objectIds) {
  const res = await fetch(`${BASE_URL}/getSlideDeckInfo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ objectIds })
  })
  const payload = await res.json()
  if (!res.ok) throw new Error(payload.error || 'getSlideDeckInfo failed')
  return payload.info
}

export async function callAddEdge(fromId, toId) {
  const res = await fetch(`${BASE_URL}/addEdge`, {
    method: 'POST',
    headers:{ 'Content-Type':'application/json' },
    credentials:'same-origin',
    body: JSON.stringify({ fromId, toId })
  })
  const { success, error } = await res.json()
  if (!res.ok) throw new Error(error||'AddEdge failed')
  return success
}

export async function callDeleteNode(nodeId, group) {
  const res = await fetch(`${BASE_URL}/deleteNode`, {
    method:'POST',
    headers:{ 'Content-Type':'application/json' },
    credentials:'same-origin',
    body: JSON.stringify({ nodeId, group })
  })
  const { success, error } = await res.json()
  if (!res.ok) throw new Error(error||'DeleteNode failed')
  return success
}

export async function callDeleteSlides(slideIds) {
  const res = await fetch(`${BASE_URL}/deleteSlides`, {
    method:'POST',
    headers:{ 'Content-Type':'application/json' },
    credentials:'same-origin',
    body: JSON.stringify({ slideIds })
  })
  const { success, error } = await res.json()
  if (!res.ok) throw new Error(error||'DeleteSlides failed')
  return success
}



export async function callSaveStoryPoint({ storyPointId, description, shortTitle, slideCount, slides }) {
  const res = await fetch(`${BASE_URL}/saveStoryPoint`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ storyPointId, description, shortTitle, slideCount, slides })
  })
  const payload = await res.json()
  if (!res.ok) throw new Error(payload.error || 'Save failed')
  return payload
}

export async function callRegenerateStoryPoint({ storyPointId, refinementPrompt, slideCount }) {
  const res = await fetch(`${BASE_URL}/regenerateStoryPoint`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ storyPointId, refinementPrompt, slideCount })
  })
  const payload = await res.json()
  if (!res.ok) throw new Error(payload.error || 'Regeneration failed')
  return payload 
}

export async function callMarkSlidesOnCanvas(slideIds) {
  const res = await fetch(`${BASE_URL}/markSlidesOnCanvas`, {
    method:'POST',
    headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify({ slideIds })
  })
  const { success, error } = await res.json()
  if (!res.ok) throw new Error(error||'markSlidesOnCanvas failed')
  return success
}

export async function callFindSlideReference(slideId) {
  const res = await fetch(`${BASE_URL}/findSlideReference?slideId=${encodeURIComponent(slideId)}`)
  const { exists, error } = await res.json()
  if (!res.ok) throw new Error(error||'findSlideReference failed')
  return exists
}

export async function callFindStoryPointReference(storyPointId) {
  const res = await fetch(`${BASE_URL}/findStoryPointReference?storyPointId=${encodeURIComponent(storyPointId)}`)
  const { exists, error } = await res.json()
  if (!res.ok) throw new Error(error||'findStoryPointReference failed')
  return exists
}

export async function callSearchByKeywords(
  query,
  limit = 10,
  { searchType = 'all', canvasIds = [] } = {}
) {
  const res = await fetch(`/.netlify/functions/findSlidesByKeywords`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, limit, searchType, canvasIds })
  });
  const { slides, error } = await res.json();
  if (!res.ok) throw new Error(error || 'Keyword search failed');
  return slides;
}

export async function callSendMagicLink(email) {
  const res = await fetch(`${BASE_URL}/send-magic-link`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  })
  const { success, error } = await res.json()
  if (!res.ok || !success) throw new Error(error || 'Magic link failed')
  return true
}

export async function callVerifySession() {
  const res = await fetch(`${BASE_URL}/verify-session`, {
    method: 'GET',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' }
  });
  const payload = await res.json();
  if (!res.ok) throw new Error(payload.error || 'Session verification failed');
  return payload.user;
}

export async function callLogout() {
  const res = await fetch(`${BASE_URL}/logout`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' }
  })
  const { success, error } = await res.json()
  if (!res.ok || !success) throw new Error(error || 'Logout failed')
}

export async function callGetImageBase64(url) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    throw new Error('No Supabase session available');
  }

  const encoded = encodeURIComponent(url);
  const res = await fetch(`${BASE_URL}/getImageBase64?url=${encoded}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization:   `Bearer ${token}`,
    }
  });

  const payload = await res.json();
  if (!res.ok) {
    console.error('[apiClient] getImageBase64 failed:', payload.error);
    throw new Error(payload.error || `getImageBase64 failed: ${res.status}`);
  }

  return payload.dataUrl;
}



export async function callC1Decks() {
  const url = `${BASE_URL}/c1-decks`;
  const res = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json' }
  });

  const text = await res.text();

  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch (e) {
    throw new Error('Invalid JSON from /c1-decks');
  }

  if (!res.ok) {
    const msg = payload?.error || payload?.message || `c1-decks failed (${res.status})`;
    throw new Error(msg);
  }

  return payload;
}

export async function callC1DeckSlides(deckId) {
  if (!deckId) throw new Error('deckId is required');

  const url = `${BASE_URL}/c1-deck-slides?id=${encodeURIComponent(deckId)}`;
  const res = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json' }
  });

  const text = await res.text();

  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch (e) {
    throw new Error('Invalid JSON from /c1-deck-slides');
  }

  if (!res.ok) {
    const msg = payload?.error || payload?.message || `c1-deck-slides failed (${res.status})`;
    throw new Error(msg);
  }

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.slides)) return payload.slides;
  return [];
}

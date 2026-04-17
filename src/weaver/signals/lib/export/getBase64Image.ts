export const getBase64Image = async (url) => {
  const encodedUrl = encodeURIComponent(url);
  const functionUrl = `/.netlify/functions/getImageBase64?url=${encodedUrl}`;

  const response = await fetch(functionUrl);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[DEBUG] Netlify function error response:', errorText);
    throw new Error(`Netlify function error: ${response.statusText}`);
  }

  const data = await response.json();

  return data.dataUrl;
};
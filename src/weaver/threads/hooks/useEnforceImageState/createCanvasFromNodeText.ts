const CANVAS_WIDTH = 500;
const CANVAS_HEIGHT = 300;

export const createCanvasFromNodeText = (text: string): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000000';
  ctx.font = '16px Arial';

  const words = text.split(' ');
  let line = '';
  let y = 30;

  for (const word of words) {
    const testLine = line + word + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > canvas.width - 20) {
      ctx.fillText(line, 10, y);
      line = word + ' ';
      y += 25;
      if (y > canvas.height - 20) break;
    } else {
      line = testLine;
    }
  }

  ctx.fillText(line, 10, y);
  return canvas;
};
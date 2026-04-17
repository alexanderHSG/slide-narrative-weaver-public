export const scoreToColor = (score) => {

  if (score <= 5) {
    const ratio = score / 5;
    const g = Math.round(59 + (214 - 59) * ratio);
    const b = Math.round(48 + (0 - 48) * ratio);
    return `rgb(255,${g},${b})`;
  } else {
    const ratio = (score - 5) / 5;
    const r = Math.round(255 + (33 - 255) * ratio);
    const g = Math.round(214 + (208 - 214) * ratio);
    const b = Math.round(0 + (122 - 0) * ratio);
    return `rgb(${r},${g},${b})`;
  }
};

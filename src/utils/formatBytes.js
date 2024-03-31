export default function formatBytes(bytes, decimals = 2) {
  if (!+bytes) return NaN;

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / k ** i).toFixed(dm))}`;
}

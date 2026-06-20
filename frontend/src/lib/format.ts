export function money(n: number | string | null | undefined) {
  const num = Number(n ?? 0);
  return num.toLocaleString('en-PK', { maximumFractionDigits: 2 });
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function formatDate(dateStr?: string | null) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function triggerBlobDownload(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

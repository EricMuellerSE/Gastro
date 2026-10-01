export const eur = (n: number, maxStellen = 2) =>
  n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: maxStellen });
export const zahl = (n: number) => n.toLocaleString('de-DE', { maximumFractionDigits: 2 });
export const uhr = (d: Date) => d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
export const datum = (d: Date) => d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
export const heuteStr = () => new Date().toLocaleDateString('sv-SE');

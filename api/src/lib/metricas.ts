/** Data de hoje (AAAA-MM-DD) no fuso da operação, para agrupar as contagens por dia. */
export function hoje() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bahia',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** Data de N dias atrás, no mesmo formato. */
export function diasAtras(dias: number) {
  const d = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bahia',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

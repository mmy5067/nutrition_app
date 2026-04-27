export function parseDateRange(dateString: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
  if (!match) {
    throw new Error("invalid date");
  }

  const [, year, month, day] = match;
  const start = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0));
  const end = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 23, 59, 59, 999));

  return {
    start: start.toISOString(),
    end: end.toISOString()
  };
}

export function toNumberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

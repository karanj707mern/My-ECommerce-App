const rupeeFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const mediumDateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
});

const mediumDateTimeFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatRupees(
  amount: number | string | null | undefined,
): string {
  const numeric = typeof amount === "number" ? amount : Number(amount);
  return rupeeFormatter.format(Number.isFinite(numeric) ? numeric : 0);
}

function toDate(value: string | number | Date | null | undefined): Date {
  const date = value instanceof Date ? value : new Date(value ?? Date.now());
  if (Number.isNaN(date.getTime())) {
    return new Date(0);
  }
  return date;
}

export function formatMediumDate(
  value: string | number | Date | null | undefined,
): string {
  return mediumDateFormatter.format(toDate(value));
}

export function formatMediumDateTime(
  value: string | number | Date | null | undefined,
): string {
  return mediumDateTimeFormatter.format(toDate(value));
}

export function normalizePrice(
  value: number | string | null | undefined,
): number {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

export function renderStars(rating: number): string {
  return Array.from({ length: 5 }, (_, index) =>
    index < rating ? "★" : "☆",
  ).join("");
}

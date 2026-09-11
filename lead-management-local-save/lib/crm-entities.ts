export function normalizePhoneNumber(phone?: string | null): string {
  const normalized = (phone ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^\d+]/g, "");

  if (!normalized) return "";

  if (normalized.startsWith("+91") && normalized.length > 3) return `+${normalized.slice(1)}`;
  if (normalized.startsWith("91") && normalized.length > 2) return `+${normalized}`;
  if (normalized.startsWith("+")) return normalized;

  return normalized;
}

export function buildContactKey(email?: string | null, phone?: string | null): string {
  const normalizedEmail = (email ?? "").trim().toLowerCase();
  const normalizedPhone = normalizePhoneNumber(phone);

  return `${normalizedEmail}|${normalizedPhone}`;
}

export function normalizeContactInput(input: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  city?: string | null;
  country?: string | null;
}) {
  const firstName = (input.firstName ?? "").trim();
  const lastName = (input.lastName ?? "").trim();
  const email = (input.email ?? "").trim().toLowerCase();
  const phone = normalizePhoneNumber(input.phone);
  const normalizedFirstName = firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase() : "";
  const normalizedLastName = lastName ? lastName.charAt(0).toUpperCase() + lastName.slice(1).toLowerCase() : "";
  const fullName = [normalizedFirstName, normalizedLastName].filter(Boolean).join(" ");

  return {
    firstName: normalizedFirstName,
    lastName: normalizedLastName,
    email,
    phone,
    company: (input.company ?? "").trim(),
    city: (input.city ?? "").trim(),
    country: (input.country ?? "").trim(),
    fullName,
    contactKey: buildContactKey(email, phone)
  };
}

export function normalizeOrganizationInput(input: {
  name?: string | null;
  industry?: string | null;
  website?: string | null;
  city?: string | null;
  country?: string | null;
}) {
  const website = (input.website ?? "").trim();

  return {
    name: (input.name ?? "").trim(),
    industry: (input.industry ?? "").trim().toUpperCase(),
    website: website ? website.replace(/\/$/, "") : "",
    city: (input.city ?? "").trim(),
    country: (input.country ?? "").trim()
  };
}

export function buildTimelineEntry(input: {
  title: string;
  activityType: string;
  description?: string | null;
  createdAt?: string | Date | null;
  metadata?: Record<string, unknown> | null;
}) {
  const created = input.createdAt ? new Date(input.createdAt) : new Date();

  return {
    title: input.title.trim(),
    activityType: (input.activityType ?? "general").toString().toUpperCase(),
    description: input.description?.trim() ?? "",
    createdAt: created.toISOString(),
    metadata: input.metadata ?? {}
  };
}

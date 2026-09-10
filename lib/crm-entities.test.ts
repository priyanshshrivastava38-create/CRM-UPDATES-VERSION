import { describe, expect, it } from "vitest";
import { buildContactKey, buildTimelineEntry, normalizeContactInput, normalizeOrganizationInput } from "./crm-entities";

describe("CRM entity helpers", () => {
  it("builds a stable contact fingerprint across email and phone variants", () => {
    expect(buildContactKey("  Jane.Doe@Example.com  ", "+91 98765 43210")).toBe("jane.doe@example.com|+919876543210");
  });

  it("normalizes organization metadata into a controlled CRM shape", () => {
    const org = normalizeOrganizationInput({
      name: "  Acme Labs Pvt Ltd  ",
      industry: "SAAS",
      website: "https://acme.example.com/",
      city: "Bengaluru",
      country: "India"
    });

    expect(org.name).toBe("Acme Labs Pvt Ltd");
    expect(org.industry).toBe("SAAS");
    expect(org.website).toBe("https://acme.example.com");
    expect(org.city).toBe("Bengaluru");
    expect(org.country).toBe("India");
  });

  it("normalizes contact identity and name fields for CRM records", () => {
    const contact = normalizeContactInput({
      firstName: "  jane  ",
      lastName: "  doe ",
      email: " JANE.DOE@EXAMPLE.COM ",
      phone: "+91 98765 43210",
      company: "  Acme Labs Pvt Ltd  ",
      city: "Bengaluru"
    });

    expect(contact.firstName).toBe("Jane");
    expect(contact.lastName).toBe("Doe");
    expect(contact.email).toBe("jane.doe@example.com");
    expect(contact.phone).toBe("+919876543210");
    expect(contact.fullName).toBe("Jane Doe");
    expect(contact.contactKey).toBe("jane.doe@example.com|+919876543210");
  });

  it("creates a canonical activity entry for the CRM timeline", () => {
    const entry = buildTimelineEntry({
      title: "Follow-up call",
      activityType: "call",
      description: "Discussed onboarding scope.",
      createdAt: "2025-01-14T09:15:00Z",
      metadata: { duration: 18, direction: "OUTBOUND" }
    });

    expect(entry.activityType).toBe("CALL");
    expect(entry.title).toBe("Follow-up call");
    expect(entry.metadata).toMatchObject({ duration: 18, direction: "OUTBOUND" });
    expect(entry.createdAt).toBe("2025-01-14T09:15:00.000Z");
  });
});

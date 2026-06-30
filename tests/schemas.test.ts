import { describe, it, expect } from "vitest";
import { ApplicableLawSchema, IncidentAnalysisSchema } from "@/lib/ai/schemas";

const validLaw = {
  act: "Bharatiya Nyaya Sanhita, 2023",
  section: "303",
  reason: "Theft of property.",
  maxPunishment: "Up to 3 years.",
  bailable: "Non-bailable",
  cognizable: "Cognizable",
  compoundable: "Yes (without court permission)",
  provenance: "Retrieved source",
  applicability: "direct",
};

describe("ApplicableLawSchema", () => {
  it("accepts a well-formed law", () => {
    expect(ApplicableLawSchema.safeParse(validLaw).success).toBe(true);
  });
  it("rejects an invalid provenance enum", () => {
    expect(ApplicableLawSchema.safeParse({ ...validLaw, provenance: "made it up" }).success).toBe(false);
  });
  it("rejects an invalid applicability enum", () => {
    expect(ApplicableLawSchema.safeParse({ ...validLaw, applicability: "maybe" }).success).toBe(false);
  });
  it("rejects a missing required field", () => {
    const { section: _omit, ...noSection } = validLaw;
    void _omit;
    expect(ApplicableLawSchema.safeParse(noSection).success).toBe(false);
  });
});

describe("IncidentAnalysisSchema", () => {
  it("accepts a minimal valid analysis", () => {
    const ok = IncidentAnalysisSchema.safeParse({
      summary: "x",
      language: "en",
      entities: [],
      people: [],
      timeline: [],
      evidenceMentioned: [],
      crimeTypes: [],
      legalIssues: [],
      rightsViolated: [],
      retrievalQueries: ["unpaid wages"],
    });
    expect(ok.success).toBe(true);
  });
  it("rejects when retrievalQueries is not an array", () => {
    expect(IncidentAnalysisSchema.safeParse({ summary: "x", retrievalQueries: "nope" }).success).toBe(false);
  });
});

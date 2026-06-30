import { describe, it, expect } from "vitest";
import {
  normCognizable,
  normBailable,
  extractCompoundingSectionNumbers,
} from "@/lib/legal/classify";

describe("normCognizable", () => {
  it("parses the basic forms", () => {
    expect(normCognizable("Cognizable.")).toBe("Cognizable");
    expect(normCognizable("Non-cognizable.")).toBe("Non-cognizable");
  });
  it("repairs pdf/word splits", () => {
    expect(normCognizable("Non - cogni zable.")).toBe("Non-cognizable");
    expect(normCognizable("Cogniza ble.")).toBe("Cognizable");
  });
  it("maps conditional phrasing to Varies", () => {
    expect(normCognizable("According as offence abetted is cognizable or non-cognizable.")).toBe(
      "Varies (per underlying offence)",
    );
  });
  it("returns null when no cognizable token", () => {
    expect(normCognizable("Any Magistrate.")).toBeNull();
  });
});

describe("normBailable", () => {
  it("parses basic + split + conditional", () => {
    expect(normBailable("Bailable.")).toBe("Bailable");
    expect(normBailable("Non- bailable.")).toBe("Non-bailable");
    expect(normBailable("According as offence abetted is bailable or non-bailable.")).toBe(
      "Varies (per underlying offence)",
    );
    expect(normBailable("Court of Session.")).toBeNull();
  });
});

describe("extractCompoundingSectionNumbers", () => {
  it("extracts base section numbers including comma lists + sub-sections", () => {
    const set = extractCompoundingSectionNumbers("Theft. 303(2)  Assault. 131,133,136  Hurt. 115(2)");
    expect(set.has("303")).toBe(true);
    expect(set.has("131")).toBe(true);
    expect(set.has("133")).toBe(true);
    expect(set.has("136")).toBe(true);
    expect(set.has("115")).toBe(true);
  });
  it("strips table noise ('(45 of 2023)', '1 23' header, year)", () => {
    const set = extractCompoundingSectionNumbers(
      "Bharatiya Nyaya Sanhita, 2023 (45 of 2023) 1 23 Theft. 303(2)",
    );
    expect(set.has("45")).toBe(false);
    expect(set.has("23")).toBe(false);
    expect(set.has("303")).toBe(true);
  });
  it("ignores out-of-range numbers", () => {
    const set = extractCompoundingSectionNumbers("foo 999 bar 0 baz 314");
    expect(set.has("999")).toBe(false);
    expect(set.has("0")).toBe(false);
    expect(set.has("314")).toBe(true);
  });
});

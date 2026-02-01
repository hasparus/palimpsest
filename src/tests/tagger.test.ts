import { describe, test, expect } from "bun:test";
import { generateTags } from "../tagger.js";

describe("tagger", () => {
  test("includes source as tag", () => {
    const tags = generateTags("chatgpt", new Date("2025-03-15"));
    expect(tags).toContain("chatgpt");
  });

  test("includes year as tag", () => {
    const tags = generateTags("test", new Date("2025-03-15"));
    expect(tags).toContain("2025");
  });

  test("includes quarter as tag", () => {
    const tags = generateTags("test", new Date("2025-01-15"));
    expect(tags).toContain("Q1");

    const tagsQ2 = generateTags("test", new Date("2025-04-15"));
    expect(tagsQ2).toContain("Q2");

    const tagsQ3 = generateTags("test", new Date("2025-07-15"));
    expect(tagsQ3).toContain("Q3");

    const tagsQ4 = generateTags("test", new Date("2025-10-15"));
    expect(tagsQ4).toContain("Q4");
  });

  test("extracts model family for gpt-4o", () => {
    const tags = generateTags("test", new Date(), "gpt-4o-2024-01-01");
    expect(tags).toContain("gpt-4o");
  });

  test("extracts model family for gpt-4", () => {
    const tags = generateTags("test", new Date(), "gpt-4-turbo");
    expect(tags).toContain("gpt-4");
  });

  test("extracts model family for claude-3.5", () => {
    const tags = generateTags("test", new Date(), "claude-3.5-sonnet");
    expect(tags).toContain("claude-3.5");
  });

  test("extracts model family for o-series", () => {
    const tags = generateTags("test", new Date(), "o1-preview");
    expect(tags).toContain("o-series");
  });

  test("extracts topic keywords from body", () => {
    const body = "I'm working on a TypeScript project with React components";
    const tags = generateTags("test", new Date(), undefined, body);
    expect(tags).toContain("typescript");
    expect(tags).toContain("react");
  });

  test("extracts debugging topic", () => {
    const body = "I have a bug in my code that needs fixing";
    const tags = generateTags("test", new Date(), undefined, body);
    expect(tags).toContain("debugging");
  });

  test("extracts git topic", () => {
    const body = "How do I rebase my branch and create a pull request?";
    const tags = generateTags("test", new Date(), undefined, body);
    expect(tags).toContain("git");
  });

  test("returns sorted tags", () => {
    const tags = generateTags("ztest", new Date("2025-01-01"), "gpt-4o", "typescript react");
    expect(tags).toEqual([...tags].sort());
  });

  test("handles invalid date gracefully", () => {
    const tags = generateTags("test", new Date("invalid"));
    expect(tags).toContain("test");
    expect(tags).toContain("NaN");
  });
});

import { describe, it, expect } from "vitest";
import { looksLikeSlug } from "./resolve-artist-name";

describe("looksLikeSlug", () => {
  it.each([
    ["maya-chen", true],
    ["mayachen", true],
    ["alex-2", true],
    ["a-b-c", true],
    ["3d-printer", true],
    ["Maya Chen", false],
    ["maya chen", false],
    ["maya--chen", false],
    ["", false],
    ["MAYA-CHEN", false],
    ["-leading", false],
    ["trailing-", false],
    ["with.dot", false],
    ["with_underscore", false],
  ])("%j → %s", (s, expected) => {
    expect(looksLikeSlug(s as string)).toBe(expected);
  });
});

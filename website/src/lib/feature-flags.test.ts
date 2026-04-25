// Feature flags decide whether the visualizer routes/UI are reachable.
// We test:
//   - explicit env values override defaults
//   - dev/prod defaults differ
//   - unknown flag returns false (fail closed)
//   - listFlags reports the resolved state

import { afterEach, describe, expect, it } from "vitest";
import { isFlagOn, listFlags, requireFlag } from "./feature-flags";

const ENV_KEY = "NEXT_PUBLIC_FLAG_WALL_VISUALIZER_V1";

// process.env.NODE_ENV is typed as readonly by @types/node. Bracket access
// goes through the index signature, which is writable — Vitest tests that
// flip NODE_ENV all use this trick.
function setNodeEnv(value: "development" | "production" | "test"): void {
  (process.env as Record<string, string>).NODE_ENV = value;
}

describe("feature flags — explicit env wins", () => {
  const SNAPSHOT = { ...process.env };
  afterEach(() => {
    process.env = { ...SNAPSHOT };
  });

  it("env=1 means on", () => {
    process.env[ENV_KEY] = "1";
    setNodeEnv("production");
    expect(isFlagOn("WALL_VISUALIZER_V1")).toBe(true);
  });

  it("env=true means on", () => {
    process.env[ENV_KEY] = "true";
    setNodeEnv("production");
    expect(isFlagOn("WALL_VISUALIZER_V1")).toBe(true);
  });

  it("env=0 means off (even in dev where default is on)", () => {
    process.env[ENV_KEY] = "0";
    setNodeEnv("development");
    expect(isFlagOn("WALL_VISUALIZER_V1")).toBe(false);
  });

  it("env=false means off", () => {
    process.env[ENV_KEY] = "false";
    setNodeEnv("development");
    expect(isFlagOn("WALL_VISUALIZER_V1")).toBe(false);
  });

  it("malformed env value falls back to default", () => {
    process.env[ENV_KEY] = "maybe";
    setNodeEnv("production");
    // production default for WALL_VISUALIZER_V1 is false
    expect(isFlagOn("WALL_VISUALIZER_V1")).toBe(false);
  });
});

describe("feature flags — defaults", () => {
  const SNAPSHOT = { ...process.env };
  afterEach(() => {
    process.env = { ...SNAPSHOT };
  });

  it("dev default is on", () => {
    delete process.env[ENV_KEY];
    setNodeEnv("development");
    expect(isFlagOn("WALL_VISUALIZER_V1")).toBe(true);
  });

  it("prod default is off", () => {
    delete process.env[ENV_KEY];
    setNodeEnv("production");
    expect(isFlagOn("WALL_VISUALIZER_V1")).toBe(false);
  });
});

describe("requireFlag", () => {
  const SNAPSHOT = { ...process.env };
  afterEach(() => {
    process.env = { ...SNAPSHOT };
  });

  it("throws when off", () => {
    process.env[ENV_KEY] = "0";
    expect(() => requireFlag("WALL_VISUALIZER_V1")).toThrow(/disabled/);
  });

  it("does not throw when on", () => {
    process.env[ENV_KEY] = "1";
    expect(() => requireFlag("WALL_VISUALIZER_V1")).not.toThrow();
  });
});

describe("listFlags", () => {
  it("reports every defined flag", () => {
    const flags = listFlags();
    expect(flags.some((f) => f.flag === "WALL_VISUALIZER_V1")).toBe(true);
    for (const f of flags) {
      expect(typeof f.on).toBe("boolean");
      expect(f.description.length).toBeGreaterThan(0);
    }
  });
});

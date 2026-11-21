import { describe, expect, it } from "vitest";
import { createAdminSessionCookie, verifyAdminCredentials, verifyAdminSession } from "./adminAuth";
import type { Env } from "../types";

const env = {
  ADMIN_USERNAME: "troy",
  ADMIN_PASSWORD: "correct horse",
  ADMIN_SESSION_SECRET: "test-secret",
} as Env;

describe("admin auth", () => {
  it("checks the password without accepting a blank username", async () => {
    expect(await verifyAdminCredentials(env, "troy", "correct horse")).toBe(true);
    expect(await verifyAdminCredentials(env, "troy", "wrong")).toBe(false);
    expect(await verifyAdminCredentials(env, "", "correct horse")).toBe(false);
  });

  it("accepts a fresh signed session and rejects a tampered one", async () => {
    const cookie = await createAdminSessionCookie(env, "troy");
    const header = cookie.split(";")[0] ?? "";
    const ok = new Request("https://sentientpartners.ai/admin", { headers: { cookie: header } });
    expect((await verifyAdminSession(ok, env))?.username).toBe("troy");

    const [name, value] = header.split("=");
    const decoded = decodeURIComponent(value ?? "");
    const flipped = `${decoded.slice(0, -1)}${decoded.endsWith("a") ? "b" : "a"}`;
    const tampered = `${name}=${encodeURIComponent(flipped)}`;
    const bad = new Request("https://sentientpartners.ai/admin", { headers: { cookie: tampered } });
    expect(await verifyAdminSession(bad, env)).toBeNull();
  });
});

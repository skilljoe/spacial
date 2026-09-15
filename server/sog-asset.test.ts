import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const assetPath = "/home/ubuntu/webdev-static-assets/livingroom.sog";

describe("living-room SOG asset", () => {
  it("is a bundled SOG archive with the required render streams", () => {
    expect(existsSync(assetPath)).toBe(true);
    const header = readFileSync(assetPath).subarray(0, 4).toString("hex");
    expect(header).toBe("504b0304");

    const entries = execFileSync("unzip", ["-Z1", assetPath], { encoding: "utf8" }).trim().split("\n");
    expect(entries).toEqual(expect.arrayContaining([
      "meta.json",
      "means_l.webp",
      "means_u.webp",
      "scales.webp",
      "quats.webp",
      "sh0.webp",
    ]));
  });
});

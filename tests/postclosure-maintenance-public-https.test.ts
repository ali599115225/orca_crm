import { describe, expect, it } from "vitest";

import { requirePublicProviderUrl } from "@/lib/net/public-https";

describe("post-closure public HTTPS provider boundary", () => {
  it.each([
    "http://8.8.8.8/provider",
    "https://localhost/provider",
    "https://127.0.0.1/provider",
    "https://10.1.2.3/provider",
    "https://169.254.1.2/provider",
    "https://172.16.0.1/provider",
    "https://192.168.1.10/provider",
    "https://100.64.0.1/provider",
    "https://[::1]/provider",
    "https://[fc00::1]/provider",
    "https://[fe80::1]/provider",
    "https://[::ffff:127.0.0.1]/provider",
    "https://[::ffff:7f00:1]/provider",
    "https://[ff02::1]/provider",
    "https://[ff00::1]/provider",
    "https://192.0.2.1/provider",
    "https://198.51.100.1/provider",
    "https://203.0.113.1/provider",
    "https://198.18.0.1/provider",
    "https://198.19.0.1/provider",
    "https://192.0.0.8/provider",
    "https://192.88.99.1/provider",
  ])("rejects a private or unsafe provider URL: %s", async (url) => {
    await expect(requirePublicProviderUrl(url)).rejects.toThrow();
  });

  it.each([
    "https://8.8.8.8/provider",
    "https://1.1.1.1/provider",
    "https://[2606:4700:4700::1111]/provider",
    "https://[::ffff:8.8.8.8]/provider",
    "https://[::ffff:808:808]/provider",
    "https://[::ffff:1.1.1.1]/provider",
    "https://[::ffff:101:101]/provider",
  ])("accepts a public HTTPS literal without DNS resolution: %s", async (url) => {
    await expect(requirePublicProviderUrl(url)).resolves.toBeInstanceOf(URL);
  });
});

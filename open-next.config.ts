// Minimal config so `opennextjs-cloudflare build` succeeds.
// No incremental cache / image optimization overrides yet — those need
// R2/other bindings this repo hasn't provisioned; add them when actually
// deploying, not just to get the build green.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig();

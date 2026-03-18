#!/usr/bin/env node
/**
 * KIE callback endpoint smoke test.
 * Verifies /api/kie/callback accepts KIE-style POST bodies and returns 200.
 * Run: BASE_URL=https://modelclone.app node scripts/smoke-test-kie-callback.mjs
 * Or:  node scripts/smoke-test-kie-callback.mjs http://localhost:5000
 */
import "dotenv/config";

const BASE_URL = process.env.BASE_URL || process.argv[2] || "http://localhost:5000";
const CALLBACK_URL = `${BASE_URL.replace(/\/$/, "")}/api/kie/callback`;

// User's test callback payload (kling-2.6/motion-control; resultJson is a JSON string)
const USER_CALLBACK_PAYLOAD = {
  code: 200,
  data: {
    completeTime: 1755599644000,
    costTime: 8,
    createTime: 1755599634000,
    model: "kling-2.6/motion-control",
    param:
      '{"callBackUrl":"https://your-domain.com/api/callback","model":"kling-2.6/motion-control","input":{"prompt":"The cartoon character is dancing.","input_urls":["https://static.aiquickdraw.com/tools/example/1767694885407_pObJoMcy.png"],"video_urls":["https://static.aiquickdraw.com/tools/example/1767525918769_QyvTNib2.mp4"],"character_orientation":"video","mode":"720p"}}',
    resultJson: '{"resultUrls":["https://example.com/generated-image.jpg"]}',
    state: "success",
    taskId: "e989621f54392584b05867f87b160672",
    failCode: null,
    failMsg: null,
  },
  msg: "Playground task completed successfully.",
};

// Reference success payload (KIE docs format; resultJson is a JSON string)
const SUCCESS_PAYLOAD = {
  code: 200,
  data: {
    taskId: "e989621f54392584b05867f87b160672",
    state: "success",
    resultJson: '{"resultUrls":["https://example.com/generated-image.jpg"]}',
    model: "kling-3.0/motion-control",
    completeTime: 1755599644000,
    createTime: 1755599634000,
    costTime: 8,
    failCode: null,
    failMsg: null,
    param: "{}",
  },
  msg: "Playground task completed successfully.",
};

// Failure payload
const FAILURE_PAYLOAD = {
  code: 501,
  data: {
    taskId: "bd3a37c5a1b2c3d4e5f6789012345678",
    state: "fail",
    resultJson: null,
    failCode: "500",
    failMsg: "Internal server error",
  },
  msg: "Playground task failed.",
};

async function postCallback(payload, label) {
  const res = await fetch(CALLBACK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000),
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = null;
  }
  return { ok: res.ok, status: res.status, body, text: text.slice(0, 200) };
}

async function run() {
  console.log("KIE callback smoke test");
  console.log("  Callback URL:", CALLBACK_URL);
  console.log("");

  let failed = 0;

  // 0. User's kling-2.6 motion-control callback payload (ensures backend accepts and parses it)
  console.log("0. POST user callback payload (kling-2.6/motion-control, resultUrls in resultJson)…");
  const userRes = await postCallback(USER_CALLBACK_PAYLOAD, "user");
  if (!userRes.ok || userRes.status !== 200) {
    console.error("   FAIL: expected 200, got", userRes.status, userRes.text);
    failed++;
  } else if (userRes.body && userRes.body.code === 200 && userRes.body.msg === "received") {
    console.log("   OK: 200, body:", JSON.stringify(userRes.body));
  } else {
    console.log("   OK: 200 (body:", userRes.body || userRes.text, ")");
  }

  // 1. Success callback
  console.log("\n1. POST success callback (code 200, state success, resultJson with resultUrls)…");
  const successRes = await postCallback(SUCCESS_PAYLOAD, "success");
  if (!successRes.ok || successRes.status !== 200) {
    console.error("   FAIL: expected 200, got", successRes.status, successRes.text);
    failed++;
  } else if (successRes.body && successRes.body.code === 200 && successRes.body.msg === "received") {
    console.log("   OK: 200, body:", JSON.stringify(successRes.body));
  } else {
    console.log("   OK: 200 (body:", successRes.body || successRes.text, ")");
  }

  // 2. Failure callback
  console.log("\n2. POST failure callback (code 501, state fail)…");
  const failRes = await postCallback(FAILURE_PAYLOAD, "failure");
  if (!failRes.ok || failRes.status !== 200) {
    console.error("   FAIL: callback must return 200 even for failure payload (so KIE does not retry), got", failRes.status, failRes.text);
    failed++;
  } else {
    console.log("   OK: 200");
  }

  // 3. OPTIONS preflight (200 or 204 are both valid for CORS preflight)
  console.log("\n3. OPTIONS preflight…");
  const optRes = await fetch(CALLBACK_URL, {
    method: "OPTIONS",
    signal: AbortSignal.timeout(5_000),
  });
  if (optRes.status !== 200 && optRes.status !== 204) {
    console.error("   FAIL: OPTIONS expected 200 or 204, got", optRes.status);
    failed++;
  } else {
    const allowOrigin = optRes.headers.get("Access-Control-Allow-Origin");
    console.log("   OK:", optRes.status, allowOrigin ? `(Allow-Origin: ${allowOrigin})` : "");
  }

  // 4. Invalid body (missing taskId) — should still 200 ack
  console.log("\n4. POST invalid body (no taskId) — must still return 200…");
  const invalidRes = await postCallback({ code: 200, data: {}, msg: "ok" }, "invalid");
  if (!invalidRes.ok || invalidRes.status !== 200) {
    console.error("   FAIL: must ack 200 for invalid body so KIE does not retry, got", invalidRes.status);
    failed++;
  } else {
    console.log("   OK: 200");
  }

  console.log("");
  if (failed > 0) {
    console.error("Smoke test failed:", failed, "check(s)");
    process.exit(1);
  }
  console.log("Smoke test passed: callback endpoint is ready to receive KIE callbacks.");
}

run().catch((err) => {
  console.error("Smoke test error:", err.message);
  process.exit(1);
});


import test from "node:test";
import assert from "node:assert/strict";

import handler from "../../netlify/functions/api.mjs";

test("Health endpoint returns operational status", async () => {
  const request = new Request(
    "http://localhost/api/health",
    { method: "GET" }
  );

  const response = await handler(request, {});

  assert.equal(response.status, 200);

  const result = await response.json();

  assert.equal(result.success, true);
  assert.equal(result.application, "STEM Academy");
  assert.equal(result.version, "1.1.0");
  assert.equal(result.status, "operational");
});

test("Unknown endpoint returns 404", async () => {
  const request = new Request(
    "http://localhost/api/unknown",
    { method: "GET" }
  );

  const response = await handler(request, {});

  assert.equal(response.status, 404);
});

test("Protected session endpoint rejects requests without a bearer token", async () => {
  const request = new Request(
    "http://localhost/api/me",
    { method: "GET" }
  );

  const response = await handler(request, {});

  assert.equal(response.status, 401);

  const result = await response.json();

  assert.equal(result.error.code, "UNAUTHENTICATED");
  assert.equal(result.error.message, "Authentication required.");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});

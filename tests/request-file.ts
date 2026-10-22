import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { makeZkTlsRequestParams, readRequestFile } from "../src/datasource/helper.js";

function withRequestFile(requests: unknown[], run: (file: string) => void): void {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "por-request-file-"));
  try {
    const file = path.join(dir, "requests.json");
    fs.writeFileSync(file, JSON.stringify(requests));
    run(file);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

for (const headers of [undefined, null]) {
  for (const filter of [undefined, ["Content-Type"]]) {
    test(`readRequestFile accepts ${headers === null ? "null" : "omitted"} headers ${filter ? "with" : "without"} a filter`, () => {
      withRequestFile([{ url: "https://example.com/assets", headers }], file => {
        const requests = readRequestFile(file, { headerIncludeFields: filter });
        assert.equal(requests.length, 1);
        assert.equal(requests[0].url, "https://example.com/assets");
        assert.equal(requests[0].headers, headers);
        assert.deepEqual(makeZkTlsRequestParams(requests).requests[0].header, {});
      });
    });
  }
}

test("readRequestFile preserves headers when no filter is requested", () => {
  const headers = { "content-type": "application/json", Cookie: "session=example" };
  withRequestFile([{ url: "https://example.com/assets", headers }], file => {
    assert.deepEqual(readRequestFile(file)[0].headers, headers);
  });
});

test("readRequestFile filters header names case-insensitively", () => {
  const headers = { "content-type": "application/json", Cookie: "session=example" };
  withRequestFile([{ url: "https://example.com/assets", headers }], file => {
    const requests = readRequestFile(file, { headerIncludeFields: ["Content-Type", "Accept"] });
    assert.deepEqual(requests[0].headers, { "Content-Type": "application/json" });
  });
});

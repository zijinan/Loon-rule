#!/usr/bin/env python3
import base64
import json
import re
import subprocess
import sys
from collections import Counter, defaultdict
from pathlib import Path
from urllib.parse import urlparse


WORKER_HOST = "tencent-video-bridge.zijinan20000.workers.dev"

TARGET_HOSTS = {
    "i.video.qq.com",
    "xs.gdt.qq.com",
    "isrpt-vn.gdt.qq.com",
    "isrpt-in.gdt.qq.com",
    "rpt.gdt.qq.com",
    "vr.gdt.qq.com",
    "v3.gdt.qq.com",
    "c.gdt.qq.com",
    "c3.gdt.qq.com",
    "nc.gdt.qq.com",
    "pgdt.gtimg.cn",
    "iacc.qq.com",
    "iacc.rec.qq.com",
    "sdkreport.e.qq.com",
    "review.gdtimg.com",
    "config.ab.qq.com",
    "tab.video.qq.com",
    "rdelivery.qq.com",
    "playproxy.video.qq.com",
    "appcfg.v.qq.com",
    "iwan.video.qq.com",
}


def parse_headers(path):
    headers = {}
    if not path.exists():
        return headers
    lines = path.read_text("utf-8", errors="replace").splitlines()
    for line in lines:
        if line.startswith(":"):
            parts = line.split(":", 2)
            if len(parts) >= 3:
                headers[":" + parts[1].lower()] = parts[2].strip()
        elif ":" in line:
            key, value = line.split(":", 1)
            headers[key.strip()] = value.strip()
    if ":path" not in headers and lines:
        match = re.match(r"(\w+)\s+(\S+)\s+HTTP/", lines[0])
        if match:
            headers[":method"], headers[":path"] = match.groups()
    return headers


def request_url(entry):
    headers = parse_headers(entry / "request_header_raw.txt")
    path = headers.get(":path", "")
    if path.startswith("http://") or path.startswith("https://"):
        return path
    return "{}://{}{}".format(headers.get(":scheme", "https"), headers.get(":authority") or headers.get("host", ""), path)


def request_payload(entry):
    url = request_url(entry)
    headers = parse_headers(entry / "request_header_raw.txt")
    body_path = entry / "request_body_raw"
    body = body_path.read_bytes() if body_path.exists() else b""
    return {
        "url": url,
        "method": headers.get(":method", "GET"),
        "headers": {k: v for k, v in headers.items() if not k.startswith(":")},
        "bodyBase64": base64.b64encode(body).decode("ascii")
    }


def worker_bridge_payload(entry):
    try:
        payload = json.loads((entry / "request_body_raw").read_text("utf-8", errors="replace"))
    except Exception:
        return None
    if not isinstance(payload, dict) or "url" not in payload:
        return None
    return payload


def main():
    if len(sys.argv) != 3:
        print("usage: verify_tencent_video_worker_capture.py <capture_dir> <worker_js>", file=sys.stderr)
        return 2

    capture_dir = Path(sys.argv[1])
    worker_js = Path(sys.argv[2])
    samples = []
    for entry in sorted(path for path in capture_dir.iterdir() if path.is_dir()):
        url = request_url(entry)
        host = urlparse(url).netloc
        if host == WORKER_HOST:
            payload = worker_bridge_payload(entry)
            if payload and urlparse(payload.get("url", "")).netloc in TARGET_HOSTS:
                samples.append({"id": entry.name, "payload": payload})
        elif host in TARGET_HOSTS:
            samples.append({"id": entry.name, "payload": request_payload(entry)})

    node_code = r"""
const fs = require('fs');
const vm = require('vm');
const workerPath = process.argv[1];
const inputPath = process.argv[2];
let code = fs.readFileSync(workerPath, 'utf8');
code = code.replace(/export default\s*\{/, 'globalThis.worker = {');
const context = {
  globalThis: {},
  console,
  URL,
  Headers,
  Request,
  Response,
  TextEncoder,
  TextDecoder,
  Uint8Array,
  ArrayBuffer,
  btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
  atob: (s) => Buffer.from(s, 'base64').toString('binary'),
  fetch: async () => new Response('', { status: 599 })
};
context.globalThis = context;
vm.createContext(context);
vm.runInContext(code, context);
const samples = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
(async () => {
  const out = [];
  for (const sample of samples) {
    const req = new Request('https://worker.test/proxy', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify(sample.payload)
    });
    const resp = await context.worker.fetch(req);
    const data = await resp.json();
    out.push({id: sample.id, url: sample.payload.url, status: data.status || data.error, marker: data.headers && data.headers['x-tencent-video-bridge']});
  }
  process.stdout.write(JSON.stringify(out));
})().catch(err => { console.error(err); process.exit(1); });
"""

    temp = worker_js.parent / ".capture_payloads.json"
    temp.write_text(json.dumps(samples), "utf-8")
    try:
        completed = subprocess.run(["node", "-e", node_code, str(worker_js), str(temp)], check=True, capture_output=True, text=True)
    finally:
        temp.unlink(missing_ok=True)

    results = json.loads(completed.stdout)
    counters = Counter()
    examples = defaultdict(list)
    for item in results:
        key = item.get("marker") or str(item.get("status"))
        counters[key] += 1
        if len(examples[key]) < 5:
            examples[key].append(item["url"])

    print("# Tencent Video Worker Capture Verification")
    print()
    print(f"inspected_requests: {len(results)}")
    print()
    for key, count in counters.most_common():
        print(f"- {key}: {count}")
        for url in examples[key]:
            print(f"  - {url}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

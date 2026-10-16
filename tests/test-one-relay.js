// Offline Node.js tests for Loon ONE relay fallback behavior.
// Run: node tests/test-one-relay.js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "Loon/script/One_Loon_Resilient.js"), "utf8");
const plugin = fs.readFileSync(path.join(root, "Loon/plugin/One_Direct_Compatible.lpx"), "utf8");
let count = 0;
function probe({url = "https://api.3459381.com/v2.5/article/day",
  method = "GET", error = null, status = 200,
  headers = {"Content-Type":"application/json"}, body = '{"ok":true}',
  requestBody, store = new Map(), onCall}) {
  const calls = [];
  const done = [];
  const logs = [];
  const client = {};
  for (const type of ["get","post","put","patch","delete","head","options"]) {
    client[type] = (opts, callback) => {
      calls.push({type, opts});
      if (onCall) onCall(type, opts);
      callback(error, status === null ? null : {status, headers}, body);
    };
  }
  const context = {
    $request: {url, method, headers: {"Host":"api.3459381.com", "Authorization":"test-only"}, body:requestBody},
    $httpClient: client,
    $persistentStore: {
      read: (key) => store.get(key) || "",
      write: (value, key) => { if(value === null || value === undefined) store.delete(key); else store.set(key, value); return true; },
    },
    $done: (result) => {done.push(result);},
    console: {log: (line) => {logs.push(String(line));}},
  };
  vm.runInNewContext(source, context, {timeout: 1000, filename: "One_Loon_Resilient.js"});
  assert.equal(done.length, 1, "must complete exactly once");
  assert.ok(logs.every(line => !line.includes("test-only")), "must not log sensitive headers");
  return {done: JSON.parse(JSON.stringify(done[0])), calls, logs, store};
}
function test(name, fn) {fn();count++;console.log("OK: " + name);}
test("Plugin references resilient source and extends script timeout", () => {
  assert.match(plugin,/One_Loon_Resilient\.js/);
  assert.match(plugin,/timeout=12/);
  assert.match(plugin,/DOMAIN,one-api\.zzxu\.de,PROXY/);
  assert.doesNotMatch(plugin,/DOMAIN,one-api\.zzxu\.de,DIRECT/);
});
test("Successful GET returns relay response without original request", () => {
  const r = probe({});
  assert.equal(r.done.response.status,200);
  assert.equal(r.done.response.body,'{"ok":true}');
  assert.equal(r.calls.length,1);
  assert.equal(r.calls[0].type,"get");
  assert.equal(r.calls[0].opts.url,"https://one-api.zzxu.de/one/api.3459381.com/v2.5/article/day");
  assert.ok(r.calls[0].opts.timeout < 12000);
  assert.equal(r.calls[0].opts.headers.Host,undefined);
});
test("Network failure on GET goes direct with circuit breaker", () => {
  const store=new Map();
  const a=probe({error:"connection timeout",status:null,store});
  assert.equal(a.done.node,"DIRECT");
  assert.ok(store.size>0);
  const b=probe({store});
  assert.equal(b.calls.length,0);
  assert.equal(b.done.node,"DIRECT");
});
test("Temporary server failure on GET goes direct", () => {
  const a=probe({status:503,body:"upstream down"});
  assert.equal(a.done.node,"DIRECT");
});
test("Rate limit on read request goes to original site", () => {
  const a=probe({status:429});
  assert.equal(a.done.node,"DIRECT");
});
test("HTTP 401 remains a real authentication error", () => {
  const a=probe({status:401,body:'{"login":false}'});
  assert.equal(a.done.response.status,401);
});
test("POST read-only article endpoint is eligible for direct fallback", () => {
  const a=probe({method:"POST",status:502,requestBody:'{"page":1}'});
  assert.equal(a.done.node,"DIRECT");
  assert.equal(a.calls[0].type,"post");
  assert.equal(a.calls[0].opts.body,'{"page":1}');
});
test("POST account write request is never silently resubmitted", () => {
  const a=probe({url:"https://api.3459381.com/v2.5/user/login",method:"POST",error:"timeout",status:null,requestBody:'{"pin":"fake"}'});
  assert.equal(a.calls.length,1);
  assert.equal(a.done.response.status,502);
  assert.equal(a.done.node,undefined);
});
test("POST account request preserves actual HTTP 503", () => {
  const a=probe({url:"https://api.3459381.com/v2.5/user/login",method:"POST",status:503});
  assert.equal(a.done.response.status,503);
});
test("Cloudflare-like HTML body on GET triggers origin fallback", () => {
  const a=probe({status:200,headers:{"Content-Type":"text/html"},body:"<!doctype html><html>blocked</html>"});
  assert.equal(a.done.node,"DIRECT");
});
test("Unmatched URL not relayed or modified", () => {
  const a=probe({url:"not a valid url"});
  assert.equal(a.calls.length,0);
  assert.deepEqual(a.done,{});
});
test("Never recursively forward relay-domain requests", () => {
  const a=probe({url:"https://one-api.zzxu.de/one/loon.js"});
  assert.equal(a.calls.length,0);
  assert.deepEqual(a.done,{});
});
console.log("ONE relay tests passed (" + count + " cases).");

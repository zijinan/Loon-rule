#!/usr/bin/env node
// 合成测试用例，不包含抓包原始敏感信息。
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../Loon/script/ShuqiReader.ad.js'), 'utf8');
const base = 'https://ocean.shuqireader.com';
function run(endpoint, obj, raw) {
  let done;
  vm.runInNewContext(source, {
    $request: { url: base + endpoint },
    $response: { body: raw === undefined ? JSON.stringify(obj) : raw },
    $done: value => { done = value; }
  }, {timeout: 1000});
  assert.notEqual(done, undefined, 'script must call $done');
  return done.body ? JSON.parse(done.body) : obj;
}
const originalAd = { status: '200', message: 'success', data: {
  head: {adSource: 20}, middle: {adSource: 20}, bottom: {adSource: 20},
  userInfo: { userFreeAdTime: 0 }, readTask: { extInfo: {prizeId: 123} },
  commonConfig: {isBlackBook: false}, custom: {foo: 42}
}};
const cleaned = run('/api/route/iosReadPage/adV2?data=REDACTED', originalAd);
assert.equal(cleaned.data.head, null);
assert.equal(cleaned.data.middle, null);
assert.equal(cleaned.data.bottom, null);
assert.deepEqual(cleaned.data.readTask, originalAd.data.readTask);
assert.deepEqual(cleaned.data.userInfo, originalAd.data.userInfo);
assert.deepEqual(cleaned.data.commonConfig, originalAd.data.commonConfig);
assert.deepEqual(cleaned.data.custom, originalAd.data.custom);
const info = run('/api/ad/adserver/v1/api/getAdInfo', {
  status: '200', message: '成功', data: {resourceId: 601, adSource: 20}, info: {test: 1}
});
assert.equal(info.data, null);
assert.equal(info.info, null);
const alreadyEmpty = {status:'200',message:'成功',data:null,info:null};
assert.deepEqual(run('/api/ad/adserver/v1/api/getAdInfo',alreadyEmpty),alreadyEmpty);
const chapter = {message:'success',status:'200',data:{content:'小说正文',paragraphList:[1,2]}};
assert.deepEqual(run('/api/route/ios/readPage',chapter),chapter);
assert.deepEqual(run('/api/route/iosReadPage/adV2',null,'NOT JSON'),null);
assert.deepEqual(run('/api/route/iosReadPage/adV2',null,'x'.repeat(131073)),null);
console.log('ShuqiReader: 6 tests passed');

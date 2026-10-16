/*
 * 腾讯视频 iOS 首页 / 推荐流广告卡片过滤器，基于 2026-10-12 抓包。
 * 范围：i.video.qq.com/ 上的 MVLPageService/getMVLPage 二进制响应。
 * 策略：删除确认为广告的 protobuf 列表元素；保留普通 FeedVideoBoard 和视频播放接口。
 * 未匹配或结构不符时原样透传（fail closed）。
 * 原始抓包可能包含个人信息，切勿上传。
 */
(function () {
  'use strict';
  const MAX_BODY = 2 * 1024 * 1024;
  const SCRIPT_VERSION = '20261012-r3';
  const AD_TYPE = 'type.googleapis.com/com.tencent.qqlive.protocol.pb.AdFeedInfo';
  const MODULE_TYPE = 'type.googleapis.com/com.tencent.qqlive.protocol.pb.Module';
  const NORMAL_CARD = 'type.googleapis.com/com.tencent.qqlive.protocol.pb.FeedVideoBoard';
  const AD_INSERT = '_ad_insert_mix_block';
  const state = { modules: 0, blocks: 0 };

  function finish(value) { $done(value); }
  function toBytes(b) {
    if (b instanceof Uint8Array) return b;
    if (b instanceof ArrayBuffer) return new Uint8Array(b);
    if (b && ArrayBuffer.isView(b)) return new Uint8Array(b.buffer, b.byteOffset, b.byteLength);
    // Binary mode should supply Uint8Array. Never reinterpret arbitrary strings as binary.
    return null;
  }
  function slice(b, start, end) { return b.subarray(start, end); }
  function asciiAt(b, str, pos) {
    if (pos < 0 || pos + str.length > b.length) return false;
    for (let i = 0; i < str.length; i++) if (b[pos + i] !== str.charCodeAt(i)) return false;
    return true;
  }
  function contains(b, str) {
    const n = str.length;
    outer: for (let i = 0; i <= b.length - n; i++) {
      if (b[i] !== str.charCodeAt(0)) continue;
      for (let j = 1; j < n; j++) if (b[i + j] !== str.charCodeAt(j)) continue outer;
      return true;
    }
    return false;
  }
  function asciiEq(b, str) { return b.length === str.length && asciiAt(b, str, 0); }
  function readVarint(b, pos, end) {
    let value = 0, mult = 1;
    for (let i = 0; i < 10 && pos < end; i++) {
      const c = b[pos++];
      // Keys and sizes in these captured responses must fit safe integer range.
      if (i > 7) throw new Error('oversize varint');
      value += (c & 127) * mult;
      if (c < 128) return { value: value, pos: pos };
      mult *= 128;
    }
    throw new Error('truncated varint');
  }
  function skipVarint(b, pos, end) {
    for (let i = 0; i < 10 && pos < end; i++) if (b[pos++] < 128) return pos;
    throw new Error('invalid varint');
  }
  function parse(b) {
    let p = 0; const fields = [];
    while (p < b.length) {
      if (fields.length > 4096) throw new Error('too many protobuf fields');
      const start = p;
      const key = readVarint(b, p, b.length); p = key.pos;
      const field = Math.floor(key.value / 8), wire = key.value % 8;
      if (!field || (wire !== 0 && wire !== 1 && wire !== 2 && wire !== 5)) throw new Error('invalid wire type');
      const keyEnd = p;
      let dataStart = -1, dataEnd = -1;
      if (wire === 0) p = skipVarint(b, p, b.length);
      if (wire === 1) p += 8;
      if (wire === 5) p += 4;
      if (wire === 2) {
        const len = readVarint(b, p, b.length);
        if (len.value > MAX_BODY) throw new Error('oversize field');
        p = len.pos; dataStart = p; dataEnd = p + len.value; p = dataEnd;
      }
      if (p > b.length) throw new Error('field overrun');
      fields.push({ field: field, wire: wire, start: start, keyEnd: keyEnd, dataStart: dataStart, dataEnd: dataEnd, end: p });
    }
    return fields;
  }
  function bytes(b, f) { return slice(b, f.dataStart, f.dataEnd); }
  function varint(n) {
    const a = [];
    while (n >= 128) { a.push((n % 128) | 128); n = Math.floor(n / 128); }
    a.push(n); return new Uint8Array(a);
  }
  function join(parts) {
    let size = 0; for (const p of parts) size += p.length;
    if (size > MAX_BODY) throw new Error('output too large');
    const out = new Uint8Array(size);
    let offset = 0; for (const p of parts) { out.set(p, offset); offset += p.length; }
    return out;
  }
  function rebuildField(b, f, value) {
    return join([slice(b, f.start, f.keyEnd), varint(value.length), value]);
  }
  function isAdModule(moduleBytes) {
    if (!contains(moduleBytes, AD_TYPE) || !contains(moduleBytes, MODULE_TYPE)) return false;
    if (contains(moduleBytes, NORMAL_CARD)) return false;
    const fields = parse(moduleBytes);
    // Catch only the capture-confirmed wrapper: one field 10 holding a Module Any.
    return fields.length === 1 && fields[0].field === 10 && fields[0].wire === 2;
  }
  function isAdBlock(blockBytes) {
    if (!contains(blockBytes, AD_TYPE) || !contains(blockBytes, AD_INSERT)) return false;
    const fields = parse(blockBytes);
    let id = false, label = false;
    for (const f of fields) {
      if (f.wire !== 2) continue;
      const v = bytes(blockBytes, f);
      if (f.field === 1 && v.length > 9 && v.length <= 20 && asciiAt(v, 'ad_block_', 0)) {
        let digits = true;
        for (let i = 9; i < v.length; i++) if (v[i] < 48 || v[i] > 57) digits = false;
        if (digits) id = true;
      }
      if (f.field === 2 && asciiEq(v, AD_INSERT)) label = true;
    }
    return id && label;
  }
  function stripNested(b, depth) {
    if (depth > 12 || !contains(b, AD_INSERT)) return b;
    let fields;
    try { fields = parse(b); } catch (_) { return b; }
    let changed = false; const parts = [];
    for (const f of fields) {
      if (f.wire !== 2) { parts.push(slice(b, f.start, f.end)); continue; }
      const v = bytes(b, f);
      // In captured carousel_focus, field 1 repeats visible cards (one ad_block_2 among regular cards).
      if (f.field === 1 && isAdBlock(v)) {
        state.blocks++; changed = true; continue;
      }
      if (contains(v, AD_INSERT)) {
        const clean = stripNested(v, depth + 1);
        if (clean !== v) { parts.push(rebuildField(b, f, clean)); changed = true; continue; }
      }
      parts.push(slice(b, f.start, f.end));
    }
    return changed ? join(parts) : b;
  }
  function stripList(b) {
    const fields = parse(b), parts = [];
    let changed = false;
    for (const f of fields) {
      if (f.field !== 1 || f.wire !== 2) { parts.push(slice(b, f.start, f.end)); continue; }
      const value = bytes(b, f);
      if (isAdModule(value)) { state.modules++; changed = true; continue; }
      if (contains(value, AD_INSERT)) {
        const clean = stripNested(value, 0);
        if (clean !== value) { parts.push(rebuildField(b, f, clean)); changed = true; continue; }
      }
      parts.push(slice(b, f.start, f.end));
    }
    return changed ? join(parts) : b;
  }
  function stripPage(b) {
    const fields = parse(b), parts = [];
    let changed = false;
    for (const f of fields) {
      if (f.field === 2 && f.wire === 2) {
        const v = bytes(b, f);
        const clean = stripList(v);
        if (clean !== v) { parts.push(rebuildField(b, f, clean)); changed = true; continue; }
      }
      parts.push(slice(b, f.start, f.end));
    }
    return changed ? join(parts) : b;
  }
  function stripResponse(b) {
    const fields = parse(b), parts = [];
    let changed = false;
    for (const f of fields) {
      if (f.field === 1 && f.wire === 2) {
        const v = bytes(b, f), sub = parse(v);
        const isNormal = sub.some(x => x.field === 1 && x.wire === 2 && asciiEq(bytes(v, x), 'normal'));
        if (isNormal) {
          const clean = stripPage(v);
          if (clean !== v) { parts.push(rebuildField(b, f, clean)); changed = true; continue; }
        }
      }
      parts.push(slice(b, f.start, f.end));
    }
    return changed ? join(parts) : b;
  }
  function transform(body) {
    if (body.length < 32 || body.length > MAX_BODY || body[0] !== 9 || body[1] !== 48) return null;
    const packetSize = ((body[4] * 0x1000000) + (body[5] << 16) + (body[6] << 8) + body[7]) >>> 0;
    if (packetSize !== body.length || !contains(body, AD_TYPE)) return null;
    // Tencent TRPC frame: first 16 bytes are envelope, followed by protobuf fields.
    const input = slice(body, 16, body.length);
    const output = stripResponse(input);
    if (output === input || (!state.modules && !state.blocks)) return null;
    const result = join([slice(body, 0, 16), output]);
    const len = result.length;
    result[4] = (len >>> 24) & 255; result[5] = (len >>> 16) & 255;
    result[6] = (len >>> 8) & 255; result[7] = len & 255;
    // Validate the new protobuf frame. Failure means return original response.
    parse(slice(result, 16, result.length));
    return result;
  }

  try {
    if (typeof $request === 'undefined' || !/^https:\/\/i\.video\.qq\.com\/?(?:\?.*)?$/.test($request.url || '') || typeof $response === 'undefined' || !$response) return finish({});
    const body = toBytes($response.body);
    if (!body) {
      console.log('[TX-首页]['+SCRIPT_VERSION+'] 响应脚本已命中，但二进制body不可用；实际类型=' + typeof $response.body);
      return finish({});
    }
    const clean = transform(body);
    if (!clean) {
      if (body.length>=2 && body[0]===31 && body[1]===139) console.log('[TX-首页]['+SCRIPT_VERSION+'] 收到gzip字节，未解压，保持原样');
      else if (contains(body, AD_TYPE)) console.log('[TX-首页]['+SCRIPT_VERSION+'] 广告类型仍存在但未过滤，长度='+body.length);
      return finish({});
    }
    const headers = Object.assign({}, $response.headers || {});
    Object.keys(headers).forEach(k => {
      if (/^(content-length|content-encoding|transfer-encoding)$/i.test(k)) delete headers[k];
    });
    console.log('[TX-首页]['+SCRIPT_VERSION+'] 已过滤广告模块='+state.modules+' 焦点广告='+state.blocks+' 字节='+body.length+'->'+clean.length);
    return finish({body: clean, headers: headers});
  } catch (error) {
    console.log('[TX-首页]['+SCRIPT_VERSION+'] 安全透传：' + String(error && error.message || error));
    return finish({});
  }
})();

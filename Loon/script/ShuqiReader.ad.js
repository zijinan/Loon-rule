/*
 * 书旗小说：针对抓包验证过的广告 JSON 接口进行保守清理。
 * 仅作用于 ocean.shuqireader.com 的两个小响应，不扫描/修改章节正文。
 * 同一脚本兼容 Loon 与 Quantumult X。
 * 原始抓包不得提交到公开仓库（可能包含登录凭据和设备标识）。
 */
(function () {
  'use strict';
  const url = typeof $request !== 'undefined' && $request ? $request.url || '' : '';
  const body = typeof $response !== 'undefined' && $response ? $response.body : null;
  const finish = (result) => $done(result);
  const prefix = /^https?:\/\/ocean\.shuqireader\.com(?::443)?(\/[^?#]*)(?:[?#]|$)/i;
  const match = prefix.exec(url);
  if (!match || typeof body !== 'string' || body.length > 131072) return finish({});

  const path = match[1];
  const isAdV2 = path === '/api/route/iosReadPage/adV2';
  const isAdInfo = path === '/api/ad/adserver/v1/api/getAdInfo';
  if (!isAdV2 && !isAdInfo) return finish({});

  try {
    const result = JSON.parse(body);
    if (!result || typeof result !== 'object' || Array.isArray(result)) return finish({});
    // 服务端真正出现过的“无广告”响应：status=200, data=null, info=null。
    if (isAdInfo) {
      if (result.data === null && result.info === null) return finish({});
      if (result.data && typeof result.data === 'object' &&
          ('adSource' in result.data || 'resourceId' in result.data)) {
        result.data = null;
        result.info = null;
        return finish({ body: JSON.stringify(result) });
      }
      return finish({});
    }

    // adV2 响应同时包含广告位与用户任务信息：只清空广告位，不碰 userInfo/readTask/commonConfig。
    if (!result.data || typeof result.data !== 'object' || Array.isArray(result.data)) return finish({});
    const slots = ['head', 'middle', 'tail', 'bottom', 'wordLink', 'chapterVideo', 'lastChapter', 'listen'];
    let changed = false;
    for (const slot of slots) {
      if (Object.prototype.hasOwnProperty.call(result.data, slot) && result.data[slot] !== null) {
        result.data[slot] = null;
        changed = true;
      }
    }
    return finish(changed ? { body: JSON.stringify(result) } : {});
  } catch (_) {
    // 不是可解析的小 JSON 时保持原样，防止影响阅读功能。
    return finish({});
  }
})();

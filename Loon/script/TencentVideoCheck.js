// TencentVideoAD plugin quick-check. Manual Generic Script only.
(function () {
  try {
    console.log("[TxVideoAD-Loon] CHECK: manual diagnostic script executed");
    $notification.post(
      "腾讯视频去广告 · 诊断",
      "插件脚本已经运行",
      "这只证明诊断脚本能运行。请确认 HTTPS 解密/MITM 已开启、Loon 证书已完全信任，然后重启腾讯视频并开启诊断日志观察是否命中接口。"
    );
  } catch (e) {
    console.log("[TxVideoAD-Loon] CHECK ERR: " + e);
  }
  $done();
})();

# 腾讯视频抓包保守版：分析及回归说明

本插件来自 2026-10-12 提交的 212_1791804894408.zip。压缩包包含多条请求和响应记录，不公开原始包，避免泄漏 cookie、token、设备标识。

## 已识别

- `i.video.qq.com/`：142 条请求，混用相册、推荐、VIP 信息、广告和奖励等 TRPC 方法；**不整接口拒绝**。
- `pgdt.gtimg.cn/141/20204/snscosdownload/SZ/reserved/`：21 条记录，定位到广告分发素材目录。
- `vr.gdt.qq.com/gdt_stats.fcg`：20 条记录，广告统计。
- `xs.gdt.qq.com/car/m/report_m`：26 条记录，广告监测。
- `t.gdt.qq.com/conv/src/61/conv`：6 条记录，归因上报。
- `sdkreport.e.qq.com/link_event`：10 条记录，SDK 上报。
- `rdelivery.qq.com/v1/statistic/report`：2 条记录，统计上报；但其 `/v3/config/pull` 不屏蔽。
- `vv.video.qq.com/getvinfo`、`vv6.video.qq.com/batchvinfo` 是播放信息相关接口，不应全域名阻断。
- `dns.alidns.com/dns-query` 在抓包中有大量请求，并非可直接判定的广告服务。

## 风险与验证

1. 该版本是**保守广告素材与跟踪拦截**，不是已证明的开屏、贴片、暂停、会员广告全部去除方案。
2. 本次仅离线分析抓包，未在腾讯视频 iOS 客户端实测，不能承诺 100% 去广告。
3. Loon 中导入插件并启用 HTTPS 解密（安装和信任本机证书），先验证首页、搜索、播放、会员登录和投屏是否正常。
4. 再检查开屏、信息流、片前广告；如果广告仍存在，请分别抓取“进入页面前后”的包含 `i.video.qq.com` 请求及响应的最小样本，用于精确识别 RPC 广告子服务。
5. 发现播放异常，先停用本插件并与未开启时对比；不要提交任何未脱敏抓包、认证信息或密钥到公开仓库。

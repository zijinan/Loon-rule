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


## 2026-10-12 第二次抓包：首页信息流广告修复

用户明确希望解决的是首页推荐列表的广告卡片和自动播放的视频广告；会员已经处理正片广告，本插件不得破坏正片播放。

离线分析 213_1791805703062.zip：422 组 HTTP 请求，其中 i.video.qq.com 有 104 组。
6 份 trpc.multi_vector_layout.mvl_controller.MVLPageService/getMVLPage 响应出现
`type.googleapis.com/com.tencent.qqlive.protocol.pb.AdFeedInfo`；
发现的广告具体分为：
- `_ad_insert_mix_block`：carousel_focus 里的广告焦点卡片；
- `AdFeedVideoPoster`：信息流自动播放广告视频卡片；
- `AdFeedImagePoster`、`AdFocusPoster`：信息流图片广告/焦点图片卡片。

此次增补 `Loon/script/TencentVideo.HomeFeed.js`，Loon 插件采用
`http-response` + `requires-body=true` + `binary-body-mode=true`，
解析腾讯特定 TRPC 帧和 protobuf，**直接移除含 AdFeedInfo 的广告模块**、
以及含 `_ad_insert_mix_block` 的独立焦点广告块，重建 protobuf 变长字段及帧长度。

本次抓包离线校验：6/6 份广告首页响应被改写，17/17 个 `AdFeedInfo` 节点清除（10 个独立广告模块、7 个焦点广告块），对应响应中的 `FeedVideoBoard` 数量全部保持不变；其他 98/98 份 `i.video.qq.com` 响应未修改。首页普通内容模块字节级保留。

**重要限制**：这些是离线二进制回归结果，不是 iOS 手机实测，不保证客户端不会缓存广告、升级更换协议或通过其他接口投放。真实效果必须通过手机验证。

### 手机安装与排障

1. 使用此 PR 分支的 `Loon/plugin/TencentVideo-CaptureSafe.lpx` 地址更新插件，在 Loon 中重新下载插件及远程脚本。
2. 确认 Loon 的 HTTPS 解密/MITM 已启用、证书已在 iOS 系统设置中信任，`i.video.qq.com` 命中解密；如果 Loon 无法获取二进制响应，脚本会安全透传，**不会生效**。
3. 暂时停用其他腾讯视频广告插件以免脚本互相改写，彻底退出腾讯视频 App 再重启并刷新首页列表。
4. 查看 Loon 脚本日志，若捕获到含广告的响应，应出现「`[腾讯视频首页广告] 已去除 N 个广告模块、M 个焦点广告块`」。
5. 若日志一直没有执行/去除数，先检查插件、脚本 URL、MITM/证书和抓包首页请求是否仍是 `i.video.qq.com`；若有日志但仍看到广告，需要**新版本首页广告样本**（去标识化）以定位新的卡片类型。
6. 如有首页加载异常立即停用该插件、复原原始响应；不要使用脚本改写账号、VIP 或正片播放接口。

待验证：真实腾讯视频 iOS 9.03.65 中的首页信息流和自动播放效果。

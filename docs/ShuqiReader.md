# 书旗小说去广告（2026-10-12 iOS 抓包版）

**手动启用、可回退、需要实机验证；不保证所有广告位都被清除。**

本项目只提交可审查规则，**不公开抓包 ZIP、请求头、账号、Cookie、签名、设备标识或 HTTPS 证书**。

## 抓包证据

这次 ZIP 有 1,990 个条目：554 份请求头、501 份响应体。

- 书旗 API `/api/route/iosReadPage/adV2`：1 条响应，阅读页的 middle、bottom 包含广告资源与 isShowAd=1。
- 书旗 API `/api/ad/adserver/v1/api/getAdInfo`：4 条响应，其中 3 条有广告数据，另 1 条的服务端原生无广告响应为 data:null、info:null。
- `/api/route/iosReadPage/adTurnChapter`：2 条响应已经是 adFreeVideo:null，因此不增加多余规则。
- `/api/route/ios/readPage` 和 `/api/route/reader/renderExt`：涉及会员及章节扩展信息，不修改。
- `/api/render/load/resource`：多条响应为非普通 JSON 编码，未解码验证，不修改。
- 抓包出现多个第三方广告服务商域名。广点通、阿里、京东等共享 SDK 域名默认不拦截。

## Loon 安装

1. Loon → 插件 → 添加 URL：

   https://raw.githubusercontent.com/zijinan/Loon-rule/main/Loon/plugin/ShuqiReader.lpx

2. 在 Loon 中手动启用 HTTPS 解密并安装、信任自己本机的证书（只需要 ocean.shuqireader.com）。不要向 GitHub 提交证书。
3. 确认脚本和重写已启用，然后重启书旗小说。
4. 阅读页观察 Loon 日志中的 Shuqi-Reader-AdV2、Shuqi-GetAdInfo 是否命中。

插件内 5 条广告/统计域名规则**对手机其他 App 也生效**。如有兼容问题，可先禁用插件的 [Rule] 条目排查；广点通等共享 SDK 域名规则默认都被注释。

## Quantumult X 安装

1. 手动添加重写资源：

   https://raw.githubusercontent.com/zijinan/Loon-rule/main/QuantumultX/rewrite/ShuqiReader.conf

2. 将 ocean.shuqireader.com 设为 MITM，安装、信任本机证书，并启用重写；默认 Public Safe 配置不受影响。
3. 如需额外的第三方广告域名拦截，**另行且可选**导入分流规则资源：

   https://raw.githubusercontent.com/zijinan/Loon-rule/main/QuantumultX/rule/ShuqiReader-Ads.list

## 工作方式与限制

脚本只对 ocean.shuqireader.com 上两个已确认的小 JSON 接口生效：

- /api/route/iosReadPage/adV2：清除 head、middle、tail、bottom、wordLink、chapterVideo、lastChapter、listen 广告槽位，原样保留 userInfo、readTask、commonConfig 等非广告数据。
- /api/ad/adserver/v1/api/getAdInfo：仅在确实包含广告资源对象时，使用抓包中服务端真实返回过的 data:null、info:null 结构。

安全边界：域名/路径精确匹配；超过 128 KiB 或无法解析的响应保持原样；不修改小说正文、目录、登录、支付、会员资格、金币任务、封面资源或加密资源。不会替用户取得任何付费阅读权限。

## 测试

开发阶段运行：

    node tests/test-shuqi-reader.js

本地对抓包中 8 条相关真实响应进行只读回归，8 条均完成；其中 4 条按预期修改，其余不修改。真实响应不进公开仓库。

测试方法：打开阅读页、翻章、书架、目录、登录和付费页面。若出现异常或广告持续，请先停用插件，排查缓存、其他插件冲突或新版 API。不要拒绝整个 ocean.shuqireader.com 主域，也不要屏蔽 img-tailor.11222.cn 封面 CDN。

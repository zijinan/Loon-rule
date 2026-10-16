# ONE Loon 直连兼容修复（2026-10-16）

## 修复背景

来自用户 2026-10-16 的抓包：`one-api.zzxu.de` 不仅用于下载 Loon 插件，还承担实际 API 中转（抓包中约 59 次请求）。
旧版 `Loon/rule/ONE_Direct.list` 把该域名和动态 API 强制 DIRECT，可能绕过可用代理，令插件请求超时或功能失效。
目前已将强制 DIRECT 范围缩小为 One 主站和四个媒体资源域名，其他动态 API 不再强制 DIRECT。

## 可用文件

- `Loon/plugin/One_Direct_Compatible.lpx`：**推荐安装的修复版**，保留原来的 MITM 和请求脚本规则，在插件内额外增加 `DOMAIN,one-api.zzxu.de,PROXY`，并使用仓库固定版本脚本。
- `Loon/plugin/One_Upstream_20261016.lpx`：原插件（使用 Loon User-Agent 从 `https://one-api.zzxu.de/one/one.lpx` 获得的快照），只用于备份对比。
- `Loon/script/One_Loon_Upstream_20261016.js`：原插件引用的 `loon.js` 代码快照；仅调整分发位置，未更改原逻辑。
- `Loon/rule/ONE_Direct.list`：独立直连规则，只包含已观测的入口及静态媒体主机。

## Loon 使用方法

1. 在 Loon 的「插件」页面关闭/移除旧 One 插件，以免两个相同的脚本/MITM 规则同时生效。
2. 添加远程插件：`https://raw.githubusercontent.com/zijinan/Loon-rule/main/Loon/plugin/One_Direct_Compatible.lpx`
3. 在该插件的策略设置中，将 `PROXY` 映射为实际可用的代理节点或代理策略组（例如本仓库公开 Loon 配置的 `兜底后备策略`），**切勿映射成 DIRECT**。
4. 在「远程规则」更新 `https://raw.githubusercontent.com/zijinan/Loon-rule/main/Loon/rule/ONE_Direct.list`，策略设置为 `DIRECT`。
5. 在 Loon 本地确保 HTTPS 解密/MITM 证书已经正确安装并信任；无需向 GitHub 上传任何证书。
6. 重新进入 One，查看请求日志：媒体 CDN 走 DIRECT；`one-api.zzxu.de` 走插件所设置的代理策略；动态 API 应被插件请求脚本处理。

## 安全与已知限制

- 原插件作者：baby；本仓库文件是 2026-10-16 取得的第三方代码快照，不属于官方 One 客户端。
- 原始脚本会把匹配的 One API 请求以及其请求头和请求体发送至第三方 `one-api.zzxu.de`。在安装前请确认你信任该服务，尤其是账号认证信息可能包含在转发请求中。
- 此修复不引入广告 REJECT、响应体替换或新的 MITM 范围，且没有编造未在抓包中证明的目标服务器 IP。
- 固定快照不能自动跟随上游脚本更新，若第三方 API 或脚本逻辑变化，可能需要重新对比上游版本。
- GitHub 规则校验通过不等于 Loon 真机运行测试；是否修复成功应以你本机插件脚本运行结果、请求日志和内容加载为准。

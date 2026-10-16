# ONE Loon 直连兼容修复（2026-10-16）

## 修复背景

来自用户 2026-10-16 的抓包：`one-api.zzxu.de` 不仅用于下载 Loon 插件，还承担实际 API 中转（抓包中约 59 次请求）。
旧版 `Loon/rule/ONE_Direct.list` 把该域名和动态 API 强制 DIRECT，可能绕过可用代理，令插件请求超时或功能失效。
目前已将强制 DIRECT 范围缩小为 One 主站和四个媒体资源域名，其他动态 API 不再强制 DIRECT。

## 可用文件

- `Loon/plugin/One_Direct_Compatible.lpx`：**推荐安装的容错版**，保留原来的 MITM 和请求匹配范围，在插件内设置 `DOMAIN,one-api.zzxu.de,PROXY`，脚本超时显式设为 12 秒，引用 `One_Loon_Resilient.js`。
- `Loon/plugin/One_Upstream_20261016.lpx`：原插件（使用 Loon User-Agent 从 `https://one-api.zzxu.de/one/one.lpx` 获得的快照），只用于备份对比。
- `Loon/script/One_Loon_Upstream_20261016.js`：原插件引用的 `loon.js` 代码快照；仅调整分发位置，未更改原逻辑。
- `Loon/script/One_Loon_Resilient.js`：**新容错脚本**，继承原来的 API 转发方法，加入瞬时故障降级、25 秒熔断与写请求保护。
- `tests/test-one-relay.js`：离线验证正常响应、超时、HTML 网关错误、降级以及 POST 写入保护。
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

## 2026-10-16 API 不稳定修复记录

### 已确认的两个问题

1. 原始脚本 `$httpClient` 超时 15 秒，而插件的 Loon `http-request` 未显式配置脚本超时（旧语法默认 10 秒），出现拥塞时可能导致脚本比请求先超时。
2. 原始脚本只要收到网络错误就合成 HTTP 502，没有向原始 API 降级的策略。

原抓包里约 59 条请求经过 `one-api.zzxu.de`，HTTP 200/204 并不能说明这个中转在全天稳定，单次抓包不足以测算故障率。

### 新版本行为

- Loon 脚本执行超时：12 秒；向 relay 发起的 HTTP 客户端请求超时：6.5 秒。
- Relay 超时、HTTP 408/425/429、5xx，或 GET 请求遇到 HTTP 200 网关 HTML 页面：将可安全降级的读取请求交还原始 API 并选择 `DIRECT`。
- 能安全降级的请求为 GET/HEAD/OPTIONS 和已知内容读取路径下的 POST（article、navigation、search、area、panda、actor、notice、feed、rank、topic、novel、live、popup）。
- 遇到中转故障后进入 25 秒短熔断期：上述读取请求不再等待中转，直接交由源站处理；后续请求恢复后解除。
- 未知 POST、PUT、PATCH、DELETE 等可能写入状态的请求**不会自动重试或改向源站发送**，避免重复支付、登录、短信或其他账户操作；上游已返回的错误码予以保留，网络错误则返回 502。
- 与原插件一样，插件中转仍依赖唯一的第三方 `one-api.zzxu.de`，**本修复不能保证解锁功能在第三方服务器宕机时继续工作**。降级只为保住源站可直接提供的正常服务。
- 保持单独的静态资源 DIRECT 规则；不允许把 relay 添加到这份 DIRECT 列表。
- 安全处理仅根据请求方法与 URL **路径类别近似识别**读取接口；如果某个 POST 读取路径事实上也具有服务端写入副作用，仍可能有重复处理风险，应按具体业务端点再收紧名单。

### 更新方式

无需重新导入旧地址：打开 Loon 的插件列表，刷新 `One_Direct_Compatible.lpx` 即可；确保插件的 PROXY 映射为实际可用的代理节点或策略组，同时关闭官方原版 `one.lpx`，避免脚本重复匹配。

### 验证

GitHub Actions 工作流 `Validate public rules` 新增 `node tests/test-one-relay.js` 离线回归测试；实际网络稳定性仍须在 Loon 设备上观察插件日志及原始 API 是否可直接访问。

如需彻底解决第三方中转不稳定，必须取得**经过验证、被授权、接口兼容的备用中转服务**，或由第三方提供高可用方案。不能把抓包中的随机 API 域名简单当作等价中转。

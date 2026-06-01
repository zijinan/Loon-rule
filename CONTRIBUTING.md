# Contributing

感谢你愿意改进这个公开规则仓库。本仓库优先接受能提高公开配置安全性、稳定性、兼容性和可维护性的变更。

## 适合提交的内容

- Loon、QuantumultX、Shadowrocket 的公开分流规则调整。
- 不包含私密信息的插件、Rewrite 或脚本修复。
- DNS 泄漏、误拦截、登录/支付/语音/更新异常相关修复。
- 文档、校验脚本、Issue/PR 模板、发布说明等维护改进。

## 不要提交的内容

- 真实节点、订阅链接、UUID、password、Reality key、short-id、Hysteria2 密码。
- MITM `ca-p12`、`ca-passphrase`、证书、`.p12`、`.mobileconfig`、`.key`、`.pem`。
- 私有域名、账号、Cookie、token、抓包原始请求、供应商名称或可识别个人配置的信息。
- 会破坏登录、支付、语音、更新、CDN 或基础连接的激进拦截规则。

## 提交前检查

在提交 PR 前运行：

```bash
node scripts/validate-public-rules.js
```

手动检查：

- 新增配置是否只使用 `YOUR_*` 占位符。
- 国内常用 App、游戏、支付和 CDN 是否仍走 `DIRECT` 或明确的国内策略。
- 代理规则是否在广泛国内规则之前，避免被提前命中。
- 修改插件时确认不会把响应体改写变成缓存膨胀来源。

## PR 流程

1. 从 `main` 创建功能分支。
2. 保持变更小而清楚：一个 PR 只解决一个维护主题。
3. 在 PR 描述里写明影响的客户端、规则范围和测试方式。
4. 等待维护者检查公开安全性和兼容性后再合并。

## Issue 流程

提交 Issue 时请用模板，并只提供公开域名、症状、客户端版本和可复现步骤。不要粘贴私有订阅、节点、账号、Cookie、token 或证书材料。

# Quantumult X Auto Safe

从当前 Loon_Advanced_Auto_Safe.conf 迁移出的 Quantumult X 配置目录。

目标：

- 国内 App、Apple、微信、腾讯、王者荣耀、支付宝、Bilibili 优先直连
- 国外服务走代理策略组
- AI / Google / YouTube / Netflix / Telegram / GitHub 单独分组
- 默认拦截 UDP 443 / QUIC，减少绕过代理、抓包不完整、重写失效和分流异常
- 不提交真实节点、订阅地址、MITM 证书、账号密钥

## 文件说明

```text
QuantumultX/
├── QuantumultX_Auto_Safe.conf        # 主配置
├── rule/
│   ├── Direct-Domestic.list          # 国内/腾讯/Apple/游戏直连补充
│   ├── Proxy-Global.list             # 国外服务补充
│   ├── AI.list                       # AI 服务补充
│   └── HonorOfKings-Direct.list      # 王者荣耀/腾讯反作弊直连补充
└── rewrite/
    └── README.md                     # 重写/脚本使用说明
```

## 安装方式

主配置 Raw 链接：

```text
https://raw.githubusercontent.com/zijinan/Loon-rule/main/QuantumultX/QuantumultX_Auto_Safe.conf
```

规则 Raw 链接：

```text
https://raw.githubusercontent.com/zijinan/Loon-rule/main/QuantumultX/rule/Direct-Domestic.list
https://raw.githubusercontent.com/zijinan/Loon-rule/main/QuantumultX/rule/Proxy-Global.list
https://raw.githubusercontent.com/zijinan/Loon-rule/main/QuantumultX/rule/AI.list
https://raw.githubusercontent.com/zijinan/Loon-rule/main/QuantumultX/rule/HonorOfKings-Direct.list
```

## 重要说明

1. 这个仓库公开安全版不包含真实节点和订阅链接。
2. 你需要在 Quantumult X 里本地添加自己的节点或订阅。
3. 策略组里的节点名沿用 Loon 里的名称：`usa 搬瓦工`、`usa rack`、`NL 搬瓦工`。
4. 如果你的 QX 节点名称不一致，需要把主配置里的策略组成员改成你的实际节点名。
5. MITM 和 HTTPS 重写默认不启用，避免影响微信、支付、游戏、视频启动速度。

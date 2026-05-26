# Quantumult X Rewrite / Script

这个目录用于放 Quantumult X 重写和脚本配置。

当前默认不启用 HTTPS 重写，原因：

1. 微信、支付、游戏、视频 App 对 MITM 很敏感。
2. 大量重写脚本会影响启动速度，甚至导致视频一直转圈。
3. 先把 DNS、QUIC、DIRECT/PROXY 分流稳定下来，再逐个启用脚本更安全。

## 建议策略

- 日常使用：不开 MITM，不开大而全去广告重写。
- 抓包分析：临时打开 MITM，只抓目标 App。
- 去广告：只针对一个 App 写精准 hostname，不要全局 MITM。
- 视频类 App：优先用分流规则解决加载问题，脚本最后再加。

## 后续可放的文件

```text
rewrite/
├── TencentVideo.conf
├── KuGouMusic.conf
├── YouTube.conf
└── BlockAds.conf
```

注意：QX 和 Loon 的脚本参数、rewrite 写法不完全一样，不能把 `.lpx` 原样复制进去，需要转换。

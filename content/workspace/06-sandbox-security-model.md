---
title: "Sandbox 安全模型"
description: "从威胁模型、Docker 边界、挂载权限、网络与密钥管理出发，建立 Coding Agent 的安全检查清单。"
category: workspace
order: 6
updated: 2026-11-25
diagram: /diagrams/security-boundary.svg
tags: [Sandbox, Docker, 安全, 威胁模型]
---

## 本文学习目标

- 说清 Coding Agent 的主要威胁面。
- 理解 Docker Sandbox 能提供什么、不能提供什么。
- 写出一份部署安全检查清单。

## 一、威胁模型

Coding Agent 的风险来自四个事实：

1. 它执行模型生成的代码或命令。
2. 它能读写仓库文件。
3. 仓库内容可能包含不可信文本（issue、注释、README、依赖脚本）。
4. 它持有 API Key 或能访问密钥环境。

因此，威胁面包括：

| 威胁 | 例子 | 主要缓解 |
| --- | --- | --- |
| 任意命令执行 | 恶意脚本、危险 shell | 容器隔离、命令白名单、确认策略 |
| 路径越界 | `../` 读取宿主机文件 | workspace 根目录校验、最小挂载 |
| 网络外泄 | 上传源码或密钥 | 网络出口限制 |
| Prompt Injection | 仓库 README 指示 Agent 泄露密钥 | 输入隔离、密钥不暴露、人工审批 |
| 多租户串扰 | 会话共享目录 | 每会话 workspace / worktree |
| 凭据泄漏 | 密钥写入日志或事件 | 加密存储、脱敏、稳定 OH_SECRET_KEY |

## 二、为什么不能默认使用宿主机权限

OpenHands README 对“不带 Sandbox”模式给出明确警告：

> This runs the agent-server directly on the machine you're installing on — the agent will have full access to your filesystem!

从源码启动也有同样警告。这说明官方并不把宿主机模式当作安全默认，而是作为便捷开发方式。

## 三、Docker Sandbox 的边界

官方 Docker quickstart 的细节：

- 镜像：`ghcr.io/openhands/agent-canvas:1.45.0`
- 容器内 uid：`10001`
- workspace 挂载到 `/projects`
- 状态卷：`openhands-state:/home/openhands/.openhands`
- 端口发布到 `127.0.0.1:8000`
- `/alive` 检查约 30 秒无响应则容器退出

Linux Docker Engine 上需要授权 uid 10001 读写 workspace 与已有文件。官方给出的示例命令会授予所有主机用户访问权限，并提醒：

- 应与 `~/.openhands` 等敏感数据分开
- 不要让 state 目录对所有用户可写，否则其他本地用户可能替换 session key
- 保持默认 container user

这说明“容器隔离”与“主机文件权限”是两个独立问题。

## 四、文件系统边界

建议：

1. 只挂载任务所需目录，不挂载家目录。
2. 每个 conversation 使用独立目录或 git worktree。
3. 状态卷与 workspace 卷分离。
4. 对已有 `~/.openhands` state，确保 uid 10001 可访问但保持密钥私有。
5. SELinux 主机上使用 `:z` 或 `:Z` 标签。

## 五、网络边界

默认不应假设容器网络是安全的。建议：

- 按任务需要限制出站访问
- 不把 Agent Server 暴露到公网
- 使用 TLS、私有网络或可信反向代理
- 仅在必要时配置 `OH_ALLOW_CORS_ORIGINS_0`

Agent Server 官方明确警告：未鉴权实例能在 workspace 中执行命令、读写文件，不能暴露到公网。

## 六、命令执行风险

即使有容器，命令执行仍需控制：

- 避免把完整 shell 能力暴露给不可信任务
- 对破坏性命令设置确认策略
- 使用超时与输出截断
- 记录命令与退出码

Agent Server 提供 confirmation policy 与 respond_to_confirmation 端点，说明人工审批是一等能力。

## 七、Prompt Injection 与恶意仓库内容

这是与大语言模型相关的独特风险。仓库中的 README、注释、Issue 文本都可能被 Agent 读取并当作上下文。

缓解思路：

- 不把密钥放进 Agent 可读环境
- 对外部内容标注为“不可信数据”
- 关键操作需要确认
- 事件轨迹中保留来源信息

本文不声称 OpenHands 有某个具体反注入机制；相关实现需核实源码。

## 八、密钥管理

官方 Agent Server 文档给出：

- `OH_SESSION_API_KEYS_*`：请求鉴权
- `OH_SECRET_KEY`：加密 conversation 中保存的敏感值，包括 LLM API keys 与 secrets
- `X-Session-API-Key`：客户端请求头

要求 `OH_SECRET_KEY` 跨重启稳定；改变后旧加密值无法恢复。

Canvas README 还提醒：

- 本地 listener 仅绑定 loopback，避免 session key 被局域网访问
- 监听所有接口时不会注入 session key
- 发布到 LAN/公网时应省略 `AGENT_CANVAS_ALLOW_LAN_SESSION_KEY`，并在 UI 输入 API key

## 九、部署安全检查清单

```text
[ ] 不在宿主机模式运行不可信任务
[ ] 使用 Docker / Remote Workspace 隔离执行
[ ] workspace 只挂载必要目录
[ ] 状态卷与 workspace 卷分离
[ ] 为 uid 10001 配置最小权限
[ ] 设置 OH_SESSION_API_KEYS_0
[ ] 设置稳定 OH_SECRET_KEY
[ ] Agent Server 不暴露公网，置于 TLS / 私有网络后
[ ] 限制网络出口
[ ] 配置 confirmation policy
[ ] 限制工具输出长度与命令超时
[ ] 每会话独立 workspace / worktree
[ ] 审计事件轨迹与运行历史
```

## 十、/alive 与恢复

Canvas README 说明：当 Agent Server 约 30 秒无法响应 `/alive` 检查时，entrypoint 以退出码 1 停止容器，让崩溃显式暴露。自动恢复需要 `restart: unless-stopped` 或 Compose 中等价配置。

这是安全与可靠性兼顾的设计：不留下“对请求返回 502 但仍活着”的容器。

## 十一、常见错误

1. 认为 Docker 默认解决所有隔离问题。
2. 把整个家目录挂载进容器。
3. 把 `OH_SECRET_KEY` 当作普通环境变量随意更换。
4. 将 session key 注入 HTML 后把服务暴露到 LAN。
5. 多个会话共用同一 workspace 且并发写文件。

## 十二、本文总结

Sandbox 是 Coding Agent 的基础设施。安全来自多层叠加：workspace 挂载边界、容器用户、网络限制、API 鉴权、密钥管理、人工审批与事件审计。

## 十三、延伸阅读

- [Workspace 架构](#/article/workspace/02-workspace-architecture)
- [Coding Agent 的安全风险](#/article/security/01-coding-agent-risks)
- [交互实验室：Sandbox Explorer](#/labs?lab=sandbox)

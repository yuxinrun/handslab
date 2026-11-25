---
title: "Workspace 架构：Local、Docker 与 Remote"
description: "对照官方 SDK 的类层次，讲清 Workspace、LocalWorkspace、RemoteWorkspace、DockerWorkspace 与 RemoteAPIWorkspace 的关系和切换方式。"
category: workspace
order: 2
updated: 2026-11-25
diagram: /diagrams/workspace.svg
tags: [Workspace, DockerWorkspace, RemoteAPIWorkspace, 部署模式]
---

## 本文学习目标

- 区分 SDK 内建 workspace 与扩展 workspace 包。
- 说明三种执行模式的连接方式。
- 理解“替换 workspace 类型”具体意味着什么。

## 一、类层次

官方 SDK 架构文档给出的层次可以整理为：

```text
Workspace（基础抽象）
├── LocalWorkspace        # openhands.sdk 内置
└── RemoteWorkspace       # openhands.sdk 内置
    ├── DockerWorkspace   # openhands.workspace
    └── RemoteAPIWorkspace # openhands.workspace
```

文档说明 workspace 实现扩展 SDK 中的 `RemoteWorkspace`，增加容器生命周期或 API client 功能。

## 二、LocalWorkspace

特点：

- 包含在 `openhands.sdk` 中
- 一切在单进程内运行
- 无需 Docker
- 适合 prototyping 与简单用例

官方 Quick Start 示例通过 `os.getcwd()` 构造 workspace，属于最简本地模式。

风险：Agent 拥有当前进程用户的文件与命令权限。不适合不可信任务。

## 三、DockerWorkspace

特点：

- 属于 `openhands.workspace`
- 会启动带 server 的容器
- 适合 sandboxed execution

Agent Canvas README 的 Docker 模式提供了可对照的部署细节：

- Docker 镜像 `ghcr.io/openhands/agent-canvas:1.45.0`
- 容器内 uid `10001`
- workspace 挂载到 `/projects`
- Linux Docker Engine 上需要授权 uid 10001 读写 workspace
- `/alive` 检查约 30 秒无响应则容器退出

这些细节说明容器隔离不是“启动容器就结束”，还涉及用户映射、挂载权限与健康检查。

## 四、RemoteAPIWorkspace

特点：

- 属于 `openhands.workspace`
- 通过 HTTP 连接 server
- 适合多用户部署、SaaS、分布式系统

官方文档给出的 Python 连接示例：

```python
workspace = Workspace(
    host="http://127.0.0.1:8000",
    api_key=os.environ["OH_SESSION_API_KEYS_0"],
    working_dir="workspace/project",
)
conversation = Conversation(agent=agent, workspace=workspace)
```

这里 `Workspace` 通过 host 与 api_key 连接到远程 Agent Server，`working_dir` 指定远端工作目录。

## 五、同一份 Agent 代码如何切换

官方关键结论：

> Same agent code works in both modes—just swap the workspace type.

教学示意（不是官方源码）：

```python
# 本地
workspace = LocalWorkspace(root=os.getcwd())
conversation = Conversation(agent=agent, workspace=workspace)

# 容器
workspace = DockerWorkspace(...)  # 具体参数以源码为准
conversation = Conversation(agent=agent, workspace=workspace)

# 远程
workspace = Workspace(host="http://127.0.0.1:8000", api_key=key, working_dir="workspace/project")
conversation = Conversation(agent=agent, workspace=workspace)
```

`agent` 与工具列表完全不变，改变的是执行环境。这正是抽象的价值。

## 六、Agent Server 与 workspace 的关系

Agent Server 文档中说明 workspace 使用 remote HTTP/WebSocket calls 处理 workspace operations 与 conversation operations。运行时文件默认位于 server 进程工作目录下的：

```text
workspace/
├── bash_events/
├── conversations/
└── project/
```

这说明远程 workspace 不是“虚拟文件系统”，而是对应 server 端真实目录与状态。

## 七、多 Docker Sandbox 模式

Agent Canvas README 描述第三种运行方式：每个新 conversation 在自己的 Docker container 中运行，拥有独立 Agent Server 与工具。

关键说明：

- Canvas 与外层 Agent Server 运行在 host 上
- conversation requests 被路由到各容器
- workspace 文件与 conversation history 在容器替换后继续存在
- 使用相同 host workspace 的 conversations 仍共享文件，应使用不同目录或 worktree

启动方式：

```bash
OH_CONVERSATION_RUNTIME=docker agent-canvas
```

## 八、运行模式对照

| 模式 | 安装 | 隔离 | 适用场景 |
| --- | --- | --- | --- |
| Local | `openhands-sdk` + `openhands-tools` | 无额外隔离 | 原型、可信任务 |
| Docker | + `openhands-workspace` | 容器 | 本地安全执行、单用户 |
| Remote Server | + `openhands-agent-server` | 取决于 server 环境 | 多用户、Web 应用 |
| 多 Sandbox | Canvas 编排 | 每会话容器 | 并发任务 |

## 九、常见错误

1. 在本地模式运行不可信仓库代码。
2. 认为 DockerWorkspace 与 RemoteAPIWorkspace 是同一个东西。
3. 多个 conversation 共用同一个 workspace 目录且没有 worktree。
4. 忽略 server 端 `workspace/` 目录的磁盘与权限要求。

## 十、设计取舍与启发

Workspace 抽象把“在哪执行”变成配置项。要做好这类抽象，关键是：

- 接口只包含环境无关操作
- 实现负责环境差异
- 事件记录环境标识，便于排查

## 十一、本文总结

Local、Docker、Remote 不是三种 Agent，而是三种 workspace 实现。换环境不换 Agent，是 OpenHands SDK 最重要的工程结论之一。

## 十二、延伸阅读

- [Sandbox 安全模型](#/article/workspace/06-sandbox-security-model)
- [Agent Server 部署](#/article/architecture/05-agent-server-architecture)
- [交互实验室：Sandbox Explorer](#/labs?lab=sandbox)

---
title: "Workspace 为什么需要独立抽象？"
description: "从路径、权限、文件系统、命令执行与多用户隔离出发，解释 Workspace 抽象是 Coding Agent 的基础设施而非附加功能。"
category: workspace
order: 1
updated: 2026-11-25
diagram: /diagrams/workspace.svg
tags: [Workspace, 抽象, 隔离, 工程化]
---

## 本文学习目标

- 说清 Workspace 抽象解决的具体问题。
- 理解为什么工具不应直接访问全局文件系统。
- 知道官方 SDK 中 Workspace 的类型分层。

## 一、问题：Agent 的“当前目录”是什么

human 开发者知道自己在哪个项目里工作，但 Agent 面对的是 API 请求。如果没有 Workspace 抽象，工具只能依赖进程当前工作目录 `os.getcwd()`，这会带来：

- 多 conversation 之间共享同一目录，互相修改文件
- 无法把任务放到独立容器
- 远程调用时不知道文件归属
- 权限判断散落在每个工具里

OpenHands SDK README 的 Quick Start 示例用 `cwd = os.getcwd()` 构造 `Conversation(agent=agent, workspace=cwd)`。这说明 workspace 是 Conversation 的显式组成部分，而不是工具的隐式全局状态。

## 二、Workspace 抽象的四个职责

### 1. 定义工作根目录

所有相对路径都基于 workspace 根目录解析。这样工具不需要知道宿主机绝对路径。

### 2. 提供文件与命令能力

Workspace 承载文件读写、命令执行、git diff 等能力。Agent Server API 中的 `/api/file/*`、`/api/bash/*`、`/api/git/*` 正是围绕这些能力。

### 3. 隔离执行环境

同一份 Agent 代码可以运行在不同环境：

- `LocalWorkspace`：宿主机当前进程
- `DockerWorkspace`：容器
- `RemoteAPIWorkspace`：通过 HTTP 连接远程 server

官方给出的结论是：只需替换 workspace 类型，同一 Agent 代码即可在本地与生产模式运行。

### 4. 承载安全边界

Workspace 决定 Agent 能看到哪些文件、能访问哪些网络。它和 Security 组件配合，把“能不能做”从“模型想不想做”中分离出来。

## 三、为什么不是“给工具传一个路径”这么简单

如果只是给每个工具传路径字符串：

- 每个工具都要重复实现越界检查
- 事件里无法统一记录环境信息
- 无法支持远程执行
- 多租户场景下无法隔离

Workspace 把这些关注点收敛到一个对象里，让工具只面对统一接口。

## 四、官方类型分层

官方 SDK 架构文档列出：

- `openhands.sdk` 提供 `Workspace`、`LocalWorkspace`、`RemoteWorkspace`
- `openhands.workspace` 提供 `DockerWorkspace`、`RemoteAPIWorkspace`

其中：

- `LocalWorkspace` 包含在 SDK 中，无需额外安装
- `DockerWorkspace` 会启动带 server 的容器
- `RemoteAPIWorkspace` 通过 HTTP 连接 server
- `RemoteWorkspace` 可在容器中自动启动 agent-server

## 五、两种部署模式

本地开发：

```bash
pip install openhands-sdk openhands-tools
```

生产/沙箱：

```bash
pip install openhands-sdk openhands-tools openhands-workspace openhands-agent-server
```

官方强调同一份 agent 代码可在两种模式工作。这是 Workspace 抽象价值的直接证明。

## 六、与 Sandbox 的关系

Workspace 是**抽象**，Sandbox 是**执行环境实现**。Container 属于 sandbox 的一种常见形态。

- Workspace 回答：“工具看到的文件与命令在哪里？”
- Sandbox 回答：“这个环境的隔离强度如何？”

很多文章把两者混用，导致读者以为“用了 Docker 就等于有了 Workspace 抽象”。实际上，Docker 只是 Workspace 的一种后端。

## 七、Agent Canvas 为何不提供 Workspace

Canvas 架构文档明确说它不提供 sandbox 或 workspace 隔离层。原因是 Canvas 只负责 UI 与后端选择；真正的隔离由 Agent Server 所在环境与 workspace 实现提供。

这条边界防止了前端直接持有文件系统权限。

## 八、常见错误

1. 用 `os.getcwd()` 作为所有 conversation 的共享 workspace。
2. 在工具里硬编码绝对路径。
3. 把 workspace 权限交给模型 prompt 控制。
4. 认为远程 workspace 只是把文件路径换成 URL。

## 九、对自己开发 Agent 的启发

实现自己的 Agent 时，建议第一步就定义 Workspace 接口：

```ts
interface Workspace {
  root: string;
  readText(path: string): Promise<string>;
  writeText(path: string, content: string): Promise<void>;
  run(command: string, opts?: { timeout?: number }): Promise<Result>;
}
```

然后所有工具都只依赖这个接口。以后要加 Docker、远程或内存实现，只需新增一个实现类。

## 十、本文总结

Workspace 是 Coding Agent 的执行地基。它把路径、文件、命令、隔离与权限收敛到一个可替换抽象中，是 Agent 从 Demo 走向多用户系统的前提。

## 十一、延伸阅读

- [Workspace 架构](#/article/workspace/02-workspace-architecture)
- [Sandbox 安全模型](#/article/workspace/06-sandbox-security-model)
- 官方文档：<https://docs.openhands.dev/sdk/arch/overview>

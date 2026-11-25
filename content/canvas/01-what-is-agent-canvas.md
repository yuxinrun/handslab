---
title: "Agent Canvas 是什么？"
description: "从用户视角解释 Agent Canvas：自托管控制中心、多 agent 支持、多后端切换与自动化入口，并说明它与 SDK 的边界。"
category: canvas
order: 1
updated: 2026-11-25
diagram: /diagrams/agent-canvas.svg
tags: [Agent Canvas, 控制中心, ACP, 自托管]
---

## 本文学习目标

- 说清 Agent Canvas 是什么、不是什么。
- 理解它可以接入哪些 agent 与 backend。
- 知道本地、远程、云端模式的入口差异。

## 一、定义

Agent Canvas 是当前 `OpenHands/OpenHands` 仓库的主体。官方 README 的标题和副标题直接给出定义：

> AGENT CANVAS — The self-hosted developer control center for coding agents and automations.

它把 coding agents 变成自托管的、常驻的工程团队。典型任务包括：

- 生成报告并发布到 Slack
- 把 GitHub issues 拆解为任务
- 通过 Slack、GitHub、Linear、Notion 编排自动化工作流

## 二、它支持哪些 agent

README 明确列出开箱支持：

- 开源 OpenHands agent
- Claude Code
- Codex
- Gemini CLI
- Pi
- OpenCode
- 任何 ACP-compatible agent

这说明 Canvas 是**agent 无关的控制台**。它不绑定某个 agent 实现，而是通过协议与后端连接。

## 三、它支持哪些 backend

README 给出的 backend 类型：

- Docker containers
- VMs
- 公司内部基础设施
- OpenHands Cloud
- OpenHands Enterprise infrastructure

官方强调可以在本地、远程与云端 agents 之间切换，而不丢失工作焦点。

## 四、核心能力

| 能力 | 说明 |
| --- | --- |
| Self-host your way | 本地、Docker、VM 或任意可运行 agent server backend 的地方 |
| Switch backends | 在多 Agent Server 之间切换 |
| Create automations | 定时或 webhook 触发，集成 Slack/GitHub/Linear |
| Bring your own model | 通过 LLM profiles 使用任意 LLM |
| Use with any agent | OpenHands 或任意 ACP agent |

## 五、快速开始方式

README 给出四种方式。

### 方式 1：不带 Sandbox

```bash
npm install -g @openhands/agent-canvas
agent-canvas
```

可拆分运行：

```bash
agent-canvas --frontend-only
agent-canvas --backend-only
```

**警告**：agent-server 直接运行在安装机器上，Agent 拥有完整文件系统访问权。

### 方式 2：Docker Sandbox

```bash
export PROJECTS_PATH="$HOME/projects"
mkdir -p "$PROJECTS_PATH"
docker run -it --rm \
  -p 127.0.0.1:8000:8000 \
  -e AGENT_CANVAS_ALLOW_LAN_SESSION_KEY=true \
  -v openhands-state:/home/openhands/.openhands \
  -v "${PROJECTS_PATH}:/projects" \
  ghcr.io/openhands/agent-canvas:1.45.0
```

访问 `http://localhost:8000/canvas`。

### 方式 3：多个 Docker Sandbox

```bash
OH_CONVERSATION_RUNTIME=docker agent-canvas
```

每个新 conversation 在独立容器运行。

### 方式 4：从源码

```bash
git clone https://github.com/OpenHands/OpenHands.git
cd OpenHands
npm ci
npm run dev
```

访问 `http://localhost:8000`。

## 六、UI 与安全差异

- npm/source 启动：访问 `http://localhost:8000`
- Docker 镜像：访问 `http://localhost:8000/canvas`
- 本地 listener 默认绑定 `127.0.0.1`
- `--host 0.0.0.0` 或 `OH_BIND_HOST` 会监听所有接口，此时不注入 session key
- Docker 默认不注入 session key；quickstart 显式设置 `AGENT_CANVAS_ALLOW_LAN_SESSION_KEY=true`

## 七、Canvas 与 SDK 的边界

Canvas 负责：

- UI、状态、后端选择
- 把 UI 操作转换为 Agent Server API 调用
- 打包 standalone app 与 library entrypoints

Canvas 不负责：

- 执行 Agent 动作
- 提供 sandbox/workspace 隔离
- 托管 LLM provider credentials（配置好的后端之外）
- 无 automation backend 时运行定时任务

真正的执行来自 Agent Server 与 SDK；调度来自 Automation；扩展来自 Extensions。

## 八、常见错误

1. 把 Canvas 当成 OpenHands 的全部。
2. 认为 Canvas 只能运行 OpenHands agent。
3. 在公网暴露带自动注入 session key 的 Docker 实例。
4. 把 Docker quickstart 的权限命令当成无风险操作。

## 九、设计取舍与启发

Canvas 的设计把“控制中心”做成独立产品层，可以像 IDE 一样被嵌入，也可以独立部署。这让用户能在同一个界面里管理多种 agent 与多个执行环境，是平台化架构的典型做法。

## 十、本文总结

Agent Canvas 是 OpenHands 的用户入口与控制中心。它连接 agent、backend、automation 和扩展，但不自己执行 Agent。

## 十一、延伸阅读

- [Agent Canvas 架构](#/article/architecture/03-agent-canvas)
- [Automation 架构](#/article/automation/01-automation-architecture)
- 官方 README：<https://github.com/OpenHands/OpenHands>

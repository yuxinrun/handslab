---
title: "Agent Server 架构"
description: "讲解 openhands-agent-server 的设计目标、API 分组、鉴权模型、会话生命周期与部署要求。"
category: architecture
order: 5
updated: 2026-11-25
diagram: /diagrams/agent-server.svg
tags: [Agent Server, FastAPI, REST, WebSocket, 鉴权]
---

## 本文学习目标

- 说明 Agent Server 在 OpenHands 中的工程价值。
- 记住主要 API 分组与鉴权变量。
- 能列出安全的部署检查项。

## 一、设计目标

官方 `docs.openhands.dev/sdk/arch/agent-server` 说明：`openhands-agent-server` 把 Software Agent SDK 运行在 HTTP 与 WebSocket API 后面。

使用场景：当另一个服务（例如 Agent Canvas backend）需要启动 conversations、stream events、在 workspace 中执行文件或命令操作，但不想把 SDK 直接嵌入同一进程时。

它提供：

- 客户端可通过 HTTP/WebSocket 访问的后端进程
- 长期运行的 conversation 与 workspace 文件服务
- 可用 session API key 保护的 server API
- 应用后端与 agent runtime 之间的清晰边界

启动模块：`python -m openhands.agent_server`。

## 二、服务信息端点

官方列出的基础端点：

| 端点 | 作用 |
| --- | --- |
| `GET /alive` | Alive 检查 |
| `GET /health` | 基础健康检查 |
| `GET /ready` | 启动初始化后的就绪检查 |
| `GET /server_info` | 版本、uptime 与可用工具信息 |
| `GET /docs` | 交互式 OpenAPI 文档 |

Canvas 还使用 `/server_info.runtime_services` 获取运行时服务信息，并在新会话中作为 agent context suffix 注入。

## 三、API 分组

官方 API Reference 中的端点分组如下（保留官方命名）。

### Events

- `GET /api/conversations/{conversation_id}/events/search`
- `GET /api/conversations/{conversation_id}/events/count`
- `GET /api/conversations/{conversation_id}/events/{event_id}`
- `GET /api/conversations/{conversation_id}/events`
- `POST /api/conversations/{conversation_id}/events`
- `POST /api/conversations/{conversation_id}/events/respond_to_confirmation`

### Conversations

- `GET /api/conversations/search`
- `GET /api/conversations/count`
- `GET /api/conversations/{conversation_id}`
- `DELETE /api/conversations/{conversation_id}`
- `PATCH /api/conversations/{conversation_id}`
- `GET /api/conversations`
- `POST /api/conversations`
- `POST /api/conversations/{conversation_id}/pause`
- `POST /api/conversations/{conversation_id}/run`
- `POST /api/conversations/{conversation_id}/secrets`
- `POST /api/conversations/{conversation_id}/confirmation_policy`
- `POST /api/conversations/{conversation_id}/security_analyzer`
- `POST /api/conversations/{conversation_id}/generate_title`
- `POST /api/conversations/{conversation_id}/ask_agent`
- `POST /api/conversations/{conversation_id}/condense`

### Tools / Bash / Git / Files

- `GET /api/tools/`
- `POST /api/bash/start_bash_command`
- `POST /api/bash/execute_bash_command`
- `GET /api/bash/bash_events/search`
- `GET /api/bash/bash_events/{event_id}`
- `GET /api/git/changes/{path}`
- `GET /api/git/diff/{path}`
- `POST /api/file/upload/{path}`
- `GET /api/file/download/{path}`
- `GET /api/file/download-trajectory/{conversation_id}`

### Skills / Hooks / VSCode / Desktop

- `POST /api/skills`
- `POST /api/skills/sync`
- `POST /api/hooks`
- `GET /api/vscode/url`、`GET /api/vscode/status`
- `GET /api/desktop/url`

此外官方列出 OpenAI 兼容端点：`/v1/chat/completions` 与 `/v1/responses`。

> **核验边界**：上述路径来自官方文档 API Reference。WebSocket 的具体路由与订阅协议文档未给出，本站不臆测，标注“待核实”。

## 四、鉴权模型

官方明确：**Agent Server 默认无 API 鉴权**。如果要暴露给另一个进程、容器、主机或用户，必须至少设置一个 session API key。

关键变量：

| 名称 | 用途 |
| --- | --- |
| `OH_SESSION_API_KEYS_0` | 第一个 session API key |
| `OH_SESSION_API_KEYS_1` | 用于 key rotation 的额外 key |
| `SESSION_API_KEY` | legacy alias |
| `X-Session-API-Key` | 客户端请求头 |
| `OH_SECRET_KEY` | 加密 conversation 中保存的敏感值，含 LLM API keys 与 secrets |
| `OH_ALLOW_CORS_ORIGINS_0` | 浏览器直接调用时允许的 origin |

规则：

- 设置 key 后，`/api/*` 请求需要携带 `X-Session-API-Key`。
- `OH_SECRET_KEY` 必须跨重启保持稳定；改变后旧加密值无法恢复。
- CORS 只在浏览器客户端必须直连时配置。

官方警告原文要点：不要把未鉴权的 Agent Server 暴露到公网，因为它可以在配置的 workspace 中执行命令、读写文件。

## 五、会话生命周期（官方 Python 示例）

官方文档给出的连接示例包含以下步骤：

```python
llm = LLM(
    model=os.environ.get("LLM_MODEL", "anthropic/claude-sonnet-4-5-20250929"),
    api_key=SecretStr(os.environ["LLM_API_KEY"]),
)
agent = get_default_agent(llm=llm, cli_mode=True)
workspace = Workspace(
    host="http://127.0.0.1:8000",
    api_key=os.environ["OH_SESSION_API_KEYS_0"],
    working_dir="workspace/project",
)
conversation = Conversation(agent=agent, workspace=workspace)
conversation.send_message("...")
conversation.run()
conversation.close()
```

对应 REST 生命周期：

```text
POST /api/conversations              → 创建
POST /api/conversations/{id}/events  → 发消息
POST /api/conversations/{id}/run     → 运行
POST /api/conversations/{id}/pause   → 暂停
GET  /api/conversations/{id}         → 查询
DELETE /api/conversations/{id}       → 删除
```

## 六、运行时文件

默认存储位置是相对于 server 进程工作目录的 `workspace/`：

```text
workspace/
├── bash_events/
├── conversations/
└── project/
```

文档要求该目录有足够磁盘空间，并且权限与 Agent 应访问的文件匹配。

## 七、部署检查清单

- 设置 `OH_SESSION_API_KEYS_0` 与稳定的 `OH_SECRET_KEY`
- 绑定到可达接口（如 `--host 0.0.0.0`）并置于 TLS、私有网络或可信反向代理后
- 用防火墙限制访问来源
- 只在必要时配置 CORS
- 不在公网暴露无鉴权实例
- 定期检查 `/health`、`/ready`、`/server_info`
- 限制 workspace 目录范围

## 八、故障排查

| 现象 | 官方建议 |
| --- | --- |
| 401 | 发送 `X-Session-API-Key`，值为某个 `OH_SESSION_API_KEYS_*` |
| Secrets 重启后消失 | 设置稳定的 `OH_SECRET_KEY` |
| 端口占用 | 使用 `--port` 更换 |
| 浏览器 CORS 错误 | 配置 `OH_ALLOW_CORS_ORIGINS_0` |
| 其他主机无法访问 | 检查 `--host`、防火墙、反向代理与 TLS |

## 九、常见错误

1. 认为 Agent Server 自带安全默认值。默认无鉴权。
2. 把 `OH_SECRET_KEY` 当成 API key。前者用于加密存储，后者用于请求鉴权。
3. 猜测 WebSocket 路径。应查源码或 OpenAPI。
4. 把 Agent Server 与 Automation Server 混为一谈。

## 十、本文总结

Agent Server 是 OpenHands 的服务化边界：它让 Agent 能力可以通过 HTTP/WebSocket 被多客户端使用，但前提是正确配置鉴权与网络边界。

## 十一、延伸阅读

- [REST API 实战](#/article/server/03-rest-api)
- [Conversation 与事件系统](#/article/events/05-event-system)
- 官方文档：<https://docs.openhands.dev/sdk/arch/agent-server>

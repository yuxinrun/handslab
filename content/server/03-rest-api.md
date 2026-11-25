---
title: "Agent Server REST API 实战"
description: "按官方 API Reference 整理 conversation、event、file、bash 与工具端点，并给出鉴权调用示例和排查步骤。"
category: server
order: 3
updated: 2026-11-25
diagram: /diagrams/rest-websocket.svg
tags: [REST API, Agent Server, 鉴权, WebSocket]
---

## 本文学习目标

- 按类别记住官方 Agent Server API 路径。
- 用正确的请求头调用受保护端点。
- 理解 REST 与 WebSocket 的职责分工。

> **安全提醒**：下列命令会访问本地或远程 Agent Server。请勿对未鉴权实例执行写操作；示例中的 key 与地址仅是占位符。

## 一、基础端点

官方 API Reference 的 Server Details 部分：

```text
GET /alive
GET /health
GET /ready
GET /server_info
GET /
GET /docs
```

`/docs` 是交互式 OpenAPI 文档，实际使用时优先以它为准。

检查服务状态：

```bash
curl http://127.0.0.1:8000/health
curl http://127.0.0.1:8000/server_info
```

## 二、鉴权

如果服务端配置了 session API key，客户端必须发送：

```text
X-Session-API-Key: <OH_SESSION_API_KEYS_0 的值>
```

示例：

```bash
curl -H "X-Session-API-Key: $OH_SESSION_API_KEYS_0" \
  http://127.0.0.1:8000/api/conversations/count
```

官方排查表：401 表示需要发送 `X-Session-API-Key`，值为已配置的 `OH_SESSION_API_KEYS_*` 之一。

注意：`OH_SECRET_KEY` 不是请求头，它用于加密 conversation 中保存的敏感值。

## 三、Conversation 端点

创建：

```text
POST /api/conversations
```

发消息：

```text
POST /api/conversations/{conversation_id}/events
```

运行与暂停：

```text
POST /api/conversations/{conversation_id}/run
POST /api/conversations/{conversation_id}/pause
```

查询：

```text
GET  /api/conversations
GET  /api/conversations/search
GET  /api/conversations/count
GET  /api/conversations/{conversation_id}
```

更新与删除：

```text
PATCH  /api/conversations/{conversation_id}
DELETE /api/conversations/{conversation_id}
```

增强控制：

```text
POST /api/conversations/{id}/secrets
POST /api/conversations/{id}/confirmation_policy
POST /api/conversations/{id}/security_analyzer
POST /api/conversations/{id}/generate_title
POST /api/conversations/{id}/ask_agent
POST /api/conversations/{id}/condense
```

## 四、Event 端点

```text
GET  /api/conversations/{id}/events/search
GET  /api/conversations/{id}/events/count
GET  /api/conversations/{id}/events/{event_id}
GET  /api/conversations/{id}/events
POST /api/conversations/{id}/events
POST /api/conversations/{id}/events/respond_to_confirmation
```

注意 `POST .../events` 同时承担“发送消息”的职责。

## 五、File、Bash、Git 与 Tools

文件：

```text
POST /api/file/upload/{path}
GET  /api/file/download/{path}
GET  /api/file/download-trajectory/{conversation_id}
```

命令：

```text
POST /api/bash/start_bash_command
POST /api/bash/execute_bash_command
GET  /api/bash/bash_events/search
GET  /api/bash/bash_events/{event_id}
GET  /api/bash/bash_events/
DELETE /api/bash/bash_events
```

Git：

```text
GET /api/git/changes/{path}
GET /api/git/diff/{path}
```

工具：

```text
GET /api/tools/
```

## 六、Skills、Hooks 与桌面集成

```text
POST /api/skills
POST /api/skills/sync
POST /api/hooks
GET  /api/vscode/url
GET  /api/vscode/status
GET  /api/desktop/url
```

这些端点说明 Agent Server 不只是 conversation API，还承载扩展与编辑器集成能力。

## 七、OpenAI 兼容端点

官方文档列出：

```text
/v1/chat/completions
/v1/responses
```

这让部分现有 OpenAI 客户端可以直接接入。具体兼容范围需查源码或 OpenAPI。

## 八、REST 与 WebSocket 的分工

| 需求 | 建议通道 |
| --- | --- |
| 创建 conversation | REST |
| 发送消息 | REST |
| 上传/下载文件 | REST |
| 查询历史事件 | REST |
| 实时接收 action / observation | WebSocket |
| 实时 UI 状态更新 | WebSocket |

官方文档明确 Agent Server 暴露 HTTP 与 WebSocket API，但没有给出 WebSocket 具体路由。本站不猜测，标注“待核实”。

## 九、Python 客户端示例

官方 Agent Server 文档给出的连接代码：

```python
from pydantic import SecretStr
from openhands.sdk import LLM, Conversation, Workspace, get_default_agent

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

如果服务端没有设置 `OH_SESSION_API_KEYS_0`，应移除 `api_key` 参数。

## 十、故障排查表

| 现象 | 处理 |
| --- | --- |
| 401 | 发送 `X-Session-API-Key` |
| Secrets 重启丢失 | 设置稳定 `OH_SECRET_KEY` |
| 端口占用 | 使用 `--port` |
| 浏览器 CORS 错误 | 配置 `OH_ALLOW_CORS_ORIGINS_0` |
| 其他主机不可达 | 检查 `--host`、防火墙、反向代理、TLS |

## 十一、常见错误

1. 把 `GET /health` 当成鉴权检查。
2. 只配置 API key 不配置 `OH_SECRET_KEY`。
3. 把 Agent Server 直接暴露公网。
4. 猜测 WebSocket 路径。
5. 在 URL 中传递密钥。

## 十二、本文总结

REST 负责命令与查询，WebSocket 负责事件推送。正确使用 Agent Server API 的前提是理解鉴权模型与会话生命周期。

## 十三、延伸阅读

- [Agent Server 架构](#/article/architecture/05-agent-server-architecture)
- [REST / WebSocket 通信图](#/labs?lab=events)
- 官方 API Reference：<https://docs.openhands.dev/sdk/guides/agent-server/api-reference/server-details/alive>

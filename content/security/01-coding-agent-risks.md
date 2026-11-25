---
title: "Coding Agent 的安全风险"
description: "从威胁模型到部署检查清单，系统梳理 Coding Agent 面临的主要风险及缓解措施，并结合 OpenHands 当前架构说明。"
category: security
order: 1
updated: 2026-11-25
diagram: /diagrams/security-boundary.svg
tags: [安全, 威胁模型, Prompt Injection, 多租户]
---

## 本文学习目标

- 列出 Coding Agent 的主要威胁面。
- 理解每一层缓解措施对应哪类风险。
- 形成可复用的安全检查清单。

## 一、为什么安全是架构问题

Coding Agent 天然具备三类高权限能力：读文件、写文件、执行命令。它还可能读取不可信仓库内容并持有 API Key。因此安全不能只靠提示词，必须由架构边界保证。

## 二、威胁面清单

| 风险 | 场景 | 后果 |
| --- | --- | --- |
| 任意命令执行 | Agent 生成恶意或错误命令 | 宿主机被破坏 |
| 路径越界 | `../../` 访问工作目录外文件 | 敏感文件泄漏 |
| 网络外泄 | curl 上传源码/密钥 | 数据泄漏 |
| Prompt Injection | README/Issue 中嵌入指令 | 诱导 Agent 做危险操作 |
| 恶意仓库内容 | install 脚本、Makefile、测试钩子 | 执行恶意代码 |
| 凭据泄漏 | Key 写入日志、事件或仓库 | 账号被滥用 |
| 多租户串扰 | 会话共享 workspace | 互相修改代码 |
| 供应链依赖 | 恶意依赖包 | 构建环境被污染 |

## 三、分层缓解

### 1. 宿主机层

官方 README 明确警告：不带 sandbox 的模式让 Agent 对文件系统有完整访问权。结论：不可信任务不要使用宿主机模式。

### 2. Workspace 层

- 每个任务限定根目录
- 最小挂载范围
- 每会话独立目录或 worktree
- 状态卷与 workspace 分离

### 3. 容器层

- 使用官方 Docker 镜像
- 注意 uid 10001 权限
- 不挂载家目录
- 配置 `/alive` 与 restart policy

### 4. 命令与工具层

- Schema 校验
- Security 执行前风险评估
- 超时与输出截断
- 确认策略与人工审批

Agent Server 提供 confirmation policy 与 respond_to_confirmation 端点。

### 5. 服务层

- `OH_SESSION_API_KEYS_*` 鉴权
- `X-Session-API-Key` 请求头
- `OH_SECRET_KEY` 加密敏感值
- TLS / 私有网络 / 防火墙
- 限制 CORS origin

### 6. 事件与审计层

- 记录 action、observation、state update
- 持久化 conversation 轨迹
- Automation run history
- 定期审计异常调用

## 四、Prompt Injection 专题

Prompt Injection 的特殊性在于：输入不是用户直接给出的，而是 Agent 主动从仓库、网页、Issue 中读取的。

缓解原则：

1. 把外部内容视为数据，不是指令。
2. 关键操作（发网络请求、改 secrets、合并 PR）需要确认。
3. 不在 Agent 可读环境中放置生产密钥。
4. 对事件轨迹保留来源标记。

本文不声称 OpenHands 提供某个具体反注入机制；具体策略需核实源码。

## 五、恶意仓库内容

典型载体：

- `package.json` 的 install/postinstall 脚本
- `Makefile` 目标
- 测试框架的启动钩子
- `.devcontainer` 配置
- CI 配置文件

建议：在容器中运行安装与测试；限制网络；对依赖变更做审查；不要在宿主机执行不可信仓库脚本。

## 六、API Key 与 Secret

官方变量：

- `OH_SESSION_API_KEYS_*`：请求鉴权
- `OH_SECRET_KEY`：加密 conversation 中的敏感值
- `X-Session-API-Key`：客户端请求头

要求：

- `OH_SECRET_KEY` 跨重启稳定
- Key 不写入事件、日志或仓库
- Canvas 公网部署时不要注入 session key 到 HTML

## 七、多租户隔离

 checklist：

- 每用户/组织独立 conversation
- 每会话独立 workspace 目录或容器
- Agent Server 位于私有网络后
- 按用户签发 session API key
- 事件查询按 conversation 授权

## 八、人工审批

适合审批的操作：

- 删除文件
- force push
- 发布到外部系统
- 修改 secrets
- 安装新依赖

Agent Server 的 confirmation policy 端点为这类控制提供了基础。

## 九、部署检查清单

```text
[ ] 不可信任务只在沙箱中运行
[ ] workspace 最小挂载
[ ] 每会话独立目录/容器
[ ] 配置 OH_SESSION_API_KEYS_0
[ ] 配置稳定 OH_SECRET_KEY
[ ] 不暴露未鉴权 Agent Server
[ ] TLS / 私有网络 / 防火墙
[ ] 限制网络出口
[ ] 启用确认策略
[ ] 事件与运行历史可审计
[ ] 密钥不出现在日志与事件中
```

## 十、常见错误

1. 认为模型“看起来很乖”就等于安全。
2. 把 Docker 当成万能边界，忽略挂载范围。
3. 在共享 workspace 并发运行多个 Agent。
4. 把 secret 放进环境变量后让 Agent 任意读取。

## 十一、本文总结

Coding Agent 安全需要多层防御：执行隔离、最小权限、鉴权、审批、审计。OpenHands 提供了对应组件，但正确配置仍是使用者责任。

## 十二、延伸阅读

- [Sandbox 安全模型](#/article/workspace/06-sandbox-security-model)
- [Agent Server 鉴权](#/article/architecture/05-agent-server-architecture)
- [交互实验室：Sandbox Explorer](#/labs?lab=sandbox)

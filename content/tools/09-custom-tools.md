---
title: "自定义工具开发"
description: "用一个完整的教学示例实现一个受限文件读取工具，覆盖 Schema、路径校验、Observation 与事件记录。"
category: tools
order: 9
updated: 2026-11-25
diagram: /diagrams/tool-system.svg
tags: [自定义工具, Schema, 文件读取, 教学实现]
---

## 本文学习目标

- 按 Action / Observation 契约实现一个工具。
- 加入路径越界防护与稳定错误格式。
- 明确教学实现与官方 SDK 工具的差异。

> **声明**：本文代码是**教学实现**，用于理解工具契约，不是 OpenHands 官方源码，也不声称与官方工具 API 一致。

## 一、需求

实现一个 `read_file` 工具：

- 输入：相对路径
- 输出：文件内容或结构化错误
- 约束：只能读取 workspace 根目录内的文件
- 事件：记录请求与结果

## 二、目录结构（教学项目）

```text
mini-agent/
├── tools/
│   └── read-file.ts
├── workspace.ts
└── events.ts
```

## 三、Workspace 接口

```ts
// workspace.ts —— 教学实现
import path from 'node:path';
import { readFile } from 'node:fs/promises';

export class Workspace {
  constructor(public readonly root: string) {}

  resolve(relative: string): string {
    const target = path.resolve(this.root, relative);
    const root = path.resolve(this.root);
    if (!target.startsWith(root + path.sep) && target !== root) {
      throw new Error('PATH_OUT_OF_WORKSPACE');
    }
    return target;
  }

  async readText(relative: string): Promise<string> {
    return readFile(this.resolve(relative), 'utf8');
  }
}
```

关键点：`path.resolve` 后再比较前缀，避免 `../` 绕过。

## 四、Action 与 Observation 类型

```ts
// events.ts —— 教学实现
export interface ReadFileAction {
  kind: 'action';
  tool: 'read_file';
  callId: string;
  arguments: { path: string };
}

export interface Observation {
  callId: string;
  tool: string;
  status: 'success' | 'recoverable_error' | 'fatal_error';
  content: string;
  metadata?: { bytes?: number; truncated?: boolean };
}

export class EventLog {
  readonly items: string[] = [];
  push(event: string): void { this.items.push(event); }
}
```

## 五、工具实现

```ts
// tools/read-file.ts —— 教学实现
import type { ReadFileAction, Observation } from '../events';
import type { Workspace } from '../workspace';
import { EventLog } from '../events';

const MAX_BYTES = 8000;

export async function readFileTool(
  action: ReadFileAction,
  workspace: Workspace,
  events: EventLog,
): Promise<Observation> {
  events.push(`ActionRequested:${action.tool}:${action.callId}`);

  const input = action.arguments?.path;
  if (typeof input !== 'string' || input.length === 0) {
    return fail(action, 'INVALID_ARGUMENT', 'recoverable_error', events);
  }

  try {
    const text = await workspace.readText(input);
    const truncated = Buffer.byteLength(text, 'utf8') > MAX_BYTES;
    const content = truncated ? text.slice(0, MAX_BYTES) : text;
    events.push(`ActionCompleted:${action.callId}`);
    return {
      callId: action.callId,
      tool: action.tool,
      status: 'success',
      content,
      metadata: { bytes: Buffer.byteLength(content, 'utf8'), truncated },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const fatal = message === 'PATH_OUT_OF_WORKSPACE';
    return fail(action, message, fatal ? 'fatal_error' : 'recoverable_error', events);
  }
}

function fail(
  action: ReadFileAction,
  message: string,
  status: Observation['status'],
  events: EventLog,
): Observation {
  events.push(`ActionFailed:${action.callId}:${status}`);
  return { callId: action.callId, tool: action.tool, status, content: message };
}
```

## 六、运行方法

在项目根目录准备一个测试文件：

```bash
mkdir -p demo && printf 'hello handslab\n' > demo/notes.txt
```

然后用一个临时脚本调用：

```ts
// 教学调用示例
import { Workspace } from './workspace';
import { EventLog } from './events';
import { readFileTool } from './tools/read-file';

const workspace = new Workspace('./demo');
const events = new EventLog();
const result = await readFileTool({
  kind: 'action',
  tool: 'read_file',
  callId: 'call-1',
  arguments: { path: 'notes.txt' },
}, workspace, events);

console.log(result);
console.log(events.items);
```

## 七、预期输出

```text
{
  callId: 'call-1',
  tool: 'read_file',
  status: 'success',
  content: 'hello handslab\n',
  metadata: { bytes: 15, truncated: false }
}
[ 'ActionRequested:read_file:call-1', 'ActionCompleted:call-1' ]
```

如果传入 `../package.json`，预期返回：

```text
{ status: 'fatal_error', content: 'PATH_OUT_OF_WORKSPACE', ... }
```

## 八、常见错误

1. 只做字符串前缀判断，没有用 `path.resolve`，导致 `..` 绕过。
2. 抛出原始异常，破坏 Observation 结构。
3. 不截断大文件，导致上下文被占满。
4. 不记录 callId，无法把结果对齐到请求。

## 九、与官方实现的区别

| 维度 | 本文教学实现 | OpenHands SDK 官方工具 |
| --- | --- | --- |
| 类型系统 | TypeScript 接口 | Pydantic 强类型模型 |
| Schema | 手写约定 | 工具系统内建 |
| 安全 | 手写路径检查 | Security 组件执行前评估 |
| 事件 | 简单字符串数组 | 类型化 Events 框架 |
| 执行环境 | 直接 Node fs | workspace 配置的 local/container/remote |

## 十、设计取舍与启发

自定义工具的重点不是“能读文件”，而是：

- 把参数校验做成可复用逻辑
- 把失败转成稳定 Observation
- 把每次调用变成可观测事件
- 把路径权限交给 workspace 抽象

做到这四点，工具就能安全地被 LLM 循环调用。

## 十一、本文总结

一个可靠的工具 = 契约 + 校验 + 隔离 + 事件。少任何一项，都会让 Agent 在长任务中失控。

## 十二、延伸阅读

- [Tool System 设计](#/article/tools/01-tool-system-design)
- [Workspace 架构](#/article/workspace/02-workspace-architecture)
- [Mini Coding Agent](#/article/practice/01-mini-coding-agent)

---
title: "从零实现 Mini Coding Agent"
description: "用 TypeScript 实现一个教学版 Coding Agent：Agent Loop、Shell/文件工具、Action/Observation、工作目录隔离与事件记录。"
category: practice
order: 1
updated: 2026-11-25
diagram: /diagrams/mini-agent.svg
tags: [实战, Mini Agent, TypeScript, Agent Loop]
---

## 本文学习目标

- 用最少依赖实现一个可运行的 Agent 循环。
- 理解工具、workspace 与事件如何协作。
- 明确教学实现与 OpenHands 官方 SDK 的差距。

> **声明**：本文所有代码都是**教学实现**，不是 OpenHands 官方源码。它用于理解机制，不追求功能完整或生产安全。

## 一、架构

```text
CLI 输入 → Loop → LLM（教学 mock）→ Tools → Workspace
                ↑                       ↓
                └──── Observation ──────┘
```

文件结构：

```text
mini-agent/
├── package.json
├── tsconfig.json
└── src/
    ├── main.ts
    ├── types.ts
    ├── workspace.ts
    ├── tools.ts
    ├── llm.ts
    └── events.ts
```

## 二、依赖

```json
{
  "name": "mini-coding-agent",
  "type": "module",
  "scripts": { "dev": "tsx src/main.ts" },
  "devDependencies": { "tsx": "^4.19.0", "typescript": "^5.7.0", "@types/node": "^22.0.0" }
}
```

运行：

```bash
npm install
npx tsx src/main.ts "在 demo 目录创建 NOTES.md 并写入一句话"
```

## 三、类型定义

```ts
// src/types.ts
export type Action =
  | { kind: 'action'; callId: string; tool: 'read_file' | 'write_file' | 'execute_command'; args: Record<string, string> }
  | { kind: 'final'; answer: string };

export interface Observation {
  callId: string;
  status: 'success' | 'recoverable_error' | 'fatal_error';
  content: string;
  meta?: { exitCode?: number; truncated?: boolean };
}
```

## 四、事件记录

```ts
// src/events.ts
export class EventLog {
  readonly items: string[] = [];
  push(type: string, payload: unknown): void {
    this.items.push(JSON.stringify({ type, payload, at: new Date().toISOString() }));
  }
  dump(): void { this.items.forEach((e) => console.log(e)); }
}
```

## 五、Workspace 隔离

```ts
// src/workspace.ts
import path from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);

export class Workspace {
  constructor(public readonly root: string) {}

  resolve(p: string): string {
    const target = path.resolve(this.root, p);
    const root = path.resolve(this.root);
    if (!target.startsWith(root + path.sep) && target !== root) {
      throw new Error('PATH_OUT_OF_WORKSPACE');
    }
    return target;
  }

  async read(p: string): Promise<string> { return readFile(this.resolve(p), 'utf8'); }

  async write(p: string, content: string): Promise<void> {
    const target = this.resolve(p);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content, 'utf8');
  }

  async run(command: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
    return exec(command, args, { cwd: this.root, timeout: 15_000, maxBuffer: 1024 * 1024 });
  }
}
```

## 六、工具执行器

```ts
// src/tools.ts
import type { Action, Observation } from './types';
import type { Workspace } from './workspace';
import { EventLog } from './events';

export async function execute(action: Extract<Action, { kind: 'action' }>, ws: Workspace, events: EventLog): Promise<Observation> {
  events.push('ActionStarted', { tool: action.tool, callId: action.callId });
  try {
    if (action.tool === 'read_file') {
      const text = await ws.read(action.args.path);
      return ok(action.callId, text.slice(0, 8000), { truncated: text.length > 8000 });
    }
    if (action.tool === 'write_file') {
      await ws.write(action.args.path, action.args.content);
      return ok(action.callId, `written ${action.args.content.length} chars`);
    }
    if (action.tool === 'execute_command') {
      const [cmd, ...args] = action.args.command.split(/\s+/);
      const r = await ws.run(cmd, args);
      const content = `${r.stdout}\n${r.stderr}`.trim();
      return ok(action.callId, content || '(no output)');
    }
    return fail(action.callId, 'UNKNOWN_TOOL', 'fatal_error');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return fail(action.callId, message, message === 'PATH_OUT_OF_WORKSPACE' ? 'fatal_error' : 'recoverable_error');
  }
}

function ok(callId: string, content: string, meta?: Observation['meta']): Observation {
  return { callId, status: 'success', content, meta };
}
function fail(callId: string, content: string, status: Observation['status']): Observation {
  return { callId, status, content };
}
```

## 七、教学用 LLM

真实 Agent 应调用 LLM API。这里用一个确定性 mock 演示循环：

```ts
// src/llm.ts
import type { Action } from './types';

export async function decide(history: string[], step: number): Promise<Action> {
  const last = history[history.length - 1];
  if (step === 0) {
    return { kind: 'action', callId: 'c1', tool: 'write_file', args: { path: 'NOTES.md', content: 'Hello from Mini Agent\n' } };
  }
  if (step === 1) {
    return { kind: 'action', callId: 'c2', tool: 'execute_command', args: { command: 'node -v' } };
  }
  return { kind: 'final', answer: `任务完成。最后观察：${last.slice(0, 120)}` };
}
```

> 这是**教学 mock**，没有真实模型。要接真实模型，只需替换 `decide` 实现，并保持 Action 契约不变。

## 八、主循环

```ts
// src/main.ts
import { EventLog } from './events';
import { Workspace } from './workspace';
import { execute } from './tools';
import { decide } from './llm';
import type { Observation } from './types';

const task = process.argv.slice(2).join(' ') || '创建一个文件并运行命令';
const ws = new Workspace('./demo');
const events = new EventLog();
events.push('ConversationStarted', { task });

const history: string[] = [`USER: ${task}`];

for (let step = 0; step < 8; step++) {
  const action = await decide(history, step);
  events.push('LLMDecision', { step });
  if (action.kind === 'final') {
    events.push('ConversationFinished', { answer: action.answer });
    console.log('\n最终答案：', action.answer);
    break;
  }
  const observation: Observation = await execute(action, ws, events);
  events.push('ObservationReceived', { callId: observation.callId, status: observation.status });
  history.push(`ACTION: ${JSON.stringify(action)}`);
  history.push(`OBSERVATION: ${observation.content}`);
  console.log(`[step ${step}] ${action.tool} -> ${observation.status}`);
  if (observation.status === 'fatal_error') {
    events.push('ConversationFailed', { reason: observation.content });
    break;
  }
}

events.dump();
```

## 九、运行与预期输出

```bash
mkdir -p demo
npx tsx src/main.ts "创建 NOTES.md 并检查 Node 版本"
```

预期输出类似：

```text
[step 0] write_file -> success
[step 1] execute_command -> success
最终答案： 任务完成。最后观察：{"callId":"c2",...}
{"type":"ConversationStarted",...}
{"type":"ActionStarted",...}
...
```

`demo/NOTES.md` 应包含 `Hello from Mini Agent`。

## 十、常见错误

1. 路径未做 `path.resolve` 前缀检查，导致越界写入。
2. 命令直接拼接字符串，产生注入风险。
3. 不限制输出长度，导致上下文膨胀。
4. fatal error 后继续循环。

## 十一、与 OpenHands 官方实现的区别

| 维度 | Mini Agent | OpenHands SDK |
| --- | --- | --- |
| LLM | 确定性 mock | provider-agnostic `LLM`，含 retry/telemetry |
| 类型 | TypeScript 接口 | Pydantic 强类型模型 |
| 工具 | 三个手写函数 | `openhands.tools` + Executor + Security |
| Workspace | 单实现 | Local / Docker / Remote 可切换 |
| 事件 | JSON 字符串数组 | 类型化 Events + 持久化 + WebSocket |
| 服务化 | 无 | Agent Server REST/WebSocket |
| 调度 | 无 | Automation 服务 |

## 十二、下一步

1. 把 `decide` 换成真实 LLM API。
2. 给命令工具加白名单。
3. 把事件写入文件，支持恢复。
4. 加一个简单 HTTP 服务暴露运行接口。
5. 把 workspace 换成容器实现。

## 十三、本文总结

Mini Agent 的价值不在于功能完整，而在于把 Agent Loop、工具契约、workspace 隔离与事件记录这四个核心机制压缩到一个可运行的程序里。理解它，再读 OpenHands SDK 会清晰很多。

## 十四、延伸阅读

- [Agent Loop 原理](#/article/agent-core/02-agent-loop)
- [自定义工具开发](#/article/tools/09-custom-tools)
- [Workspace 架构](#/article/workspace/02-workspace-architecture)

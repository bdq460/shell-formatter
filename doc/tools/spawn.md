# spawn 使用指南

## 什么是 spawn？

`spawn` 是 Node.js `child_process` 模块提供的一个函数，用于异步启动子进程。

## 基本语法

```typescript
import { spawn } from 'child_process';

const childProcess = spawn(command, args, options?);
```

| 参数      | 类型       | 说明                               | 示例                       |
| --------- | ---------- | ---------------------------------- | -------------------------- |
| `command` | `string`   | 要执行的命令                       | `'shellcheck'`             |
| `args`    | `string[]` | 命令参数数组                       | `['-f', 'gcc', 'file.sh']` |
| `options` | `Object`   | 可选配置（如工作目录、环境变量等） | `{ cwd: '/path' }`         |

### options 参数说明

| 属性       | 说明                       | 类型              |
| ---------- | -------------------------- | ----------------- |
| `cwd`      | 子进程的当前工作目录       | `string`          |
| `env`      | 环境变量键值对             | `Object`          |
| `stdio`    | 标准输入/输出/错误流的配置 | `Array \| string` |
| `detached` | 进程是否独立运行           | `boolean`         |
| `shell`    | 是否在 shell 中运行        | `boolean`         |
| `uid`      | 进程的用户 ID              | `number`          |
| `gid`      | 进程的组 ID                | `number`          |

## Node.js 中执行外部命令的方式对比

| 方法       | 用途                   | 特点                                 |
| ---------- | ---------------------- | ------------------------------------ |
| `exec`     | 执行命令并获取完整输出 | 适合输出较小的命令，有缓冲区大小限制 |
| `execFile` | 直接执行可执行文件     | 类似 exec，但不启动 shell，更安全    |
| `spawn`    | 启动子进程并获取流     | 适合输出较大的命令，实时处理数据流   |
| `fork`     | 创建 Node.js 子进程    | 专门用于 Node.js 进程通信            |

## 为什么使用 spawn？

在 Shell Formatter 插件中使用 `spawn` 有以下原因：

### 1. 流式处理输出

`shellcheck` 和 `shfmt` 的输出可能很大，`spawn` 允许实时处理数据流：

```typescript
const process = spawn("shellcheck", ["-f", "gcc", "file.sh"]);
let stdout: Buffer[] = [];
let stderr: Buffer[] = [];

// 监听标准输出流
process.stdout.on("data", (chunk) => {
  stdout.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  // 实时接收数据
});

// 监听标准错误流
process.stderr.on("data", (chunk) => {
  stderr.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
});
```

### 2. 没有缓冲区限制

`exec` 有默认的 1MB 缓冲区限制，而 `spawn` 使用流，可以处理任意大小的输出。

### 3. 可以实时监听进程事件

```typescript
// 进程结束时执行
process.on("close", (code) => {
  console.log(`进程退出，退出码: ${code}`);
});

// 进程启动失败时执行（如命令不存在）
process.on("error", (err) => {
  console.error(`进程启动失败: ${err.message}`);
});

// 进程退出时执行
process.on("exit", (code, signal) => {
  console.log(`进程退出: code=${code}, signal=${signal}`);
});
```

### 4. 支持取消操作

可以通过监听 cancellation token 来终止进程：

```typescript
import * as vscode from "vscode";

const shfmt = spawn("shfmt", args);

token?.onCancellationRequested(() => {
  console.log("用户取消操作，终止进程");
  shfmt.kill(); // 终止子进程
});
```

## spawn vs exec 对比示例

### 使用 exec（不适合大输出）

```typescript
import { exec } from "child_process";

exec("shellcheck -f gcc large-file.sh", (error, stdout, stderr) => {
  if (error) {
    console.error("执行失败:", error);
    return;
  }
  // 必须等待所有输出完成后才能处理
  // 如果输出超过缓冲区大小，会被截断
  console.log("输出:", stdout);
});
```

**缺点：**

- 必须等待所有输出完成
- 缓冲区限制（默认 1MB）
- 大文件可能被截断
- 内存占用高（保存全部输出）

### 使用 spawn（适合大输出）

```typescript
import { spawn } from "child_process";

const process = spawn("shellcheck", ["-f", "gcc", "large-file.sh"]);

let stdout = "";
let stderr = "";

// 实时接收标准输出
process.stdout.on("data", (chunk) => {
  stdout += chunk;
  // 可以在这里处理数据，不需要等待全部完成
});

// 实时接收标准错误
process.stderr.on("data", (chunk) => {
  stderr += chunk;
});

// 进程结束
process.on("close", (code) => {
  if (code === 0) {
    console.log("执行成功");
    console.log("输出:", stdout);
  } else {
    console.error("执行失败，退出码:", code);
    console.error("错误:", stderr);
  }
});

// 进程启动失败
process.on("error", (err) => {
  console.error("命令不存在或无法执行:", err.message);
});
```

**优点：**

- 实时流式处理数据
- 没有缓冲区限制
- 可以处理任意大小的输出
- 内存占用低（逐块处理）
- 支持实时取消

## spawn 事件详解

### 核心事件

| 事件         | 触发时机                   | 说明                      |
| ------------ | -------------------------- | ------------------------- |
| `close`      | 进程的 stdio 流关闭时      | 进程可能还在运行          |
| `exit`       | 进程退出时                 | 所有 stdio 流可能还没关闭 |
| `error`      | 进程无法启动时             | 如命令不存在、权限不足    |
| `message`    | 进程收到消息时             | 用于进程间通信            |
| `disconnect` | 子进程调用 disconnect() 时 | 断开 IPC 通道             |

### close vs exit

```typescript
const process = spawn("node", ["script.js"]);

// exit 先触发，进程退出
process.on("exit", (code, signal) => {
  console.log(`进程退出: code=${code}, signal=${signal}`);
});

// close 后触发，所有 stdio 流关闭
process.on("close", (code) => {
  console.log(`stdio 流关闭: code=${code}`);
});
```

## 在 Shell Formatter 插件中的实际应用

### 示例 1：使用 shellcheck 检查脚本

```typescript
import { spawn } from "child_process";
import * as path from "path";

export async function checkWithShellcheck(
  document: vscode.TextDocument,
): Promise<vscode.Diagnostic[]> {
  const fileName = path.basename(document.fileName);
  const diagnostics: vscode.Diagnostic[] = [];

  return new Promise((resolve) => {
    // 启动 shellcheck 进程
    const shellcheck = spawn("shellcheck", ["-f", "gcc", document.fileName]);
    let stdout: Buffer[] = [];
    let stderr: Buffer[] = [];

    // 监听标准输出流
    shellcheck.stdout.on("data", (chunk) => {
      stdout.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    // 监听标准错误流
    shellcheck.stderr.on("data", (chunk) => {
      stderr.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    // 监听进程结束
    shellcheck.on("close", (code) => {
      const allOutput = Buffer.concat([...stdout, ...stderr]).toString();
      if (code !== 0 && allOutput.length > 0) {
        const parsed = parseShellcheckOutput(document, allOutput);
        diagnostics.push(...parsed);
      }
      resolve(diagnostics);
    });

    // 监听错误（如 shellcheck 未安装）
    shellcheck.on("error", (err) => {
      console.error(`Shellcheck 错误: ${err.message}`);
      resolve(diagnostics);
    });
  });
}
```

### 示例 2：使用 shfmt 格式化脚本

```typescript
import { spawn } from "child_process";

export async function formatDocument(
  document: vscode.TextDocument,
  token?: vscode.CancellationToken,
): Promise<vscode.TextEdit[]> {
  const content = document.getText();

  return new Promise((resolve, reject) => {
    // 检查是否取消
    if (token?.isCancellationRequested) {
      reject(new vscode.CancellationError());
      return;
    }

    // 启动 shfmt 进程
    const shfmt = spawn("shfmt", ["-i", "2", "-bn", "-ci", "-sr"]);
    let stdout: Buffer[] = [];
    let stderr: Buffer[] = [];

    // 监听标准输出
    shfmt.stdout.on("data", (chunk) => {
      stdout.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    // 监听标准错误
    shfmt.stderr.on("data", (chunk) => {
      stderr.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    // 监听进程结束
    shfmt.on("close", (code) => {
      const stdoutStr = Buffer.concat(stdout).toString();
      const stderrStr = Buffer.concat(stderr).toString();

      if (code === 0) {
        // 格式化成功
        const fullRange = new vscode.Range(
          document.positionAt(0),
          document.positionAt(document.getText().length),
        );
        resolve([vscode.TextEdit.replace(fullRange, stdoutStr)]);
      } else {
        // 格式化失败，返回空数组
        resolve([]);
      }
    });

    // 监听错误
    shfmt.on("error", (err) => {
      reject(err);
    });

    // 将文档内容写入 stdin
    shfmt.stdin.write(content);
    shfmt.stdin.end();

    // 监听取消令牌
    token?.onCancellationRequested(() => {
      shfmt.kill(); // 终止进程
    });
  });
}
```

## 常见问题

### Q1: 如何向子进程发送数据？

```typescript
const process = spawn("node", ["process.js"]);

// 写入数据到 stdin
process.stdin.write("Hello, World!");
process.stdin.end(); // 发送 EOF
```

### Q2: 如何终止子进程？

```typescript
const process = spawn("node", ["long-running.js"]);

// 方式 1: 发送 SIGTERM
process.kill();

// 方式 2: 发送特定信号
process.kill("SIGKILL");
```

### Q3: 如何检查命令是否存在？

```typescript
async function commandExists(command: string): Promise<boolean> {
  try {
    await spawn(command, ["--version"]).on("error", (err) => {
      throw err;
    });
    return true;
  } catch {
    return false;
  }
}

// 使用
if (await commandExists("shellcheck")) {
  console.log("shellcheck 已安装");
} else {
  console.log("shellcheck 未安装");
}
```

### Q4: 如何设置工作目录？

```typescript
const process = spawn("npm", ["install"], {
  cwd: "/path/to/project",
});
```

### Q5: 如何设置环境变量？

```typescript
const process = spawn("node", ["script.js"], {
  env: {
    ...process.env, // 保留现有环境变量
    NODE_ENV: "production",
    API_KEY: "secret",
  },
});
```

## 性能对比

| 特性     | spawn              | exec                         |
| -------- | ------------------ | ---------------------------- |
| 输出大小 | 无限制             | 受缓冲区限制（默认 1MB）     |
| 数据处理 | 流式实时处理       | 等待全部完成后处理           |
| 适用场景 | 长时间运行、大输出 | 快速命令、小输出             |
| 性能     | 更高（实时流处理） | 较低（缓冲区等待）           |
| 内存占用 | 更低（逐块处理）   | 更高（保存全部输出）         |
| 启动速度 | 快                 | 稍慢（需要 shell）           |
| 安全性   | 高（不通过 shell） | 低（通过 shell，有注入风险） |

## 最佳实践

### 1. 使用 spawn 而不是 exec

```typescript
// ❌ 不推荐：使用 exec
exec("cat large-file.txt", (error, stdout) => {
  console.log(stdout);
});

// ✅ 推荐：使用 spawn
const process = spawn("cat", ["large-file.txt"]);
process.stdout.on("data", (chunk) => {
  console.log(chunk.toString());
});
```

### 2. 正确处理错误

```typescript
const process = spawn("shellcheck", ["file.sh"]);

process.on("error", (err) => {
  // 命令不存在或无法执行
  console.error(`无法执行命令: ${err.message}`);
});

process.on("close", (code) => {
  // 命令执行完成（可能成功或失败）
  if (code === 0) {
    console.log("执行成功");
  } else {
    console.error(`执行失败，退出码: ${code}`);
  }
});
```

### 3. 正确处理 Buffer

```typescript
const process = spawn("command", ["args"]);
let stdout: Buffer[] = [];

process.stdout.on("data", (chunk) => {
  // chunk 可能是 Buffer 或 string
  stdout.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
});

process.on("close", () => {
  const output = Buffer.concat(stdout).toString();
  console.log(output);
});
```

### 4. 使用 Promise 封装

```typescript
function execute(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args);
    let stdout: Buffer[] = [];
    let stderr: Buffer[] = [];

    process.stdout.on("data", (chunk) => {
      stdout.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    process.stderr.on("data", (chunk) => {
      stderr.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    process.on("close", (code) => {
      if (code === 0) {
        resolve(Buffer.concat(stdout).toString());
      } else {
        reject(new Error(Buffer.concat(stderr).toString()));
      }
    });

    process.on("error", reject);
  });
}

// 使用
try {
  const output = await execute("ls", ["-la"]);
  console.log(output);
} catch (error) {
  console.error("执行失败:", error);
}
```

## 总结

`spawn` 是处理外部命令的强大工具，特别适合：

- ✅ 长时间运行的命令
- ✅ 输出较大的命令
- ✅ 需要实时处理输出的场景
- ✅ 需要支持取消操作的场景
- ✅ 需要流式处理的场景

在 Shell Formatter 插件中，`shellcheck` 和 `shfmt` 可能处理大文件，输出较大，并且需要支持取消操作，所以使用 `spawn` 是最佳选择。

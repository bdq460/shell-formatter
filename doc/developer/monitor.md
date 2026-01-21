# 性能监控和告警模块

## 概述

本模块提供完整的性能监控和告警功能，用于跟踪 Shell Formatter 扩展的关键操作性能，并在性能超出阈值时自动触发告警。

## 核心功能

### 1. 性能监控（PerformanceMonitor）

收集和统计性能指标：

- 记录操作耗时（毫秒）
- 计算平均值、最小值、最大值
- 生成性能报告

### 2. 性能计时器（PerformanceTimer）

简化性能测量的工具：

- 自动启动/停止计时
- 自动记录到监控器
- 自动触发告警检查

### 3. 性能告警（PerformanceAlertManager）

监控性能指标并触发告警：

- 4 级告警系统（LOW, MEDIUM, HIGH, CRITICAL）
- 默认阈值配置
- 自定义告警处理器
- 告警历史和统计

## 使用方法

### 基础性能监控

```typescript
import { startTimer } from "./utils/performance/monitor";

// 方式1: 使用 startTimer
const timer = startTimer("format_duration");
// ... 执行操作 ...
const duration = timer.stop(); // 自动触发告警检查

// 方式2: 使用 PerformanceTimer
import { PerformanceTimer } from "./utils/performance/monitor";
const timer = new PerformanceTimer("check_duration");
// ... 执行操作 ...
timer.stop();
```

### 函数装饰器

```typescript
import { performance } from "./utils/performance/monitor";

class MyService {
  @performance("diagnose_one_doc_duration")
  async diagnose(document: TextDocument): Promise<void> {
    // ... 执行诊断 ...
    // 性能自动记录
  }
}
```

### 函数包装

```typescript
import { wrapAsync, measureAsync } from "./utils/performance/integration";

const safeFormat = wrapAsync("format_duration", async (doc) => {
  // ... 格式化逻辑 ...
});

// 或使用 measureAsync（推荐）
const measuredFormat = measureAsync("format_duration", formatDocument);
```

### 性能告警

#### 启用告警

```typescript
import {
  onPerformanceAlert,
  getPerformanceAlerts,
  getAlertStats,
} from "./utils/performance/integration";

// 注册告警处理器
onPerformanceAlert((alert) => {
  console.log(`性能告警: ${alert.metricName} = ${alert.value}ms`);
  console.log(`级别: ${alert.level}, 阈值: ${alert.threshold}ms`);

  // 在 VSCode 中显示通知
  vscode.window.showWarningMessage(alert.message);
});

// 注意：告警在 PerformanceTimer.stop() 时自动检查
```

#### 查看告警历史

```typescript
// 获取最近的 10 条告警
const alerts = getPerformanceAlerts(10);

// 获取告警统计
const stats = getAlertStats();
console.log(`总计: ${stats.total}`);
console.log(`严重: ${stats.byLevel.CRITICAL}`);
console.log(`高: ${stats.byLevel.HIGH}`);
```

#### 清除告警历史

```typescript
import { clearAlertHistory } from "./utils/performance/integration";

clearAlertHistory();
```

## 默认告警阈值

| 指标名称                     | 低  | 中      | 高      | 严重    |
| ---------------------------- | --- | ------- | ------- | ------- |
| diagnose_one_doc_duration    | -   | 3000ms  | 5000ms  | 10000ms |
| diagnose_all_docs_duration   | -   | 20000ms | 30000ms | 60000ms |
| format_duration              | -   | 2000ms  | 3000ms  | 5000ms  |
| shfmt_format_duration        | -   | 1000ms  | 2000ms  | 3000ms  |
| shfmt_diagnose_duration      | -   | 2000ms  | 3000ms  | 5000ms  |
| shellcheck_diagnose_duration | -   | 3000ms  | 5000ms  | 10000ms |
| plugin_load_duration         | -   | 2000ms  | 5000ms  | 10000ms |
| service_init_duration        | -   | 3000ms  | 5000ms  | 10000ms |

## 文件结构

```tree
src/utils/performance/
├── alertManager.ts       # 告警管理器
├── monitor.ts           # 性能监控器和计时器
├── integration.ts       # 便捷 API 和集成接口
├── example.ts          # 使用示例
└── README.md          # 本文档
```

## API 参考

### PerformanceTimer

```typescript
class PerformanceTimer {
  constructor(name: string, monitor?: PerformanceMonitor);
  stop(): number; // 停止计时并返回耗时
  async stopAsync(): Promise<number>; // 异步停止计时
}
```

### 性能监控集成 API

```typescript
// 监控
function startTimer(name: string): PerformanceTimer;
function measurePerformance(metricName: string): MethodDecorator;
function wrapAsync<T>(metricName: string, fn: Function): Function;
function measureAsync<T>(metricName: string, fn: Function): Function;

// 告警
function enablePerformanceAlerts(): void;
function disablePerformanceAlerts(): void;
function onPerformanceAlert(handler: AlertHandler): void;
function getPerformanceAlerts(limit?: number): PerformanceAlert[];
function getAlertStats(): AlertStats;
function clearAlertHistory(): void;
```

## 实际应用示例

### 在插件中使用

```typescript
import { startTimer } from "./utils/performance/monitor";

export class PureShfmtPlugin extends BaseFormatPlugin {
  async format(
    document: vscode.TextDocument,
    options: PluginFormatOptions,
  ): Promise<PluginFormatResult> {
    const timer = startTimer("shfmt_format_duration");

    try {
      const result = await this.tool.format({
        file: "-",
        content: document.getText(),
      });
      timer.stop(); // 自动触发告警
      return this.createFormatResult(result, document, source);
    } catch (error) {
      timer.stop();
      return this.handleFormatError(document, error);
    }
  }
}
```

### 在诊断中使用

```typescript
import { startTimer } from "./utils/performance/monitor";

export class VSCodeDiagnosticAdapter {
  async diagnoseDocument(
    document: vscode.TextDocument,
  ): Promise<vscode.Diagnostic[]> {
    const timer = startTimer("diagnose_one_doc_duration");

    try {
      const diagnostics = await this.collectDiagnostics(document);
      timer.stop(); // 自动触发告警
      return diagnostics;
    } finally {
      timer.stop();
    }
  }
}
```

## 性能优化建议

根据告警数据，可以针对性地优化性能：

1. **频繁触发告警的指标** → 优化该操作逻辑
2. **严重告警** → 检查是否有阻塞操作或死循环
3. **高告警** → 考虑添加缓存或批处理
4. **中告警** → 优化算法复杂度

## 测试

```typescript
import { startTimer, resetMetrics } from "./utils/performance/monitor";
import {
  getAlertManager,
  setAlertManager,
  resetAlertManager,
} from "./utils/performance/alertManager"
    setAlertManager,
    resetAlertManager,
} from './utils/performance/alertManager';

// 测试前重置
resetMetrics();
resetAlertManager();

// 测试性能监控
const timer = startTimer("test_duration");
await simulateOperation();
const duration = timer.stop();

// 测试告警
const alerts = getAlertManager().getAlerts();
console.log(`Alerts: ${alerts.length}`);
```

## 最佳实践

1. **在关键操作中使用计时器**：格式化、诊断、插件加载等
2. **设置合理的告警阈值**：根据实际需求调整
3. **定期查看告警历史**：发现性能趋势
4. **优化高频告警**：优先处理频繁触发告警的操作
5. **关闭不必要的监控**：在性能敏感场景可临时禁用

## 故障排查

### 告警未触发

- 检查是否调用了 `timer.stop()`
- 确认指标名称与阈值配置匹配
- 检查是否超过阈值

### 性能数据不准确

- 确保 `timer.stop()` 在操作完成后调用
- 避免嵌套计时器
- 检查是否有并发干扰

## 相关文档

- [ARCHITECTURE_REVIEW.md](../../../ARCHITECTURE_REVIEW.md) - 架构评审
- [PLUGIN_INTERFACE_IMPROVEMENTS.md](../../../PLUGIN_INTERFACE_IMPROVEMENTS.md) - 插件接口改进

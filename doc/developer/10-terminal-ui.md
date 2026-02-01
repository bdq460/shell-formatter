# 终端用户界面（TUI） Terminal User Interface 编程指南

本文档介绍如何在 Shell 脚本中实现交互式终端用户界面（TUI），包括 IDE 列表展示、键盘输入处理和原地重绘等技术。

## 简介

终端用户界面TUI是Terminal User Interface的缩写，指通过终端实现的交互式用户界面。

TUI是一种基于文本的交互界面，允许用户通过键盘在终端中进行选择和操作。与图形用户界面（GUI）不同，TUI 依赖于终端的字符显示能力，通过控制光标位置和颜色实现动态交互效果。

TUI 的优点是简单、直观，适用于需要用户交互的脚本或工具。缺点是需要一定的编程技巧和终端知识，不适用于复杂的交互场景。

## 适用场景

- 需要用户从多个选项中选择的功能
- 需要交互式菜单的安装/配置脚本
- 需要实时更新显示的进度展示

## 核心概念

### TUI 基本原理

TUI（Terminal User Interface）通过以下技术实现交互式界面：

1. **ANSI 转义序列** - 控制光标位置、颜色和屏幕清空
2. **键盘输入检测** - 读取方向键、回车等特殊按键
3. **原地重绘** - 通过移动光标 + 重新输出实现"动画"效果
4. **终端设备访问** - 使用 `/dev/tty` 直接写入终端

### 原地绘制原理

使用ANSI转义码控制光标位置，实现菜单的动态更新和交互选择

1. **隐藏光标**
   - ANSI码 : \033[?25l
   - 用途： 在菜单渲染时隐藏光标，提升视觉效果
   - 应用场景：渲染菜单、动画效果、全屏更新时
   - 效果：光标不再闪烁显示
   - 重要性：避免光标干扰用户查看菜单选项
2. **恢复光标**
   - ANSI码 : \033[?25h
   - 用途： 退出菜单前恢复光标显示
   - 应用场景：退出菜单、完成交互后
   - 效果：光标重新显示
   - 重要性：恢复正常输入体验
3. **上移光标**: \033[{n}A
   - ANSI码 : \033[{n}A
   - 参数：n 是上移的行数
   - 用途： 原地刷新菜单，实现平滑滚动效果
   - 应用场景：每次循环时将光标移回菜单起始位置
   - 效果：覆盖上一帧内容，实现原地更新
   - 重要性：避免滚动输出，保持界面稳定

简单来讲就是实现一个循环，通过光标的向回移动, 反复从同一起始位置不断重绘菜单内容，并根据用户输入调整显示内容

**伪码**

```shell
    while true; do
    1. 移动光标回起点 (上移n行)
    2. 重新输出所有选项
    3. 等待用户输入
    4. 更新selected变量
    5. 循环
    done
```

## 实现示例：交互式 IDE 选择器

### 完整代码结构（增强版）

交互式选择菜单（上下键 + 数字键 + Esc 退出）

```bash
select_ide_interactive() {
    options=()
    # 准备选项数组
    while IFS='|' read -r id name _ _ _; do
        if [ -n "$id" ]; then
            options+=("$id|$name")
        fi
    done << EOF
$AVAILABLE_IDES
EOF

    count=${#options[@]}
    if [ "$count" -eq 0 ]; then
        echo ""
        return
    fi

    # 初始化选中项（默认选择）
    selected=$((default_choice - 1))
    if [ "$selected" -lt 0 ] || [ "$selected" -ge "$count" ]; then
        selected=0
    fi

    # 显示操作提示（包含数字键说明）
    echo -e "${BLUE}使用 ↑/↓/数字 选择，回车确认，Esc 退出${NC}" > /dev/tty

    # 主循环：显示选项 + 等待输入 + 更新选择
    while true; do
        printf "\033[?25l" > /dev/tty  # 隐藏光标

        # 显示所有选项（带数字编号）
        for i in "${!options[@]}"; do
            label=$(echo "${options[$i]}" | cut -d'|' -f2-)
            if [ "$i" -eq "$selected" ]; then
                # 选中的项：用 ➤ 标记，使用青色，显示编号
                printf "  ${CYAN}➤ %s${NC}\n" "[$((i + 1))] $label" > /dev/tty
            else
                # 未选中的项：普通显示，显示编号
                printf "    %s\n" "[$((i + 1))] $label" > /dev/tty
            fi
        done

        # 读取键盘输入
        read -rsn1 key < /dev/tty

        # 处理 ESC 字符开头（方向键、功能键或单独 Esc）
        if [[ "$key" == $'\x1b' ]]; then
            key2=""
            # 再读 2 个字符，超时 0.05 秒
            if ! read -rsn2 -t 0.05 key2 < /dev/tty; then
                key2=""
            fi

            case "$key2" in
                "[A" | "OA")  # 上箭头（[A 和 OA 兼容）
                    selected=$(((selected - 1 + count) % count))
                    ;;
                "[B" | "OB")  # 下箭头（[B 和 OB 兼容）
                    selected=$(((selected + 1) % count))
                    ;;
                "[C" | "OC")  # 右箭头（忽略）
                    :
                    ;;
                "[D" | "OD")  # 左箭头（忽略）
                    :
                    ;;
                # 忽略功能键（F1-F12, Insert, Delete, Home, End, PageUp, PageDown）
                "[11~" | "[12~" | "[13~" | "[14~" | "[15~" | "[17~" |
                "[18~" | "[19~" | "[20~" | "[21~" | "[23~" | "[24~" |
                "[2~" | "[3~" | "[1~" | "[4~" | "[5~" | "[6~" |
                "[H" | "[F")
                    :
                    ;;
                *)  # 其他情况：单独按下 Esc 键
                    printf "\033[?25h" > /dev/tty
                    echo "" > /dev/tty
                    return 1
                    ;;
            esac
        elif [[ "$key" == "" ]]; then  # 回车键（空字符）
            printf "\033[?25h" > /dev/tty  # 恢复光标
            break                           # 确认选择
        elif [[ "$key" =~ ^[1-9]$ ]]; then  # 数字键快速选择（1-9）
            idx=$((key - 1))
            if [ "$idx" -ge 0 ] && [ "$idx" -lt "$count" ]; then
                selected="$idx"
                printf "\033[?25h" > /dev/tty
                # 可选：直接退出循环，或继续显示选中项
                # break
            fi
        fi

        # 光标上移 count 行（回到起点），实现原地重绘
        printf "\033[%sA" "$count" > /dev/tty
    done

    # 返回选中的选项
    echo "${options[$selected]}"
}
```

### 新增特性说明

1. **数字键快速选择**
   - 按数字键 `1-9` 直接选择对应选项
   - 选项显示带数字编号 `[1]`, `[2]`, 等
   - 提示信息中说明数字键用法

2. **改进的 ESC 检测**
   - 使用超时机制区分方向键和单独 Esc 键
   - 避免误判和阻塞

3. **功能键忽略**
   - 忽略 F1-F12、Insert、Delete、Home、End 等功能键
   - 防止意外触发其他功能

## 技术详解

### 1. ANSI 转义序列

ANSI 转义序列是终端控制的标准，格式为 `ESC[参数`

#### 常用转义序列

| 转义序列 | 功能 | 代码示例 |
|---------|------|---------|
| `\033[?25l` | 隐藏光标 | `printf "\033[?25l"` |
| `\033[?25h` | 显示光标 | `printf "\033[?25h"` |
| `\033[nA` | 光标上移 n 行 | `printf "\033[3A"` |
| `\033[nB` | 光标下移 n 行 | `printf "\033[2B"` |
| `\033[nC` | 光标右移 n 列 | `printf "\033[5C"` |
| `\033[nD` | 光标左移 n 列 | `printf "\033[3D"` |
| `\033[K` | 清除从光标到行尾 | `printf "\033[K"` |
| `\033[2J` | 清除整个屏幕 | `printf "\033[2J"` |
| `\033[H` | 光标移动到左上角 | `printf "\033[H"` |

#### 颜色控制

```bash
# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'  # No Color (重置颜色)

# 使用颜色
echo -e "${RED}错误信息${NC}"
echo -e "${GREEN}成功信息${NC}"
```

### 2. 键盘输入检测

#### 超时检测 ESC 键

区分单独按下的 Esc 键和功能键（方向键、F 键等）的关键技术。

**问题：**

- 方向键发送：ESC `[` `A`（3 个字符，连续）
- 单独 Esc 键：只发送 ESC（1 个字符）
- 如何区分这两种情况？

**解决方案：使用超时读取**

```bash
read -rsn1 key < /dev/tty

if [[ "$key" == $'\x1b' ]]; then
    key2=""
    # 再读 2 个字符，超时 0.05 秒
    if ! read -rsn2 -t 0.05 key2 < /dev/tty; then
        key2=""
    fi

    case "$key2" in
        "[A" | "OA")
            # 上箭头
            ;;
        "[B" | "OB")
            # 下箭头
            ;;
        *)
            # key2 为空：单独按下的 Esc 键
            # key2 不匹配任何功能键序列：也视为 Esc
            printf "\033[?25h" > /dev/tty
            return 1
            ;;
    esac
fi
```

**技术要点：**

1. **`read -t 0.05` 设置超时**
   - 0.05 秒（50 毫秒）足够功能键发送后续字符
   - 超时后返回失败，`key2` 保持为空

2. **方向键序列特征**

   ```text
   上箭头：ESC + [ + A  (3字符，连续)
   下箭头：ESC + [ + B  (3字符，连续)
   F1键  ：ESC + O + P  (3字符，连续)
   Esc   ：ESC         (1字符，无后续)
   ```

3. **超时判断逻辑**

   ```bash
   if ! read -rsn2 -t 0.05 key2 < /dev/tty; then
       # 超时：没有读取到后续字符
       # 说明是单独按下的 Esc 键
       key2=""
   fi
   ```

4. **兼容性处理**
   - `[A` 和 `OA` 都表示上箭头（不同终端实现）
   - 在 `case` 中同时匹配两种格式

**调试技巧：**

```bash
# 调试：显示读取到的字符和时间
read -rsn1 key < /dev/tty
if [[ "$key" == $'\x1b' ]]; then
    start=$(date +%s%N)  # 记录开始时间
    read -rsn2 -t 0.05 key2 < /dev/tty
    end=$(date +%s%N)    # 记录结束时间
    elapsed=$(( (end - start) / 1000000 ))  # 毫秒
    echo "Key: ESC, key2: '$key2', elapsed: ${elapsed}ms"
fi
```

#### 读取单个字符

```bash
read -rsn1 key < /dev/tty
```

参数说明：

- `-r`：禁止反斜杠转义
- `-s`：静默模式（不回显输入）
- `-n1`：只读取 1 个字符
- `< /dev/tty`：从终端设备读取（不受管道影响）

#### 方向键的转义序列

方向键由多个字符组成，需要分步读取：

| 按键 | 字符序列 | 检测代码 |
|------|---------|---------|
| 上箭头 | ESC `[` `A` 或 `O` `A` | `key='\x1b'` + `key2='[A/OA'` |
| 下箭头 | ESC `[` `B` 或 `O` `B` | `key='\x1b'` + `key2='[B/OB'` |
| 左箭头 | ESC `[` `D` 或 `O` `D` | `key='\x1b'` + `key2='[D/OD'` |
| 右箭头 | ESC `[` `C` 或 `O` `C` | `key='\x1b'` + `key2='[C/OC'` |
| 回车 | 空（无字符） | `key=""` |
| Esc | ESC + 超时（无后续字符） | `key='\x1b'` + `key2=""`（超时） |
| 数字键 1-9 | `1`-`9` | `key=~[1-9]` |

#### 读取方向键的完整逻辑（增强版）

```bash
read -rsn1 key < /dev/tty

if [[ "$key" == $'\x1b' ]]; then
    # ESC 字符开头，可能是方向键、功能键或单独的 Esc
    key2=""
    # 再读 2 个字符，超时 0.05 秒, 视为单独按下 Esc
    if ! read -rsn2 -t 0.05 key2 < /dev/tty; then
        key2=""
    fi

    case "$key2" in
        "[A" | "OA")  # 上箭头（[A 和 OA 兼容）
            selected=$(((selected - 1 + count) % count))
            ;;
        "[B" | "OB")  # 下箭头（[B 和 OB 兼容）
            selected=$(((selected + 1) % count))
            ;;
        "[C" | "OC")  # 右箭头（忽略）
            :
            ;;
        "[D" | "OD")  # 左箭头（忽略）
            :
            ;;
        # 忽略功能键（F1-F12, Insert, Delete, Home, End, PageUp, PageDown）
        "[11~" | "[12~" | "[13~" | "[14~" | "[15~" | "[17~" |
        "[18~" | "[19~" | "[20~" | "[21~" | "[23~" | "[24~" |
        "[2~" | "[3~" | "[1~" | "[4~" | "[5~" | "[6~" |
        "[H" | "[F")
            :
            ;;
        *)  # 其他情况：单独按下 Esc 键
            printf "\033[?25h" > /dev/tty
            echo "" > /dev/tty
            return 1
            ;;
    esac
elif [[ "$key" == "" ]]; then
    # 回车键（空字符）
    printf "\033[?25h" > /dev/tty
    break  # 确认选择
elif [[ "$key" =~ ^[1-9]$ ]]; then
    # 数字键快速选择（1-9）
    idx=$((key - 1))
    if [ "$idx" -ge 0 ] && [ "$idx" -lt "$count" ]; then
        selected="$idx"
        printf "\033[?25h" > /dev/tty
        # 可选：直接退出循环，或继续显示选中项
        # break
    fi
fi
```

#### 关键改进说明

1. **超时检测 Esc 键**

   ```bash
   # 使用 -t 参数设置超时，避免读取阻塞
   if ! read -rsn2 -t 0.05 key2 < /dev/tty; then
       key2=""  # 超时表示单独按下 Esc
   fi
   ```

   - 方向键会在 ESC 后立即发送 `[A` 等序列
   - 单独按 Esc 键则不会发送后续字符
   - 超时机制区分这两种情况

2. **数字键快速选择**

   ```bash
   elif [[ "$key" =~ ^[1-9]$ ]]; then
       idx=$((key - 1))
       if [ "$idx" -ge 0 ] && [ "$idx" -lt "$count" ]; then
           selected="$idx"
       fi
   fi
   ```

   - 用户可直接按数字键选择对应项
   - 无需上下键逐个导航

3. **忽略功能键**

   ```bash
   "[11~" | "[12~" | ... | "[H" | "[F")
       :
       ;;
   ```

   - F1-F12、Insert、Delete、Home、End 等功能键
   - 避免误触导致意外行为

### 3. 原地重绘原理

#### 重绘流程

```text
初始状态（3个选项）:
➤ Option 1    ← 第1行（selected=0，用 ➤ 标记）
  Option 2    ← 第2行
  Option 3    ← 第3行

用户按↓键:
1. 读取到 '[B'，更新 selected = 1
2. 光标上移3行: printf "\033[3A"
3. 重新输出所有选项:
  Option 1    ← 第1行（普通显示）
➤ Option 2    ← 第2行（selected=1，用 ➤ 标记）
  Option 3    ← 第3行

用户再次按↓键:
1. 读取到 '[B'，更新 selected = 2
2. 光标上移3行: printf "\033[3A"
3. 重新输出所有选项:
  Option 1
  Option 2
➤ Option 3    ← 第3行（selected=2，用 ➤ 标记）

循环继续，每次按键都重绘整个列表
```

#### 关键代码

```bash
while true; do
    # 1. 显示所有选项
    for i in "${!options[@]}"; do
        if [ "$i" -eq "$selected" ]; then
            printf "  ${CYAN}➤ %s${NC}\n" "$label" > /dev/tty
        else
            printf "    %s\n" "$label" > /dev/tty
        fi
    done

    # 2. 读取键盘输入
    read -rsn1 key < /dev/tty
    # ... 处理输入，更新 selected ...

    # 3. 光标上移 count 行（回到起点）
    printf "\033[%sA" "$count" > /dev/tty
done
```

### 4. 循环选择算法

#### 循环选择实现

```bash
# 上箭头：选择上一项（循环）
selected=$(((selected - 1 + count) % count))

# 下箭头：选择下一项（循环）
selected=$(((selected + 1) % count))
```

#### 算法示例（count=3）

| 当前 selected | 按↑ | 按↓ |
|------------|-----|-----|
| 0 | (0-1+3)%3 = 2 | (0+1)%3 = 1 |
| 1 | (1-1+3)%3 = 0 | (1+1)%3 = 2 |
| 2 | (2-1+3)%3 = 1 | (2+1)%3 = 0 |

#### 为什么这样设计？

使用 `% count` 实现循环选择：

- 第一项按↑ → 跳到最后一项
- 最后一项按↓ → 跳到第一项

### 5. 终端设备访问

#### 为什么使用 /dev/tty？

```bash
echo "输出" > /dev/tty
read key < /dev/tty
```

**原因**：

1. **避免管道干扰**：如果脚本通过管道调用（如 `cat script.sh | bash`），标准输出会改变
2. **直接访问终端**：`/dev/tty` 是当前终端的设备文件，不受重定向影响
3. **用户交互可靠**：确保读取和显示都来自真实的用户终端

#### 对比标准 I/O

```bash
# 使用标准输出（可能被重定向）
echo "消息"          # 可能输出到文件
read key            # 可能从管道读取

# 使用终端设备（可靠）
echo "消息" > /dev/tty   # 总是输出到终端
read key < /dev/tty      # 总是从终端读取
```

## 实现步骤总结

### 第一步：准备选项数据

```bash
options=()
for item in "${AVAILABLE_ITEMS[@]}"; do
    options+=("$item")
done

count=${#options[@]}
```

### 第二步：初始化选中项

```bash
selected=0  # 默认选择第一项
# 或者使用传入的默认值
selected=$((default_choice - 1))
```

### 第三步：显示交互提示

```bash
echo -e "${BLUE}使用 ↑/↓ 选择，回车确认，Esc 退出${NC}" > /dev/tty
```

### 第四步：主循环（显示 + 输入 + 更新）

```bash
while true; do
    # 隐藏光标
    printf "\033[?25l" > /dev/tty

    # 显示选项
    display_options

    # 读取输入
    read_key

    # 处理输入
    process_key

    # 光标回到起点（重绘）
    printf "\033[%sA" "$count" > /dev/tty
done
```

### 第五步：退出处理

```bash
# 恢复光标
printf "\033[?25h" > /dev/tty

# 返回结果
echo "${options[$selected]}"
```

## 高级技巧

### 0. 功能键处理（新增）

在交互式菜单中，需要正确处理各种功能键，避免误触发。

**常见功能键的转义序列：**

| 按键 | 转义序列 | 说明 |
|------|---------|------|
| F1 | `ESC O P` | 功能键 1 |
| F2 | `ESC O Q` | 功能键 2 |
| F3 | `ESC O R` | 功能键 3 |
| F4 | `ESC O S` | 功能键 4 |
| F5 | `ESC [ 1 5 ~` | 功能键 5 |
| F6 | `ESC [ 1 7 ~` | 功能键 6 |
| F7 | `ESC [ 1 8 ~` | 功能键 7 |
| F8 | `ESC [ 1 9 ~` | 功能键 8 |
| F9 | `ESC [ 2 0 ~` | 功能键 9 |
| F10 | `ESC [ 2 1 ~` | 功能键 10 |
| F11 | `ESC [ 2 3 ~` | 功能键 11 |
| F12 | `ESC [ 2 4 ~` | 功能键 12 |
| Insert | `ESC [ 2 ~` | 插入键 |
| Delete | `ESC [ 3 ~` | 删除键 |
| Home | `ESC [ 1 ~` 或 `ESC [ H` | 首页键 |
| End | `ESC [ 4 ~` 或 `ESC [ F` | 结尾键 |
| PageUp | `ESC [ 5 ~` | 上页键 |
| PageDown | `ESC [ 6 ~` | 下页键 |

**完整处理代码：**

```bash
if [[ "$key" == $'\x1b' ]]; then
    key2=""
    if ! read -rsn2 -t 0.05 key2 < /dev/tty; then
        key2=""
    fi

    case "$key2" in
        "[A" | "OA")  # 上箭头
            selected=$(((selected - 1 + count) % count))
            ;;
        "[B" | "OB")  # 下箭头
            selected=$(((selected + 1) % count))
            ;;
        "[C" | "OC")  # 右箭头（忽略）
            :
            ;;
        "[D" | "OD")  # 左箭头（忽略）
            :
            ;;
        # 功能键：F1-F12, Insert, Delete, Home, End, PageUp, PageDown
        "[11~" | "[12~" | "[13~" | "[14~" | "[15~" | "[17~" |
        "[18~" | "[19~" | "[20~" | "[21~" | "[23~" | "[24~" |
        "[2~" | "[3~" | "[1~" | "[4~" | "[5~" | "[6~" |
        "[H" | "[F")
            # 忽略功能键，不做任何操作
            :
            ;;
        *)  # 其他情况：单独按下的 Esc 键
            printf "\033[?25h" > /dev/tty
            echo "" > /dev/tty
            return 1
            ;;
    esac
fi
```

**处理原则：**

1. **明确忽略不需要的功能键**
   - 方向键以外的功能键通常不需要
   - 使用 `:` 空命令表示忽略

2. **避免误触发**
   - 功能键的转义序列可能与正常按键冲突
   - 明确列出所有需要忽略的键序列

3. **可扩展性**
   - 如需支持新功能键，只需在 `case` 中添加匹配项
   - 例如：支持 F5 刷新菜单

```bash
"[15~")  # F5 - 刷新菜单
    refresh_menu
    ;;
```

**调试技巧：**

```bash
# 显示接收到的键序列
if [[ "$key" == $'\x1b' ]]; then
    read -rsn2 key2 < /dev/tty
    echo "Received: ESC '$key2'" > /dev/tty
    # 观察不同按键的序列
fi
```

### 1. 多列布局

```bash
# 每行显示 2 个选项
cols=2
for i in "${!options[@]}"; do
    row=$((i / cols))
    col=$((i % cols))
    if [ $col -eq 0 ]; then
        printf "\n"
    fi
    printf "%-20s" "${options[$i]}"
done
```

### 2. 带描述的选项

```bash
# 选项格式：ID|名称|描述
for i in "${!options[@]}"; do
    name=$(echo "${options[$i]}" | cut -d'|' -f2)
    desc=$(echo "${options[$i]}" | cut -d'|' -f3)
    if [ "$i" -eq "$selected" ]; then
        printf "  ${CYAN}➤ %s${NC} - ${GRAY}%s${NC}\n" "$name" "$desc"
    else
        printf "    %s - ${GRAY}%s${NC}\n" "$name" "$desc"
    fi
done
```

### 3. 快速跳转（数字键选择）

```bash
# 支持数字键直接跳转
if [[ "$key" =~ ^[1-9]$ ]]; then  # 只匹配 1-9
    idx=$((key - 1))
    if [ "$idx" -ge 0 ] && [ "$idx" -lt "$count" ]; then
        selected="$idx"
        printf "\033[?25h" > /dev/tty
        # 选项 1: 直接确认选择
        # break

        # 选项 2: 显示选中项，等待回车确认
        # （不 break）
    fi
fi
```

**实现要点：**

1. **显示编号**：在选项前显示数字编号

   ```bash
   printf "  ${CYAN}➤ %s${NC}\n" "[$((i + 1))] $label" > /dev/tty
   ```

2. **正则匹配**：使用 `^[1-9]$` 精确匹配单个数字
   - `^` 开始锚点
   - `[1-9]` 1 到 9
   - `$` 结束锚点
   - 不匹配 `0` 或多位数字

3. **边界检查**：验证索引在有效范围内

   ```bash
   if [ "$idx" -ge 0 ] && [ "$idx" -lt "$count" ]; then
       selected="$idx"
   fi
   ```

4. **用户体验**：两种选择
   - 直接确认：立即退出循环
   - 等待确认：显示选中项，等待回车或 ESC

**使用场景：**

- 选项较多时，数字键比方向键更快捷
- 用户熟悉选项顺序时，可直接按键选择
- 适用于固定顺序的菜单（如 IDE 选择、操作列表）

### 4. 搜索过滤

```bash
# 支持输入字符过滤选项
filter=""
while true; do
    # 显示匹配的选项
    display_filtered "$filter"

    # 读取输入
    read -rsn1 key < /dev/tty

    if [[ "$key" =~ [a-zA-Z0-9] ]]; then
        # 添加到过滤条件
        filter="${filter}${key}"
    elif [[ "$key" == $'\x7f' ]]; then  # Backspace
        # 删除最后一个字符
        filter="${filter%?}"
    elif [[ "$key" == "" ]]; then  # 回车
        break
    fi
done
```

## 最佳实践

### 1. 始终恢复终端状态

```bash
# 使用 trap 确保退出时恢复光标
trap 'printf "\033[?25h" > /dev/tty' EXIT

# 主逻辑
printf "\033[?25l" > /dev/tty
# ...
```

### 2. 处理中断信号

```bash
# Ctrl+C 时清理并退出
trap 'cleanup_and_exit' INT TERM

cleanup_and_exit() {
    printf "\033[?25h" > /dev/tty
    printf "\033[2J" > /dev/tty  # 清屏
    exit 1
}
```

### 3. 提供默认选择

```bash
# 使用传入的默认值
selected=$((default_choice - 1))
if [ "$selected" -lt 0 ] || [ "$selected" -ge "$count" ]; then
    selected=0
fi
```

### 4. 兼容性考虑

```bash
# 兼容不同的终端
case "$TERM" in
    xterm*|vt100*)
        # 使用 ANSI 转义序列
        ;;
    *)
        # 使用简单版本（不支持颜色/光标控制）
        ;;
esac
```

### 5. 提供回退选项

```bash
# 如果终端不支持 TUI，使用简单的菜单
if [ ! -t 1 ]; then
    simple_menu
    return
fi

# 使用 TUI 版本
interactive_menu
```

## 调试技巧

### 1. 查看键盘输入

```bash
# 调试：显示读取到的字符
read -rsn1 key < /dev/tty
printf "Key: %s (ASCII: %d)\n" "$key" "'$key" > /dev/tty
```

### 2. 测试 ANSI 转义序列

```bash
# 测试光标移动
printf "Before\n"
printf "\033[2A"      # 上移 2 行
printf "After\n"
```

### 3. 检查终端能力

```bash
# 检查是否支持颜色
if [ -t 1 ]; then
    echo -e "${GREEN}支持颜色${NC}"
else
    echo "不支持颜色"
fi

# 检查终端类型
echo "Terminal: $TERM"
echo "Columns: $COLUMNS"
echo "Lines: $LINES"
```

## 相关资源

- [ANSI 转义序列标准](https://en.wikipedia.org/wiki/ANSI_escape_code)
- [Bash 内置命令文档](https://www.gnu.org/software/bash/manual/bash.html)
- [终端编程指南](https://tldp.org/HOWTO/Bash-Prompt-HOWTO/)
- [tput 命令（替代 ANSI 转义序列）](https://linux.die.net/man/1/tput)

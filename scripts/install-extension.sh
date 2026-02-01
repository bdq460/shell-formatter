#!/bin/bash
#
# 安全安装扩展脚本
#
# 功能:
# 1. 检查系统安装了几个IDE
# 2. 检查系统code指向了哪个IDE, 该IDE为默认安装IDE
# 3. 展示IDE列表，让用户选择安装, 默认选项为code指向的IDE
# 4. 用户通过上下移动光标, 回车选择IDE
# 5. 如用户选择了code指向IDE, 则用code命令安装
# 6. 否则使用对应IDE目录下的code命令安装，如果找不到IDE对应code命令则解压安装, 解压目录为对应IDE的扩展目录
#
# 要求:
# - 显示IDE探测过程信息
# - 显示IDE探测结果, 显示IDE安装路径
# - 显示安装过程信息
# - 优化显示输出, 通过颜色, 格式, 换行, 符号, emoji等优化输出

set -e # 遇到错误立即退出

# 脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

# 从 package.json 获取版本号
get_package_version() {
    # 使用 node 解析 package.json，比 grep/sed 更可靠
    if command -v node > /dev/null 2>&1; then
        node -p "require('${PROJECT_ROOT}/package.json').version" 2> /dev/null
    else
        # 备用方案：使用 grep + sed（处理带空格的 JSON）
        grep '"version"' "${PROJECT_ROOT}/package.json" | head -1 | sed -E 's/.*"version"[^"]*"([^"]+)".*/\1/'
    fi
}

# 获取指定版本的 vsix 文件路径
get_vsix_file() {
    version="$1"
    vsix_file="${PROJECT_ROOT}/shell-formatter-${version}.vsix"

    if [ -f "$vsix_file" ]; then
        echo "$vsix_file"
    else
        echo ""
    fi
}

# 检测系统中安装的所有 IDE
detect_ides() {
    ides=""

    append_ide() {
        ide_id="$1"
        ide_name="$2"
        ide_cmd="$3"
        ide_dir="$4"
        ide_app_cmd="$5"

        ides="${ides}${ide_id}|${ide_name}|${ide_cmd}|${ide_dir}|${ide_app_cmd}"$'\n'
    }

    # 识别 code 命令指向的 IDE（用于默认选项，不影响展示顺序）
    code_path=$(which code 2> /dev/null || echo "")
    code_real_path=$(resolve_cmd_path "$code_path")
    code_target=""
    if [ -n "$code_path" ]; then
        if echo "$code_real_path" | grep -qi "Cursor.app" || echo "$code_real_path" | grep -qi "/cursor$"; then
            code_target="cursor"
        elif echo "$code_real_path" | grep -qi "Visual Studio Code - Insiders.app"; then
            code_target="insiders"
        elif echo "$code_real_path" | grep -qi "Visual Studio Code.app"; then
            code_target="vscode"
        elif code --version 2> /dev/null | head -1 | grep -qi cursor; then
            code_target="cursor"
        elif code --version 2> /dev/null | head -1 | grep -qi insiders; then
            code_target="insiders"
        else
            code_target="vscode"
        fi
    fi

    has_vscode=false
    has_cursor=false
    has_insiders=false

    if [ -d "/Applications/Visual Studio Code.app" ] || [ "$code_target" = "vscode" ]; then
        has_vscode=true
    fi

    if [ -d "/Applications/Cursor.app" ] || command -v cursor > /dev/null 2>&1 || [ "$code_target" = "cursor" ]; then
        has_cursor=true
    fi

    if [ -d "/Applications/Visual Studio Code - Insiders.app" ] || command -v code-insiders > /dev/null 2>&1 || [ "$code_target" = "insiders" ]; then
        has_insiders=true
    fi

    # 展示顺序：默认 IDE 在第一个，其余按 VSCode -> Cursor -> Insiders
    order=("vscode" "cursor" "insiders")
    # 如果 code 指向某个 IDE，则将其放在第一位
    # -n是测试选项，意思是 "non-zero length"（非零长度）
    if [ -n "$code_target" ]; then
        order=("$code_target" "vscode" "cursor" "insiders")
    fi

    for ide in "${order[@]}"; do
        case "$ide" in
            vscode)
                if [ "$has_vscode" = true ]; then
                    append_ide "vscode" "VSCode" "code" "${HOME}/.vscode/extensions" "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code"
                    has_vscode=false
                fi
                ;;
            cursor)
                if [ "$has_cursor" = true ]; then
                    append_ide "cursor" "Cursor" "cursor" "${HOME}/.cursor/extensions" "/Applications/Cursor.app/Contents/Resources/app/bin/cursor"
                    has_cursor=false
                fi
                ;;
            insiders)
                if [ "$has_insiders" = true ]; then
                    append_ide "insiders" "VSCode Insiders" "code-insiders" "${HOME}/.vscode-insiders/extensions" "/Applications/Visual Studio Code - Insiders.app/Contents/Resources/app/bin/code"
                    has_insiders=false
                fi
                ;;
        esac
    done

    printf '%s' "$ides"
}

# 解析命令真实路径（处理软链接）
resolve_cmd_path() {
    cmd_path="$1"

    if [ -z "$cmd_path" ]; then
        echo ""
        return
    fi

    if [ -L "$cmd_path" ] && command -v readlink > /dev/null 2>&1; then
        link_target=$(readlink "$cmd_path" 2> /dev/null || echo "")
        if [ -n "$link_target" ]; then
            if [[ "$link_target" == /* ]]; then
                echo "$link_target"
            else
                echo "$(dirname "$cmd_path")/$link_target"
            fi
            return
        fi
    fi

    echo "$cmd_path"
}

# 从命令路径推导应用安装路径（macOS .app）
get_app_install_path() {
    cmd_path="$1"

    if [ -z "$cmd_path" ]; then
        echo ""
        return
    fi

    case "$cmd_path" in
        */*.app/*)
            echo "${cmd_path%%.app/*}.app"
            ;;
        *)
            echo ""
            ;;
    esac
}

# 获取 code 命令当前指向的 IDE
get_default_ide() {
    code_path=$(which code 2> /dev/null || echo "")
    code_real_path=$(resolve_cmd_path "$code_path")

    if [ -z "$code_path" ]; then
        echo ""
        return
    fi

    # 优先根据真实路径判断
    if echo "$code_real_path" | grep -qi "Cursor.app" || echo "$code_real_path" | grep -qi "/cursor$"; then
        echo "cursor"
        return
    fi

    if echo "$code_real_path" | grep -qi "Visual Studio Code - Insiders.app"; then
        echo "insiders"
        return
    fi

    if echo "$code_real_path" | grep -qi "Visual Studio Code.app"; then
        echo "vscode"
        return
    fi

    # 兜底：根据 code 版本信息判断
    if code --version 2> /dev/null | head -1 | grep -qi cursor; then
        echo "cursor"
        return
    fi

    if code --version 2> /dev/null | head -1 | grep -qi insiders; then
        echo "insiders"
        return
    fi

    # 默认为 VSCode
    echo "vscode"
}

# 展开 ~ 到用户目录
expand_path() {
    path="$1"

    if [[ $path == \~ ]]; then
        echo "$HOME"
        return
    fi

    if [[ $path == \~/* ]]; then
        echo "${HOME}/${path#~/}"
        return
    fi

    # 修正类似 /Users/xxx/~/.vscode 的路径
    if [[ "$path" == */~/* ]]; then
        path="${path//\/~\//\/}"
    fi
    if [[ "$path" == */~ ]]; then
        path="${path%/~}"
    fi
    echo "$path"
}

# 通过命令安装
install_by_command() {
    cmd="$1"
    ide_name="$2"
    vsix_file="$3"

    echo "📥 正在使用命令安装到 $ide_name..."
    echo "   命令: $cmd --install-extension"
    echo ""

    if "$cmd" --install-extension "$vsix_file"; then
        return 0
    else
        return 1
    fi
}

# 通过解压安装
install_by_unzip() {
    ext_dir="$1"
    ide_name="$2"
    vsix_file="$3"
    version="$4"
    ext_id="bdq460.shell-formatter-${version}"
    target_dir="${ext_dir}/${ext_id}"

    echo "📥 正在解压安装到 $ide_name..."
    echo "   目标目录: ${target_dir}"
    echo ""

    if ! command -v unzip > /dev/null 2>&1; then
        echo -e "${RED}❌ unzip 命令不可用${NC}"
        return 1
    fi

    # 创建扩展目录
    mkdir -p "$ext_dir"

    # 删除旧版本
    if [ -d "$target_dir" ]; then
        echo "🗑️  删除旧版本..."
        rm -rf "$target_dir"
    fi

    # 解压 vsix 文件
    echo "📦 解压扩展包..."
    tmp_dir=$(mktemp -d)
    if ! unzip -q "$vsix_file" -d "$tmp_dir"; then
        echo -e "${RED}❌ 解压失败${NC}"
        rm -rf "$tmp_dir"
        return 1
    fi

    # 检查解压是否成功并整理结构（VSIX 内容在 extension/ 下）
    if [ -f "${tmp_dir}/extension/package.json" ]; then
        # 创建目标目录
        rm -rf "$target_dir"
        mkdir -p "$target_dir"

        # 移动扩展内容（包含隐藏文件）
        shopt -s dotglob nullglob
        mv "$tmp_dir/extension/"* "$target_dir/"
        shopt -u dotglob nullglob

        rm -rf "$tmp_dir"
        echo -e "${GREEN}✅ 解压成功${NC}"
        return 0
    else
        rm -rf "$tmp_dir"
        echo -e "${RED}❌ 解压后未找到 package.json${NC}"
        return 1
    fi
}

# 交互式选择菜单（上下键 + 回车）
#
# 原地绘制原理:
#   使用ANSI转义码控制光标位置，实现菜单的动态更新和交互选择
#   1. 隐藏光标: \033[?25l, 隐藏光标的作用是不显示光标, 避免用户输入时光标闪烁影响视觉效果
#   2. 恢复光标: \033[?25h, 恢复光标显示, 在退出菜单时使用, 恢复正常输入
#   3. 上移光标: \033[{n}A, 将光标上移n行, 用于覆盖之前输出的内容，实现动态更新
#
# 简单来讲就是实现一个循环，通过光标的向回移动, 反复从同一起始位置不断重绘菜单内容，并根据用户输入调整显示内容.
#
# 伪码:
#   while true; do
#       1. 移动光标回起点 (上移n行)
#       2. 重新输出所有选项
#       3. 等待用户输入
#       4. 更新selected变量
#       5. 循环
#   done

select_ide_interactive() {
    options=()
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

    selected=$((default_choice - 1))
    if [ "$selected" -lt 0 ] || [ "$selected" -ge "$count" ]; then
        selected=0
    fi

    echo -e "${BLUE}使用 ↑/↓/数字 选择，回车确认，Esc 退出${NC}" > /dev/tty

    # 展示IDE列表并处理输入
    while true; do
        printf "\033[?25l" > /dev/tty                       # 隐藏光标
        for i in "${!options[@]}"; do                       # 遍历所有选项
            label=$(echo "${options[$i]}" | cut -d'|' -f2-) # 提取IDE名称
            if [ "$i" -eq "$selected" ]; then               # 当前选中的项
                printf "  ${CYAN}➤ %s${NC}\n" "[$((i + 1))] $label" > /dev/tty
            else # 其他项
                printf "    %s\n" "[$((i + 1))] $label" > /dev/tty
            fi
        done

        read -rsn1 key < /dev/tty        # 读取1个字符
        if [[ "$key" == $'\x1b' ]]; then # ESC字符开头, 方向键功能键等按键都是 ESC 开头
            key2=""
            # 再读2个字符（方向键序列），无等待；读不到则视为单独按下 Esc
            # 注意: 这里使用 -t 1 设置1秒超时，避免阻塞
            # macOS的read命令-t参数不支持小数，因此使用 -t 1, 会导致点击 Esc 后，会有1秒延迟, 然后才会退出
            # 这是因为 macOS 的 bash 版本较旧，read 命令的 -t 参数只能接受整数秒数作为超时值。
            # 如果使用-t 0, 则会立即返回, 导致无法正确读取方向键序列。上下按键均会被识别为单独的 Esc 按键，从而无法实现预期的交互效果。
            if ! read -rsn2 -t 1 key2 < /dev/tty; then
                key2=""
            fi
            case "$key2" in
                "[A" | "OA") selected=$(((selected - 1 + count) % count)) ;; # [A:上箭头, OA:上箭头（兼容）
                "[B" | "OB") selected=$(((selected + 1) % count)) ;;         # [B:下箭头, OB:下箭头（兼容）
                "[C" | "OC") : ;;                                            # 右箭头忽略
                "[D" | "OD") : ;;                                            # 左箭头忽略
                # 功能键（忽略）
                "[11~" | "[12~" | "[13~" | "[14~" | "[15~" | "[17~" | "[18~" | "[19~" | "[20~" | "[21~" | "[23~" | "[24~" | "[2~" | "[3~" | "[1~" | "[4~" | "[5~" | "[6~" | "[H" | "[F")
                    :
                    ;; # 忽略所有功能键
                *)     # 其他情况视为 Esc
                    printf "\033[?25h" > /dev/tty
                    echo "" > /dev/tty
                    return 1
                    ;;
            esac
        elif [[ "$key" == "" ]]; then      # 空字符 = 回车
            printf "\033[?25h" > /dev/tty  # 恢复光标
            break                          # 确认选择，退出循环
        elif [[ "$key" =~ ^[1-9]$ ]]; then # 数字键快速选择
            idx=$((key - 1))
            if [ "$idx" -ge 0 ] && [ "$idx" -lt "$count" ]; then
                selected="$idx"
                printf "\033[?25h" > /dev/tty
                # break
            fi
        fi

        printf "\033[%sA" "$count" > /dev/tty # 上移光标到列表顶部
    done

    echo "${options[$selected]}"
}

# 主逻辑（按步骤组织）
print_header() {
    clear
    echo -e "${CYAN}╔══════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}           ${GREEN}Shell Formatter${NC} 扩展安装              ${CYAN}║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════╝${NC}"
    echo ""
}

step_read_version() {
    echo -e "${MAGENTA}▶ 步骤 1/6${NC} 读取版本信息"
    echo -e "${GRAY}─────────────────────────────────────────${NC}"
    echo "  📋 正在读取 package.json..."

    PACKAGE_VERSION=$(get_package_version)

    if [ -z "$PACKAGE_VERSION" ]; then
        echo -e "  ${RED}✗${NC} 错误: 无法从 package.json 读取版本号"
        exit 1
    fi

    echo -e "  ${GREEN}✓${NC} 目标版本: ${YELLOW}${PACKAGE_VERSION}${NC}"
    echo ""
}

step_find_vsix() {
    echo -e "${MAGENTA}▶ 步骤 2/6${NC} 查找扩展包"
    echo -e "${GRAY}─────────────────────────────────────────${NC}"
    echo "  📦 正在查找扩展包..."

    VSIX_FILE=$(get_vsix_file "$PACKAGE_VERSION")

    if [ -z "$VSIX_FILE" ]; then
        echo -e "  ${RED}✗${NC} 错误: 未找到 shell-formatter-${PACKAGE_VERSION}.vsix 文件"
        echo ""
        echo -e "${YELLOW}  期望的文件:${NC} shell-formatter-${PACKAGE_VERSION}.vsix"
        echo ""
        echo -e "${CYAN}  💡 请先运行打包命令:${NC}"
        echo -e "      ${GRAY}npm run package:extension${NC}"
        exit 1
    fi

    VSIX_NAME=$(basename "$VSIX_FILE")
    echo -e "  ${GREEN}✓${NC} 找到扩展包: ${YELLOW}${VSIX_NAME}${NC}"
    echo ""
}

step_detect_ides() {
    echo -e "${MAGENTA}▶ 步骤 3/6${NC} 检测 IDE 环境"
    echo -e "${GRAY}─────────────────────────────────────────${NC}\n"
    echo -e "${BLUE}• > IDE 安装检测${NC}"

    AVAILABLE_IDES=$(detect_ides)
    IDE_COUNT=$(echo "$AVAILABLE_IDES" | grep -c "|" || echo "0")

    if [ "$IDE_COUNT" -eq 0 ]; then
        echo -e "${RED}  ❌ 结果: 未检测到 VSCode 或 Cursor${NC}"
        echo ""
        echo "请确保已安装 VSCode 或 Cursor"
        exit 1
    fi

    echo -e "${GREEN}  ✅ 结果: 发现 $IDE_COUNT 个 IDE${NC}"
    echo ""

    echo -e "${BLUE}• > code 命令指向IDE分析${NC}"

    # 探测 code 命令指向
    CODE_PATH=$(which code 2> /dev/null || echo "")
    CODE_REAL_PATH=$(resolve_cmd_path "$CODE_PATH")
    CODE_MATCH_REASON=""
    if [ -n "$CODE_REAL_PATH" ]; then
        if echo "$CODE_REAL_PATH" | grep -qi "Cursor.app" || echo "$CODE_REAL_PATH" | grep -qi "/cursor$"; then
            CODE_MATCH_REASON="realpath 匹配 Cursor"
        elif echo "$CODE_REAL_PATH" | grep -qi "Visual Studio Code - Insiders.app"; then
            CODE_MATCH_REASON="realpath 匹配 VSCode Insiders"
        elif echo "$CODE_REAL_PATH" | grep -qi "Visual Studio Code.app"; then
            CODE_MATCH_REASON="realpath 匹配 VSCode"
        fi
    fi
    if [ -n "$CODE_PATH" ]; then
        if [ "$CODE_REAL_PATH" != "$CODE_PATH" ]; then
            echo -e "${GREEN}  ✅ code命令路径: $CODE_PATH -> $CODE_REAL_PATH${NC}"
        else
            echo -e "${GREEN}  ✅ code命令路径: $CODE_PATH${NC}"
        fi
    else
        echo -e "${YELLOW}  ⚠️  code命令路径: 未找到${NC}"
    fi

    # 默认 IDE（code 命令指向）
    DEFAULT_IDE=$(get_default_ide)
    if [ -n "$DEFAULT_IDE" ]; then
        if [ -n "$CODE_MATCH_REASON" ]; then
            echo -e "${GREEN}  ✅ 指向IDE: $DEFAULT_IDE (${CODE_MATCH_REASON})${NC}"
        else
            echo -e "${GREEN}  ✅ 指向IDE: $DEFAULT_IDE (code --version)${NC}"
        fi
    else
        echo -e "${YELLOW}  ⚠️  指向IDE: 未能识别${NC}"
    fi

    echo ""

    # 计算默认选项编号（用于列表标注）
    default_choice=""
    i=1
    while IFS='|' read -r id _ _ _ _; do
        if [ -n "$id" ]; then
            if [ "$id" = "$DEFAULT_IDE" ]; then
                default_choice="$i"
            fi
            i=$((i + 1))
        fi
    done << EOF
$AVAILABLE_IDES
EOF

    # 如果默认 IDE 不在列表中，默认选择第一个
    if [ -z "$default_choice" ]; then
        default_choice="1"
    fi

    # 显示 IDE 列表和安装路径
    echo -e "${BLUE}• 共发现${IDE_COUNT}个IDE:${NC}"
    i=1
    while IFS='|' read -r _ name _ _ app_cmd; do
        if [ -n "$name" ]; then
            app_path=$(get_app_install_path "$(expand_path "$app_cmd")")
            default_mark=""
            if [ "$i" = "$default_choice" ]; then
                default_mark=" (默认IDE: Code命令指向该IDE)"
            fi
            if [ -n "$app_path" ]; then
                printf "   [%s] %s%s - %s\n" "$i" "$name" "$default_mark" "$app_path"
            else
                printf "   [%s] %s%s\n" "$i" "$name" "$default_mark"
            fi
            i=$((i + 1))
        fi
    done << EOF
$AVAILABLE_IDES
EOF

    echo ""
}

step_select_ide() {
    if [ "$IDE_COUNT" -eq 1 ]; then
        SELECTED_IDE=$(echo "$AVAILABLE_IDES" | head -1)
        echo -e "  ${GREEN}✓${NC} 自动选择唯一的 IDE"
        echo ""
        return
    fi

    echo -e "${MAGENTA}▶ 步骤 4/6${NC} 选择目标 IDE"
    echo -e "${GRAY}─────────────────────────────────────────${NC}"
    echo -e "${CYAN}  请选择要安装到的 IDE:${NC}"
    echo ""

    # 临时存储选择返回的 ID 和名称
    selected_ide_info=$(select_ide_interactive)
    if [ -z "$selected_ide_info" ]; then
        echo -e "  ${RED}✗${NC} 未选择 IDE"
        exit 1
    fi

    # 提取 ID 并从可用列表中获取完整信息
    selected_id=$(echo "$selected_ide_info" | cut -d'|' -f1)
    SELECTED_IDE=$(echo "$AVAILABLE_IDES" | grep -m1 "^${selected_id}|")

    # 验证是否成功找到匹配的 IDE
    if [ -z "$SELECTED_IDE" ]; then
        echo -e "  ${RED}✗${NC} 错误: 未能找到匹配的 IDE (ID: ${selected_id})"
        exit 1
    fi

    echo ""
}

step_parse_ide() {
    echo -e "${MAGENTA}▶ 步骤 5/6${NC} 解析 IDE 信息"
    echo -e "${GRAY}─────────────────────────────────────────${NC}"
    echo ""

    IFS='|' read -r IDE_ID IDE_NAME IDE_CMD IDE_DIR IDE_APP_CMD << EOF
$SELECTED_IDE
EOF

    IDE_DIR=$(expand_path "$IDE_DIR")
    IDE_APP_CMD=$(expand_path "$IDE_APP_CMD")

    echo -e "${BLUE}🖥️  安装目标: $IDE_NAME${NC}"
    echo "   命令: $IDE_CMD"
    echo "   目录: $IDE_DIR"
    echo "   App 命令: $IDE_APP_CMD"
    echo ""
}

install_with_command() {
    INSTALL_METHOD="$1"
    cmd="$2"

    echo "安装方式: $INSTALL_METHOD"
    if install_by_command "$cmd" "$IDE_NAME" "$VSIX_FILE"; then
        INSTALL_SUCCESS=true
        return 0
    fi
    return 1
}

install_with_unzip() {
    INSTALL_METHOD="解压安装"
    echo "安装方式: $INSTALL_METHOD"
    echo ""
    if install_by_unzip "$IDE_DIR" "$IDE_NAME" "$VSIX_FILE" "$PACKAGE_VERSION"; then
        INSTALL_SUCCESS=true
        return 0
    fi
    return 1
}

step_install() {
    echo -e "${MAGENTA}▶ 步骤 6/6${NC} 安装扩展"
    echo -e "${GRAY}─────────────────────────────────────────${NC}"
    echo ""

    INSTALL_SUCCESS=false
    INSTALL_METHOD=""

    # 业务逻辑：
    # 1) 选择 code 指向的 IDE -> 使用 code 命令安装
    # 2) 选择非 code 指向的 IDE -> 使用对应IDE目录下的code命令安装，找不到则解压安装
    IS_DEFAULT_IDE=false
    if [ -n "$DEFAULT_IDE" ] && [ "$IDE_ID" = "$DEFAULT_IDE" ]; then
        IS_DEFAULT_IDE=true
    fi

    if [ "$IS_DEFAULT_IDE" = true ]; then
        # 功能5: 用户选择了code指向IDE，用code命令安装
        echo -e "${CYAN}📦 安装策略: 使用 code 命令安装 (code指向的IDE)${NC}"
        echo ""

        if command -v code > /dev/null 2>&1; then
            if install_with_command "命令安装 (code)" "code"; then
                return
            fi
            echo ""
            echo -e "${YELLOW}⚠️  code命令安装失败，尝试解压方式...${NC}"
        else
            echo -e "${YELLOW}⚠️  未找到 code 命令，使用解压方式安装${NC}"
            echo ""
        fi

        install_with_unzip
        return
    fi

    # 功能6: 用户选择了非code指向的IDE，使用对应IDE目录下的code命令安装，找不到则解压安装
    echo -e "${CYAN}📦 安装策略: 使用IDE目录下的code命令 (非code指向的IDE)${NC}"
    echo ""

    # IDE_APP_CMD 是对应IDE目录下的code命令 (如: /Applications/Cursor.app/Contents/Resources/app/bin/cursor)
    if [ -n "$IDE_APP_CMD" ] && [ -x "$IDE_APP_CMD" ]; then
        if install_with_command "命令安装 (IDE内置: $IDE_APP_CMD)" "$IDE_APP_CMD"; then
            return
        fi
        echo ""
        echo -e "${YELLOW}⚠️  IDE内置code命令安装失败，尝试解压方式...${NC}"
    else
        echo -e "${YELLOW}⚠️  未找到IDE内置code命令 ($IDE_APP_CMD)，使用解压方式安装${NC}"
        echo ""
    fi

    install_with_unzip
}

show_result() {
    if [ "$INSTALL_SUCCESS" = true ]; then
        echo ""
        echo -e "${GREEN}=========================================${NC}"
        echo -e "${GREEN}  ✅ 安装成功！${NC}"
        echo -e "${GREEN}=========================================${NC}"
        echo ""
        echo "📋 扩展信息:"
        echo "   名称: Shell Formatter"
        echo "   版本: $PACKAGE_VERSION"
        echo "   发布者: bdq460"
        echo "   安装位置: $IDE_NAME"
        if [ -n "$INSTALL_METHOD" ]; then
            echo "   安装方式: $INSTALL_METHOD"
        fi
        echo ""
        echo "💡 使用提示:"
        echo "   1. 重启 $IDE_NAME"
        echo "   2. 打开或创建一个 .sh/.bash/.zsh 文件"
        echo "   3. 使用快捷键 Ctrl+Shift+P"
        echo "   4. 输入 'Shell Formatter' 查看可用命令"
        echo ""
        return
    fi

    echo ""
    echo -e "${RED}=========================================${NC}"
    echo -e "${RED}  ❌ 安装失败${NC}"
    echo -e "${RED}=========================================${NC}"
    echo ""
    echo "可能的解决方案:"
    echo "   1. 检查 $IDE_NAME 是否已安装"
    echo "   2. 检查是否有权限问题"
    echo "   3. 确保 unzip 命令可用"
    echo "   4. 尝试手动安装:"
    echo "      unzip \"$VSIX_FILE\" -d ${IDE_DIR}/bdq460.shell-formatter-${PACKAGE_VERSION}"
    exit 1
}

main() {
    print_header
    step_read_version
    step_find_vsix
    step_detect_ides
    step_select_ide
    step_parse_ide
    step_install
    show_result
}

main "$@"

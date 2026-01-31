/**
 * 国际化（i18n）模块
 *
 * 功能：
 * - 自动检测 VSCode 语言设置
 * - 根据语言加载对应的语言包
 * - 提供字符串翻译功能
 * - 支持参数化翻译
 * - 语言包加载失败回退机制
 *
 * 支持语言：
 * - en: English
 * - zh: 简体中文
 * - zh-tw: 繁體中文
 * - ja: 日本語
 * - ko: 한국어
 * - de: Deutsch
 * - fr: Français
 * - es: Español
 * - ar: العربية
 * - vi: Tiếng Việt
 * - hi: हिन्दी
 * - ru: Русский
 * - pt: Português
 * - it: Italiano
 * - tr: Türkçe
 * - pl: Polski
 * - th: ไทย
 */

import * as vscode from "vscode";

// 导入所有语言包
import ar from "./locales/ar.json";
import de from "./locales/de.json";
import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import hi from "./locales/hi.json";
import it from "./locales/it.json";
import ja from "./locales/ja.json";
import ko from "./locales/ko.json";
import pl from "./locales/pl.json";
import pt from "./locales/pt.json";
import ru from "./locales/ru.json";
import th from "./locales/th.json";
import tr from "./locales/tr.json";
import vi from "./locales/vi.json";
import zh from "./locales/zh.json";
import zhTw from "./locales/zh-tw.json";

/**
 * 语言包类型定义
 */
type LocaleMessages = typeof en;

/**
 * 支持的语言
 */
type SupportedLocale = "en" | "zh" | "zh-tw" | "ja" | "ko" | "de" | "fr" | "es" | "ar" | "vi" | "hi" | "ru" | "pt" | "it" | "tr" | "pl" | "th";

/**
 * 语言包映射
 */
const localeMessages: Record<SupportedLocale, LocaleMessages> = {
    en,
    zh,
    "zh-tw": zhTw,
    ja,
    ko,
    de,
    fr,
    es,
    ar,
    vi,
    hi,
    ru,
    pt,
    it,
    tr,
    pl,
    th,
};

/**
 * 语言代码映射（处理变体）
 */
const localeMapping: Record<string, SupportedLocale> = {
    // 英语
    "en": "en",
    "en-US": "en",
    "en-GB": "en",
    // 简体中文
    "zh": "zh",
    "zh-CN": "zh",
    "zh-Hans": "zh",
    // 繁体中文
    "zh-TW": "zh-tw",
    "zh-HK": "zh-tw",
    "zh-MO": "zh-tw",
    "zh-Hant": "zh-tw",
    // 日语
    "ja": "ja",
    "ja-JP": "ja",
    // 韩语
    "ko": "ko",
    "ko-KR": "ko",
    // 德语
    "de": "de",
    "de-DE": "de",
    // 法语
    "fr": "fr",
    "fr-FR": "fr",
    // 西班牙语
    "es": "es",
    "es-ES": "es",
    // 阿拉伯语
    "ar": "ar",
    "ar-SA": "ar",
    // 越南语
    "vi": "vi",
    "vi-VN": "vi",
    // 印地语
    "hi": "hi",
    "hi-IN": "hi",
    // 俄语
    "ru": "ru",
    "ru-RU": "ru",
    // 葡萄牙语
    "pt": "pt",
    "pt-BR": "pt",
    "pt-PT": "pt",
    // 意大利语
    "it": "it",
    "it-IT": "it",
    "it-CH": "it",
    // 土耳其语
    "tr": "tr",
    "tr-TR": "tr",
    // 波兰语
    "pl": "pl",
    "pl-PL": "pl",
    // 泰语
    "th": "th",
    "th-TH": "th",
};

/**
 * 当前使用的语言
 */
let currentLocale: SupportedLocale = "en";

/**
 * 回退语言（当当前语言包加载失败时使用）
 */
const fallbackLocale: SupportedLocale = "en";

/**
 * 检测 VSCode 当前语言
 *
 * @returns 检测到的语言代码
 */
function detectLocale(): SupportedLocale {
    const vscodeLocale = vscode.env.language;

    // 尝试精确匹配
    if (localeMapping[vscodeLocale]) {
        return localeMapping[vscodeLocale];
    }

    // 尝试前缀匹配（如 "en-US" -> "en"）
    const baseLocale = vscodeLocale.split("-")[0];
    if (localeMapping[baseLocale]) {
        return localeMapping[baseLocale];
    }

    // 默认使用英文
    return "en";
}

/**
 * 获取语言包
 *
 * @param locale 语言代码
 * @returns 语言包对象
 */
function getLocaleMessages(locale: SupportedLocale): LocaleMessages {
    const messages = localeMessages[locale];
    if (!messages) {
        console.warn(`[i18n] Locale "${locale}" not found, falling back to "${fallbackLocale}"`);
        return localeMessages[fallbackLocale];
    }
    return messages;
}

/**
 * 初始化 i18n 模块
 *
 * 自动检测 VSCode 语言并加载对应的语言包
 */
export function initializeI18n(): void {
    currentLocale = detectLocale();
    console.log(`[i18n] Initialized with locale: ${currentLocale}`);
}

/**
 * 获取当前语言
 *
 * @returns 当前语言代码
 */
export function getCurrentLocale(): SupportedLocale {
    return currentLocale;
}

/**
 * 获取所有支持的语言
 *
 * @returns 支持的语言代码数组
 */
export function getSupportedLocales(): SupportedLocale[] {
    return Object.keys(localeMessages) as SupportedLocale[];
}

/**
 * 翻译字符串（支持参数化）
 *
 * 使用方式：
 * - t("messages.noActiveDocument")
 * - t("messages.partialFixSuccess", { count: 5, remaining: 2 })
 *
 * @param key 翻译键（使用点号分隔路径）
 * @param params 可选的参数对象
 * @returns 翻译后的字符串
 */
export function t(key: string, params?: Record<string, string | number>): string {
    const messages = getLocaleMessages(currentLocale);

    // 解析键路径（例如："common.enabled"）
    const keys = key.split(".");
    let value: unknown = messages;

    // 遍历路径获取值
    for (const k of keys) {
        if (value && typeof value === "object" && k in value) {
            value = (value as Record<string, unknown>)[k];
        } else {
            // 键不存在，尝试从回退语言获取
            const fallbackMessages = getLocaleMessages(fallbackLocale);
            let fallbackValue: unknown = fallbackMessages;
            for (const fk of keys) {
                if (fallbackValue && typeof fallbackValue === "object" && fk in fallbackValue) {
                    fallbackValue = (fallbackValue as Record<string, unknown>)[fk];
                } else {
                    console.warn(`[i18n] Translation key not found: ${key}`);
                    return key;
                }
            }
            value = fallbackValue;
            break;
        }
    }

    // 确保值是字符串
    if (typeof value !== "string") {
        console.warn(`[i18n] Translation value is not a string: ${key}`);
        return key;
    }

    // 替换参数（例如："Hello {name}" -> "Hello World"）
    if (params) {
        return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
            const paramValue = params[paramKey];
            return paramValue !== undefined ? String(paramValue) : match;
        });
    }

    return value;
}

/**
 * 切换语言（用于测试或手动切换）
 *
 * @param locale 新的语言代码
 * @returns 是否切换成功
 */
export function setLocale(locale: SupportedLocale): boolean {
    if (!localeMessages[locale]) {
        console.warn(`[i18n] Cannot set locale "${locale}": not supported`);
        return false;
    }
    currentLocale = locale;
    console.log(`[i18n] Locale switched to: ${locale}`);
    return true;
}

/**
 * 检查是否支持指定语言
 *
 * @param locale 语言代码
 * @returns 是否支持
 */
export function isLocaleSupported(locale: string): boolean {
    return locale in localeMessages;
}

/**
 * Agent Tools 模块
 *
 * 定义签证助手 Agent 可以调用的工具：
 *   1. get_visa_info — 获取某国签证详细信息
 *   2. compare_countries — 对比多国签证（费用、时间、难度）
 *   3. list_supported_countries — 列出所有支持查询的国家
 *   4. search_by_condition — 按条件筛选国家（免签、落地签、费用低等）
 *
 * 每个工具包含：
 *   - OpenAI Function Calling 格式的 schema（给模型看）
 *   - 实际执行函数（服务端执行）
 */

import fs from "fs";
import path from "path";

// ============================================================
// 数据层
// ============================================================

const DATA_DIR = path.join(process.cwd(), "src", "data");

const COUNTRY_REGISTRY: Record<
  string,
  { file: string; name: string; flag: string; type: string }
> = {
  japan: { file: "japan_tourist_visa.json", name: "日本", flag: "🇯🇵", type: "需签证" },
  thailand: { file: "thailand_tourist_visa.json", name: "泰国", flag: "🇹🇭", type: "免签" },
  france: { file: "france_schengen_visa.json", name: "法国", flag: "🇫🇷", type: "申根签证" },
  usa: { file: "usa_b1b2_visa.json", name: "美国", flag: "🇺🇸", type: "需签证" },
  uk: { file: "uk_standard_visitor_visa.json", name: "英国", flag: "🇬🇧", type: "需签证" },
  korea: { file: "korea_tourist_visa.json", name: "韩国", flag: "🇰🇷", type: "部分免签" },
  singapore: { file: "singapore_visa_free.json", name: "新加坡", flag: "🇸🇬", type: "免签" },
  uae: { file: "uae_visa_free.json", name: "阿联酋", flag: "🇦🇪", type: "免签" },
  australia: { file: "australia_visitor_visa.json", name: "澳大利亚", flag: "🇦🇺", type: "需签证" },
  canada: { file: "canada_visitor_visa.json", name: "加拿大", flag: "🇨🇦", type: "需签证" },
  malaysia: { file: "malaysia_visa_free.json", name: "马来西亚", flag: "🇲🇾", type: "免签" },
};

// 国家别名映射（用于模糊匹配）
const COUNTRY_ALIASES: Record<string, string> = {
  日本: "japan",
  japan: "japan",
  jp: "japan",
  泰国: "thailand",
  thailand: "thailand",
  th: "thailand",
  法国: "france",
  france: "france",
  fr: "france",
  美国: "usa",
  usa: "usa",
  us: "usa",
  america: "usa",
  英国: "uk",
  uk: "uk",
  britain: "uk",
  england: "uk",
  韩国: "korea",
  korea: "korea",
  kr: "korea",
  新加坡: "singapore",
  singapore: "singapore",
  sg: "singapore",
  阿联酋: "uae",
  迪拜: "uae",
  uae: "uae",
  dubai: "uae",
  澳大利亚: "australia",
  澳洲: "australia",
  australia: "australia",
  au: "australia",
  加拿大: "canada",
  canada: "canada",
  ca: "canada",
  马来西亚: "malaysia",
  大马: "malaysia",
  malaysia: "malaysia",
  my: "malaysia",
};

function resolveCountryId(input: string): string | null {
  const normalized = input.trim().toLowerCase();
  // 先直接匹配 registry key
  if (COUNTRY_REGISTRY[normalized]) return normalized;
  // 再查别名
  return COUNTRY_ALIASES[normalized] || COUNTRY_ALIASES[input.trim()] || null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function loadCountryData(countryId: string): any | null {
  const entry = COUNTRY_REGISTRY[countryId];
  if (!entry) return null;
  const filePath = path.join(DATA_DIR, entry.file);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

// ============================================================
// 工具 Schema（OpenAI Function Calling 格式）
// ============================================================

export const TOOL_DEFINITIONS = [
  {
    type: "function" as const,
    function: {
      name: "get_visa_info",
      description:
        "获取指定国家的签证详细信息，包括签证类型、所需材料、申请步骤、费用、处理时间、注意事项等。用户询问某国签证时调用此工具。",
      parameters: {
        type: "object",
        properties: {
          country: {
            type: "string",
            description:
              '国家名称或代码，如 "日本"、"japan"、"usa"、"泰国" 等',
          },
          info_type: {
            type: "string",
            enum: ["full", "materials", "steps", "fee", "notes"],
            description:
              "需要的信息类型：full=全部信息，materials=材料清单，steps=申请步骤，fee=费用，notes=注意事项。默认 full。",
          },
        },
        required: ["country"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "compare_countries",
      description:
        "对比两个或多个国家的签证信息（费用、办理时间、是否免签、材料复杂度等），帮助用户决策去哪个国家。",
      parameters: {
        type: "object",
        properties: {
          countries: {
            type: "array",
            items: { type: "string" },
            description: '要对比的国家列表，如 ["日本", "泰国"]',
          },
        },
        required: ["countries"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_supported_countries",
      description:
        "列出当前系统支持查询签证信息的所有国家，包括国家名、是否免签等基本信息。当用户问'支持哪些国家'或不确定去哪里时调用。",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "search_by_condition",
      description:
        "根据用户的条件筛选合适的国家，如'免签的国家'、'费用最低的'、'办理最快的'等。",
      parameters: {
        type: "object",
        properties: {
          condition: {
            type: "string",
            enum: ["visa_free", "low_cost", "fast_processing", "easy_materials"],
            description:
              "筛选条件：visa_free=免签/落地签，low_cost=费用低，fast_processing=办理快，easy_materials=材料简单",
          },
        },
        required: ["condition"],
      },
    },
  },
];

// ============================================================
// 工具执行函数
// ============================================================

function executeGetVisaInfo(args: { country: string; info_type?: string }): string {
  const countryId = resolveCountryId(args.country);
  if (!countryId) {
    return JSON.stringify({
      error: `未找到国家"${args.country}"的签证数据。支持的国家：${Object.values(COUNTRY_REGISTRY).map((c) => c.name).join("、")}`,
    });
  }

  const data = loadCountryData(countryId);
  if (!data) {
    return JSON.stringify({ error: `${args.country}的签证数据文件不存在` });
  }

  const infoType = args.info_type || "full";
  const entry = COUNTRY_REGISTRY[countryId];

  // 根据 info_type 返回不同粒度的信息
  if (infoType === "materials") {
    return JSON.stringify({
      country: entry.name,
      visa_type: data.visa_type,
      required_docs: data.required_docs || data.visa_subtypes?.[0]?.required_docs || [],
      additional_docs_by_situation: data.additional_docs_by_situation || [],
    });
  }

  if (infoType === "steps") {
    return JSON.stringify({
      country: entry.name,
      application_steps: data.application_steps || [],
      application_channel: data.application_channel || "",
      processing_time: data.processing_time || "",
    });
  }

  if (infoType === "fee") {
    return JSON.stringify({
      country: entry.name,
      fee_summary: data.fee_summary || null,
      visa_subtypes: data.visa_subtypes?.map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (s: any) => ({ name: s.name, fee_rmb: s.fee_rmb, fee_gbp: s.fee_gbp })
      ) || [],
    });
  }

  if (infoType === "notes") {
    return JSON.stringify({
      country: entry.name,
      notes: data.notes || [],
      official_links: data.official_links || [],
    });
  }

  // full — 返回完整数据（限制大小，避免超 token）
  // 直接返回 JSON，让模型自己组织回答
  return JSON.stringify(data);
}

function executeCompareCountries(args: { countries: string[] }): string {
  const results = args.countries.map((c) => {
    const countryId = resolveCountryId(c);
    if (!countryId) return { country: c, error: "未找到该国家数据" };

    const data = loadCountryData(countryId);
    if (!data) return { country: c, error: "数据文件不存在" };

    const entry = COUNTRY_REGISTRY[countryId];
    return {
      country: entry.name,
      flag: entry.flag,
      visa_type: entry.type,
      processing_time: data.processing_time || "见详情",
      fee_summary: data.fee_summary || null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      visa_subtypes_count: data.visa_subtypes?.length || 0,
      required_docs_count: data.required_docs?.length || data.visa_subtypes?.[0]?.required_docs?.length || 0,
      notes_highlight: (data.notes || []).slice(0, 3),
    };
  });

  return JSON.stringify({ comparison: results });
}

function executeListSupportedCountries(): string {
  const list = Object.entries(COUNTRY_REGISTRY).map(([id, info]) => ({
    id,
    name: info.name,
    flag: info.flag,
    type: info.type,
  }));
  return JSON.stringify({
    total: list.length,
    countries: list,
  });
}

function executeSearchByCondition(args: { condition: string }): string {
  const results: { name: string; flag: string; reason: string }[] = [];

  for (const [countryId, entry] of Object.entries(COUNTRY_REGISTRY)) {
    const data = loadCountryData(countryId);
    if (!data) continue;

    switch (args.condition) {
      case "visa_free":
        if (entry.type === "免签" || entry.type === "部分免签") {
          results.push({
            name: entry.name,
            flag: entry.flag,
            reason: `${entry.type}${data.processing_time ? "，" + data.processing_time : ""}`,
          });
        }
        break;

      case "low_cost":
        // 收集有明确费用且较低的
        if (entry.type === "免签") {
          results.push({ name: entry.name, flag: entry.flag, reason: "免签，无签证费用" });
        }
        break;

      case "fast_processing":
        if (entry.type === "免签" || entry.type === "部分免签") {
          results.push({ name: entry.name, flag: entry.flag, reason: "免签，无需办理" });
        } else if (data.processing_time) {
          results.push({
            name: entry.name,
            flag: entry.flag,
            reason: `办理时间：${data.processing_time}`,
          });
        }
        break;

      case "easy_materials":
        if (entry.type === "免签") {
          results.push({ name: entry.name, flag: entry.flag, reason: "免签，无需额外材料" });
        }
        break;
    }
  }

  return JSON.stringify({
    condition: args.condition,
    results,
  });
}

// ============================================================
// 统一执行入口
// ============================================================

export function executeTool(name: string, args: string): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let parsedArgs: any;
  try {
    parsedArgs = JSON.parse(args);
  } catch {
    return JSON.stringify({ error: "工具参数解析失败" });
  }

  switch (name) {
    case "get_visa_info":
      return executeGetVisaInfo(parsedArgs);
    case "compare_countries":
      return executeCompareCountries(parsedArgs);
    case "list_supported_countries":
      return executeListSupportedCountries();
    case "search_by_condition":
      return executeSearchByCondition(parsedArgs);
    default:
      return JSON.stringify({ error: `未知工具: ${name}` });
  }
}

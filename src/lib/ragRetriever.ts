/**
 * RAG 检索层
 *
 * 策略：关键词匹配 + 全文注入（无需向量数据库）
 * 对于结构化的签证 JSON 数据，这比 embedding 更准确、更快、零成本。
 *
 * 流程：
 *   1. 从用户消息中识别目标国家
 *   2. 加载对应的 JSON 数据
 *   3. 将 JSON 序列化为紧凑的文本块，注入 system prompt
 */

import fs from "fs";
import path from "path";

// 国家关键词映射
const COUNTRY_KEYWORDS: Record<string, string[]> = {
  japan: ["日本", "japan", "jp", "东京", "大阪", "京都", "签证", "旅游签"],
  thailand: ["泰国", "thailand", "th", "曼谷", "清迈", "普吉", "落地签", "免签"],
  france: ["法国", "france", "fr", "巴黎", "申根", "schengen", "欧洲", "法签"],
  usa: ["美国", "usa", "us", "america", "b1", "b2", "b签", "美签", "纽约", "洛杉矶"],
  uk: ["英国", "uk", "britain", "england", "london", "伦敦", "英签", "标准访客"],
  korea: ["韩国", "korea", "kr", "首尔", "釜山", "济州", "济州岛", "韩签", "团体免签"],
  singapore: ["新加坡", "singapore", "sg", "狮城", "新加坡免签", "圣淘沙"],
  uae: ["阿联酋", "迪拜", "uae", "dubai", "阿布扎比", "abu dhabi", "中东"],
  australia: ["澳大利亚", "澳洲", "australia", "au", "悉尼", "墨尔本", "堪培拉", "大堡礁", "澳签", "600签证"],
  canada: ["加拿大", "canada", "ca", "多伦多", "温哥华", "渥太华", "加签", "枫叶国"],
  malaysia: ["马来西亚", "malaysia", "my", "吉隆坡", "槟城", "兰卡威", "沙巴", "仙本那", "马签", "大马"],
};

const DATA_DIR = path.join(process.cwd(), "src", "data");

const DATA_FILES: Record<string, string> = {
  japan: "japan_tourist_visa.json",
  thailand: "thailand_tourist_visa.json",
  france: "france_schengen_visa.json",
  usa: "usa_b1b2_visa.json",
  uk: "uk_standard_visitor_visa.json",
  korea: "korea_tourist_visa.json",
  singapore: "singapore_visa_free.json",
  uae: "uae_visa_free.json",
  australia: "australia_visitor_visa.json",
  canada: "canada_visitor_visa.json",
  malaysia: "malaysia_visa_free.json",
};

// 国家中文名
const COUNTRY_NAMES: Record<string, string> = {
  japan: "日本",
  thailand: "泰国",
  france: "法国",
  usa: "美国",
  uk: "英国",
  korea: "韩国",
  singapore: "新加坡",
  uae: "阿联酋（迪拜）",
  australia: "澳大利亚",
  canada: "加拿大",
  malaysia: "马来西亚",
};

/**
 * 从对话历史中识别用户关注的国家
 * 返回国家 id 列表（可能多个，如"法国和英国哪个好办"）
 */
export function detectCountries(messages: { role: string; content: string }[]): string[] {
  // 合并最近几条消息做检测
  const recentText = messages
    .slice(-4)
    .map((m) => m.content)
    .join(" ")
    .toLowerCase();

  const matched: string[] = [];
  for (const [countryId, keywords] of Object.entries(COUNTRY_KEYWORDS)) {
    if (keywords.some((kw) => recentText.includes(kw.toLowerCase()))) {
      matched.push(countryId);
    }
  }
  return matched;
}

/**
 * 加载指定国家的签证数据，序列化为 prompt 友好的文本
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function loadAndSerialize(countryId: string): string {
  const file = DATA_FILES[countryId];
  if (!file) return "";

  const filePath = path.join(DATA_DIR, file);
  if (!fs.existsSync(filePath)) return "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const name = COUNTRY_NAMES[countryId];

  const lines: string[] = [];
  lines.push(`=== ${name}签证数据 ===`);
  lines.push(`签证类型：${data.visa_type}`);
  lines.push(`申请渠道：${data.application_channel || "—"}`);
  lines.push(`办理时间：${data.processing_time || "—"}`);

  // 必备材料
  if (data.required_docs?.length) {
    lines.push("\n【必备材料】");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data.required_docs.forEach((doc: any) => {
      const req = doc.required === false ? "（视情况）" : "（必须）";
      let line = `- ${doc.item}${req}`;
      if (doc.note) line += `：${doc.note}`;
      if (doc.spec) line += `；规格：${doc.spec}`;
      lines.push(line);
      if (doc.options?.length) {
        doc.options.forEach((opt: string) => lines.push(`  · ${opt}`));
      }
    });
  }

  // 视情况补充材料
  if (data.additional_docs_by_situation?.length) {
    lines.push("\n【视情况补充材料】");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data.additional_docs_by_situation.forEach((group: any) => {
      lines.push(`▸ ${group.situation}`);
      const docs = group.docs || [];
      docs.forEach((d: string) => lines.push(`  - ${d}`));
    });
  }

  // 申请步骤
  if (data.application_steps?.length) {
    lines.push("\n【申请流程】");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data.application_steps.forEach((step: any) => {
      lines.push(`${step.step}. ${step.title}：${step.detail}`);
    });
  }

  // 费用
  if (data.fee_summary) {
    lines.push("\n【费用】");
    const fs_ = data.fee_summary;
    if (fs_.visa_fee?.adult) {
      lines.push(`- 成人签证费：${fs_.visa_fee.adult.amount} ${fs_.visa_fee.adult.currency}`);
    }
    if (fs_.application_fee) {
      lines.push(
        `- 申请费：${fs_.application_fee.amount} ${fs_.application_fee.currency}${fs_.application_fee.refundable === false ? "（不可退）" : ""}`
      );
    }
    if (fs_.standard_6m) {
      lines.push(`- 标准6个月：${fs_.standard_6m.amount} ${fs_.standard_6m.currency}`);
    }
    if (fs_.single) {
      lines.push(`- 单次：${fs_.single.amount} ${fs_.single.currency}`);
    }
  }

  // 签证子类型（如美国 B1/B2、英国长期签证）
  if (data.visa_subtypes?.length) {
    lines.push("\n【签证类型】");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data.visa_subtypes.forEach((sub: any) => {
      let line = `- ${sub.name}`;
      if (sub.fee_gbp) line += `：£${sub.fee_gbp}`;
      if (sub.max_stay) line += `，最长停留 ${sub.max_stay}`;
      if (sub.validity) line += `，有效期 ${sub.validity}`;
      lines.push(line);
    });
  }

  // 注意事项
  if (data.notes?.length) {
    lines.push("\n【注意事项】");
    data.notes.forEach((note: string) => lines.push(`- ${note}`));
  }

  // 官方链接
  if (data.official_links?.length) {
    lines.push("\n【官方链接】");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data.official_links.forEach((link: any) => {
      lines.push(`- ${link.name}：${link.url}`);
    });
  }

  return lines.join("\n");
}

/**
 * 构建 RAG system prompt
 */
export function buildSystemPrompt(countryIds: string[]): string {
  const basePrompt = `你是「签证通」的签证助手，专门帮助中国大陆用户了解出境旅游签证信息。

你的回答原则：
1. 只基于下方提供的官方签证数据回答，不要编造或猜测
2. 回答简洁直接，用中文，适当使用列表让信息清晰
3. 材料清单要完整列出，不要遗漏
4. 如果用户问的问题超出数据范围，诚实说明并建议查看官方链接
5. 不推荐任何中介或代办服务
6. 费用信息要注明货币单位`;

  if (countryIds.length === 0) {
    return (
      basePrompt +
      `\n\n目前支持查询的国家：日本、泰国、法国、美国、英国、韩国、新加坡、阿联酋（迪拜）、澳大利亚、加拿大、马来西亚。请告诉我你想去哪个国家，我来帮你查签证材料。`
    );
  }

  const contextBlocks = countryIds.map((id) => loadAndSerialize(id)).filter(Boolean);

  return (
    basePrompt +
    `\n\n以下是相关国家的官方签证数据，请基于此回答用户问题：\n\n` +
    contextBlocks.join("\n\n")
  );
}

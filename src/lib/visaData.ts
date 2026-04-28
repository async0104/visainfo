// 签证数据统一入口
// 每个 JSON 文件对应一个国家，结构略有差异，这里做统一的元数据索引

export interface CountryMeta {
  id: string;           // URL slug，如 japan
  country: string;      // 中文国家名
  flag: string;         // emoji 国旗
  visaType: string;     // 签证类型描述
  fee: string;          // 费用摘要（展示用）
  processingTime: string;
  difficulty: 'easy' | 'medium' | 'hard'; // 办理难度（主观评估）
  dataFile: string;     // JSON 文件名
  popular: boolean;     // 是否热门目的地
}

export const COUNTRIES: CountryMeta[] = [
  {
    id: 'japan',
    country: '日本',
    flag: '🇯🇵',
    visaType: '旅游签证',
    fee: '¥145（单次）',
    processingTime: '5个工作日',
    difficulty: 'medium',
    dataFile: 'japan_tourist_visa.json',
    popular: true,
  },
  {
    id: 'thailand',
    country: '泰国',
    flag: '🇹🇭',
    visaType: '旅游签证',
    fee: '免签（30天）',
    processingTime: '落地签/免签',
    difficulty: 'easy',
    dataFile: 'thailand_tourist_visa.json',
    popular: true,
  },
  {
    id: 'france',
    country: '法国',
    flag: '🇫🇷',
    visaType: '申根短期签证',
    fee: '€80（约¥620）',
    processingTime: '约15个工作日',
    difficulty: 'hard',
    dataFile: 'france_schengen_visa.json',
    popular: true,
  },
  {
    id: 'usa',
    country: '美国',
    flag: '🇺🇸',
    visaType: 'B-1/B-2 访客签证',
    fee: '$185',
    processingTime: '面签后数周',
    difficulty: 'hard',
    dataFile: 'usa_b1b2_visa.json',
    popular: true,
  },
  {
    id: 'uk',
    country: '英国',
    flag: '🇬🇧',
    visaType: '标准访客签证',
    fee: '£135（约¥1250）',
    processingTime: '约3周',
    difficulty: 'hard',
    dataFile: 'uk_standard_visitor_visa.json',
    popular: true,
  },
];

export function getCountryById(id: string): CountryMeta | undefined {
  return COUNTRIES.find((c) => c.id === id);
}

// 动态加载某国签证详情 JSON（仅在服务端/构建时使用）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function loadVisaDetail(dataFile: string): Promise<any> {
  const fs = await import('fs');
  const path = await import('path');
  const filePath = path.join(process.cwd(), 'src', 'data', dataFile);
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

import { notFound } from "next/navigation";
import Link from "next/link";
import { COUNTRIES, getCountryById, loadVisaDetail } from "@/lib/visaData";
import VisaChat from "@/components/VisaChat";

// 静态生成所有国家页面
export async function generateStaticParams() {
  return COUNTRIES.map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const meta = getCountryById(id);
  if (!meta) return {};
  return {
    title: `${meta.country}${meta.visaType}材料清单 · 签证通`,
    description: `${meta.country}${meta.visaType}所需材料、费用、办理流程，数据来源官方使馆，中国公民适用。`,
  };
}

// 通用材料列表渲染
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DocList({ docs }: { docs: any[] }) {
  if (!docs || docs.length === 0) return null;
  return (
    <ul className="space-y-2">
      {docs.map((doc, i) => (
        <li key={i} className="flex items-start gap-3">
          <span
            className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
              doc.required === false
                ? "bg-gray-100 text-gray-400"
                : "bg-blue-100 text-blue-600"
            }`}
          >
            {doc.required === false ? "○" : "✓"}
          </span>
          <div className="flex-1 min-w-0">
            <span className="text-sm text-gray-800">
              {doc.item}
              {doc.required === false && (
                <span className="ml-1 text-xs text-gray-400">（视情况）</span>
              )}
            </span>
            {doc.note && (
              <p className="text-xs text-gray-500 mt-0.5">{doc.note}</p>
            )}
            {doc.spec && (
              <p className="text-xs text-gray-500 mt-0.5">{doc.spec}</p>
            )}
            {doc.options && (
              <ul className="mt-1 space-y-0.5">
                {doc.options.map((opt: string, j: number) => (
                  <li key={j} className="text-xs text-gray-500 pl-2 border-l-2 border-gray-200">
                    {opt}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

// 步骤列表
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function StepList({ steps }: { steps: any[] }) {
  if (!steps || steps.length === 0) return null;
  return (
    <ol className="space-y-4">
      {steps.map((step, i) => (
        <li key={i} className="flex gap-4">
          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
            {step.step || i + 1}
          </div>
          <div className="flex-1 pt-0.5">
            <p className="font-semibold text-sm text-gray-800">{step.title}</p>
            <p className="text-sm text-gray-500 mt-0.5">{step.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default async function CountryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const meta = getCountryById(id);
  if (!meta) notFound();

  const detail = await loadVisaDetail(meta.dataFile);

  return (
    <div>
      {/* 面包屑 */}
      <nav className="text-sm text-gray-400 mb-6 flex items-center gap-1">
        <Link href="/" className="hover:text-blue-600 transition-colors">首页</Link>
        <span>/</span>
        <span className="text-gray-700">{meta.country}{meta.visaType}</span>
      </nav>

      {/* 页头 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <span className="text-5xl">{meta.flag}</span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {meta.country} · {meta.visaType}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              适用人群：中国大陆公民 · 数据来源：
              <a
                href={detail.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                官方页面
              </a>
            </p>
          </div>
        </div>

        {/* 关键信息速览 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-400">签证费</p>
            <p className="font-bold text-gray-800 mt-0.5">{meta.fee}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">办理时间</p>
            <p className="font-bold text-gray-800 mt-0.5">{meta.processingTime}</p>
          </div>
          {detail.validity_typical && (
            <div>
              <p className="text-xs text-gray-400">有效期</p>
              <p className="font-bold text-gray-800 mt-0.5">{detail.validity_typical.duration}</p>
            </div>
          )}
          {detail.application_channel && (
            <div className="col-span-2 sm:col-span-1">
              <p className="text-xs text-gray-400">申请渠道</p>
              <p className="font-bold text-gray-800 mt-0.5 text-sm leading-tight">{detail.application_channel}</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧主内容 */}
        <div className="lg:col-span-2 space-y-6">

          {/* 必备材料 */}
          {detail.required_docs && detail.required_docs.length > 0 && (
            <section className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-blue-500">📋</span> 必备材料清单
              </h2>
              <DocList docs={detail.required_docs} />
            </section>
          )}

          {/* 视情况补充材料 */}
          {detail.additional_docs_by_situation && detail.additional_docs_by_situation.length > 0 && (
            <section className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-yellow-500">📎</span> 视情况补充材料
              </h2>
              <div className="space-y-4">
                {detail.additional_docs_by_situation.map(
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (group: any, i: number) => (
                    <div key={i}>
                      <p className="text-sm font-semibold text-gray-700 mb-2">
                        {group.situation}
                      </p>
                      <ul className="space-y-1">
                        {group.docs.map((doc: string, j: number) => (
                          <li key={j} className="text-sm text-gray-600 flex items-start gap-2">
                            <span className="text-gray-300 mt-0.5">—</span>
                            {doc}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                )}
              </div>
            </section>
          )}

          {/* 申请步骤 */}
          {detail.application_steps && detail.application_steps.length > 0 && (
            <section className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-green-500">🗂️</span> 申请流程
              </h2>
              <StepList steps={detail.application_steps} />
            </section>
          )}
        </div>

        {/* 右侧边栏 */}
        <div className="space-y-4">
          {/* 注意事项 */}
          {detail.notes && detail.notes.length > 0 && (
            <section className="bg-amber-50 rounded-xl border border-amber-200 p-5">
              <h2 className="font-bold text-amber-800 mb-3 text-sm flex items-center gap-1">
                <span>⚠️</span> 注意事项
              </h2>
              <ul className="space-y-2">
                {detail.notes.map((note: string, i: number) => (
                  <li key={i} className="text-xs text-amber-700 leading-relaxed">
                    · {note}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* 费用明细 */}
          {detail.fee_summary && (
            <section className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-bold text-gray-900 mb-3 text-sm flex items-center gap-1">
                <span>💰</span> 费用明细
              </h2>
              <div className="space-y-2 text-sm">
                {Object.entries(detail.fee_summary).map(([key, val]: [string, unknown]) => {
                  if (key === 'refundable' || key === 'note') return null;
                  const v = val as Record<string, unknown>;
                  if (typeof v === 'object' && v !== null && 'amount' in v) {
                    return (
                      <div key={key} className="flex justify-between">
                        <span className="text-gray-500">{key}</span>
                        <span className="font-semibold">
                          {String(v.amount)} {String(v.currency)}
                        </span>
                      </div>
                    );
                  }
                  return null;
                })}
                {detail.fee_summary.refundable === false && (
                  <p className="text-xs text-gray-400 pt-1 border-t border-gray-100">
                    签证费不可退还
                  </p>
                )}
              </div>
            </section>
          )}

          {/* 官方链接 */}
          {detail.official_links && detail.official_links.length > 0 && (
            <section className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-bold text-gray-900 mb-3 text-sm flex items-center gap-1">
                <span>🔗</span> 官方链接
              </h2>
              <ul className="space-y-2">
                {detail.official_links.map(
                  (link: { name: string; url: string }, i: number) => (
                    <li key={i}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline leading-relaxed"
                      >
                        {link.name} ↗
                      </a>
                    </li>
                  )
                )}
              </ul>
            </section>
          )}

          {/* 数据更新时间 */}
          <p className="text-xs text-gray-400 text-center">
            数据抓取时间：{detail.data_fetched}
            <br />
            以官方最新公告为准
          </p>
        </div>
      </div>

      {/* 悬浮 AI 签证助手 */}
      <VisaChat
        countryId={meta.id}
        countryName={meta.country}
        flag={meta.flag}
      />
    </div>
  );
}

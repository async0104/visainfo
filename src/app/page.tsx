import Link from "next/link";
import { COUNTRIES } from "@/lib/visaData";

const difficultyLabel = {
  easy: { text: "简单", color: "bg-green-100 text-green-700" },
  medium: { text: "中等", color: "bg-yellow-100 text-yellow-700" },
  hard: { text: "较难", color: "bg-red-100 text-red-700" },
};

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="text-center py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          出境签证，一查就懂
        </h1>
        <p className="text-gray-500 text-base max-w-xl mx-auto">
          数据来源官方使馆，材料清单、费用、流程一目了然。
          <br />
          不卖课、不接广告、不推中介，只做干净的签证信息。
        </p>
      </section>

      {/* 国家卡片列表 */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          热门目的地
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {COUNTRIES.map((c) => {
            const diff = difficultyLabel[c.difficulty];
            return (
              <Link
                key={c.id}
                href={`/country/${c.id}`}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-400 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-4xl">{c.flag}</span>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${diff.color}`}
                  >
                    {diff.text}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {c.country}
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">{c.visaType}</p>
                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-sm">
                  <div>
                    <span className="text-gray-400 text-xs">签证费</span>
                    <p className="font-semibold text-gray-800">{c.fee}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-400 text-xs">办理时间</span>
                    <p className="font-semibold text-gray-800">{c.processingTime}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 底部说明 */}
      <section className="mt-12 bg-blue-50 rounded-xl p-6 text-sm text-blue-800">
        <p className="font-semibold mb-1">📌 关于数据准确性</p>
        <p className="text-blue-700 leading-relaxed">
          所有签证信息均来自各国驻华使馆、领事馆及官方签证申请中心的公开页面，
          我们会定期核查更新。签证政策可能随时变化，申请前请务必以官方最新公告为准。
        </p>
      </section>
    </div>
  );
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "关于 · 签证通",
  description: "签证通是一个面向中国用户的免费签证信息工具，所有数据来自官方使馆，不推中介、不接广告。",
};

export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">关于签证通</h1>

      {/* 一句话介绍 */}
      <section className="mb-8">
        <p className="text-gray-700 leading-relaxed">
          签证通是一个免费的出境签证信息查询工具，帮助中国用户快速了解各国签证的材料清单、费用、办理流程和注意事项。
        </p>
      </section>

      {/* 为什么做这个 */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">为什么做这个？</h2>
        <p className="text-gray-700 leading-relaxed mb-3">
          第一次办签证的时候，我在网上搜了一圈，发现信息又散又乱——要么是中介软文夹带私货，要么是几年前的过期攻略，根本不知道该信谁。
        </p>
        <p className="text-gray-700 leading-relaxed">
          所以我做了签证通：把各国使馆、领事馆、签证申请中心的官方信息整理成清晰易读的格式，再配一个 AI 助手帮你快速找到答案。不卖课、不推中介、不接广告，就是一个干净的信息工具。
        </p>
      </section>

      {/* 数据来源 */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">数据从哪来？</h2>
        <p className="text-gray-700 leading-relaxed">
          所有签证信息均来自各国驻华使馆、领事馆及官方签证申请中心（如 VFS Global、中智签证等）的公开页面。我们会定期核查更新，但签证政策可能随时变化，申请前请务必以官方最新公告为准。
        </p>
      </section>

      {/* 我们不做什么 */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">我们不做什么</h2>
        <div className="bg-gray-50 rounded-xl p-5 text-gray-700 leading-relaxed space-y-2">
          <p>❌ 不做签证代办，不收你一分钱手续费</p>
          <p>❌ 不推荐任何中介机构</p>
          <p>❌ 不接软广，不做付费排名</p>
          <p>❌ 不收集你的个人信息</p>
        </div>
      </section>

      {/* AI助手说明 */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">关于 AI 签证助手</h2>
        <p className="text-gray-700 leading-relaxed">
          每个国家详情页右下角的 💬 按钮可以打开 AI 助手。它基于我们整理的官方数据回答你的签证问题——不是通用大模型瞎编，而是基于真实的材料清单和政策文件。当然，AI 回答仅供参考，具体请以官方为准。
        </p>
      </section>

      {/* 联系与反馈 */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">联系我们</h2>
        <p className="text-gray-700 leading-relaxed">
          如果你发现信息有误、想建议新增某个国家、或者有任何想法，欢迎通过以下方式联系：
        </p>
        <div className="mt-3 bg-blue-50 rounded-xl p-5 text-blue-800 text-sm leading-relaxed">
          <p>📮 邮箱：hi@visainfo.asia</p>
          <p className="mt-1">📱 小红书：签证通（即将开通）</p>
        </div>
      </section>

      {/* 底部 */}
      <section className="border-t border-gray-200 pt-6 text-sm text-gray-400">
        <p>签证通 · 让办签证这件事简单一点</p>
      </section>
    </div>
  );
}

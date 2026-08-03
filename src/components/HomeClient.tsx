'use client';
import CreateRoomForm from './CreateRoomForm';
import JoinRoomForm from './JoinRoomForm';

export default function HomeClient() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-10 text-center">
        <h1 className="font-display bg-gradient-to-r from-violet-400 via-fuchsia-400 to-amber-300 bg-clip-text text-4xl font-bold text-transparent md:text-5xl">
          共著
        </h1>
        <p className="mt-3 text-slate-400">多人共同创作的 AI 文字冒险 · 世界由 AI 主持，剧情由你们书写</p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="mb-4 text-xl font-semibold">
            创建房间 <span className="text-sm font-normal text-slate-500">（房主）</span>
          </h2>
          <CreateRoomForm />
        </section>
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="mb-4 text-xl font-semibold">
            加入房间 <span className="text-sm font-normal text-slate-500">（输入房间号）</span>
          </h2>
          <JoinRoomForm />
        </section>
      </div>

      <section className="mt-10 grid gap-4 text-sm text-slate-400 md:grid-cols-3">
        <div className="rounded-xl border border-slate-800/60 bg-slate-900/30 p-4">
          <h3 className="mb-1 font-medium text-slate-200">🎭 你决定角色行动</h3>
          <p>每回合写下你想做的事，你的行动将真正改变故事走向。</p>
        </div>
        <div className="rounded-xl border border-slate-800/60 bg-slate-900/30 p-4">
          <h3 className="mb-1 font-medium text-slate-200">🌍 AI 主持世界</h3>
          <p>世界大趋势、NPC、历史进程由 AI 独立推进，并对每位玩家的行动给出回应。</p>
        </div>
        <div className="rounded-xl border border-slate-800/60 bg-slate-900/30 p-4">
          <h3 className="mb-1 font-medium text-slate-200">⏳ 房间自动清理</h3>
          <p>20 分钟内未开局的房间自动删除，为你节省 API 额度。</p>
        </div>
      </section>
    </main>
  );
}

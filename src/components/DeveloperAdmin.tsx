import { Play, Settings, Key, Command, CheckCircle2, ChevronRight, HelpCircle, FileCode } from 'lucide-react';

export default function DeveloperAdmin() {
  return (
    <div className="bg-white rounded-3xl border-4 border-amber-200/60 p-6 shadow-sm max-w-4xl mx-auto" id="developer-admin-dashboard">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-amber-100 pb-5 mb-6">
        <div>
          <span className="bg-indigo-100 text-indigo-900 border border-indigo-200 text-xs font-bold px-3 py-1 rounded-full">
            ⚙️ 配信管理・デベロッパーダッシュボード
          </span>
          <h3 className="text-xl font-black text-amber-950 mt-2">Hugging Face ＋ GitHub Actions 自律稼働システム</h3>
          <p className="text-xs text-amber-900/60 mt-1">完全放置でアクセスが増えるSEO・AI自動生成システムの設定状態と解説です。</p>
        </div>
      </div>

      {/* Visual Pipeline flow */}
      <h4 className="text-sm font-bold text-amber-900 mb-4 flex items-center gap-1.5">
        <Play className="w-4 h-4 text-indigo-600 fill-indigo-200" />
        全自動ぬりうアップロードの仕組み
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 relative">
        <div className="bg-amber-50/50 hover:bg-amber-50 border border-amber-100 rounded-2xl p-4 text-center">
          <div className="w-10 h-10 bg-indigo-100 text-indigo-700 text-sm font-bold rounded-full flex items-center justify-center mx-auto mb-2">1</div>
          <h5 className="text-xs font-bold text-amber-950">AIテーマ決定・記事執筆</h5>
          <p className="text-[10px] text-amber-900/60 mt-1">GHAが毎日定刻に起動。LlamaやQwenが子供向けの可愛いテーマと、高品質なSEOブログ記事を自動生成。</p>
        </div>
        <div className="bg-amber-50/50 hover:bg-amber-50 border border-amber-100 rounded-2xl p-4 text-center">
          <div className="w-10 h-10 bg-pink-100 text-pink-700 text-sm font-bold rounded-full flex items-center justify-center mx-auto mb-2">2</div>
          <h5 className="text-xs font-bold text-amber-950">FLUXでぬりえ生成</h5>
          <p className="text-[10px] text-amber-900/60 mt-1">「FLUX.1-schnell」にプロンプトを送り、高コントラストな白黒のぬりえ線画を一瞬で生成。</p>
        </div>
        <div className="bg-amber-50/50 hover:bg-amber-50 border border-amber-100 rounded-2xl p-4 text-center">
          <div className="w-10 h-10 bg-emerald-100 text-emerald-700 text-sm font-bold rounded-full flex items-center justify-center mx-auto mb-2">3</div>
          <h5 className="text-xs font-bold text-amber-950">Gitへ自動保存</h5>
          <p className="text-[10px] text-amber-900/60 mt-1">新ぬりえ画像が <code>public/</code> に、SEO記事が <code>coloring-pages.json</code> に記録され、GitHubへPush！</p>
        </div>
        <div className="bg-amber-50/50 hover:bg-amber-50 border border-amber-100 rounded-2xl p-4 text-center">
          <div className="w-10 h-10 bg-amber-100 text-amber-700 text-sm font-bold rounded-full flex items-center justify-center mx-auto mb-2">4</div>
          <h5 className="text-xs font-bold text-amber-950">Vercelへ自動配信</h5>
          <p className="text-[10px] text-amber-900/60 mt-1">Pushを検知しVercelが瞬時にビルドを回して自動更新。静的ファイル構成なので、ホスティング代は生涯完全無料！</p>
        </div>
      </div>

      {/* GitHub secret checklist */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
            <Key className="w-4 h-4 text-slate-600" />
            GitHubに登録する秘密鍵 (Secrets)
          </h4>
          <p className="text-xs text-slate-600 mb-4 leading-relaxed">
            GitHubリポジトリ設定 <b>[Settings] → [Secrets and variables] → [Actions]</b> から以下の2つの暗号を登録してください。
          </p>

          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-indigo-700">HF_TOKEN</span>
                <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded">必須</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Hugging Faceの無料API用キー。
                <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noreferrer" className="text-indigo-600 underline ml-1">こちら</a> で即時無料発行できます（Roleは <code>Read</code> でOK）。
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-emerald-700">VERCEL_TOKEN</span>
                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded">任意（推奨）</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                GitHub ActionからVercelを即時ビルド・更新キックするためのトークン。
                <a href="https://vercel.com/account/tokens" target="_blank" rel="noreferrer" className="text-emerald-600 underline ml-1">こちら</a> で発行。
              </p>
            </div>
          </div>
        </div>

        {/* Manual launch list */}
        <div className="bg-indigo-50/40 border border-indigo-100 rounded-2xl p-5">
          <h4 className="text-sm font-bold text-indigo-900 flex items-center gap-2 mb-3">
            <Command className="w-4 h-4 text-indigo-600" />
            ローカルでのテスト実行コマンド
          </h4>
          <p className="text-xs text-indigo-800 mb-4 leading-relaxed">
            PCなどのローカル開発環境で、自動生成エンジンが正しく動くか自分の手でテストしたい場合は、ターミナルで以下を叩いてみましょう：
          </p>

          <div className="bg-slate-900 text-white font-mono text-xs p-4 rounded-xl relative overflow-x-auto whitespace-pre leading-relaxed select-all">
{`# 1. ターミナルでHFキーを定義して、スクリプトを実行
export HF_TOKEN="your_hugging_face_token_here"
node scripts/generate-coloring.js`}
          </div>

          <div className="mt-4 flex items-start gap-2 bg-white/70 border border-indigo-200 rounded-xl p-3 text-[11px] text-indigo-950">
            <HelpCircle className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">自動実行のタイミングを変更したい？</p>
              <p className="text-indigo-900/80 mt-0.5">
                <code>.github/workflows/generate-coloring.yml</code> ファイルの <code>cron: '0 0,12 * * *'</code> 部分を自由に変更して配信回数（3時間ごと等）をカスタムできます。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

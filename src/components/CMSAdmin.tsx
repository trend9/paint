import React, { useState, useEffect } from 'react';
import { db, auth, googleProvider, signInWithPopup, signOut, handleFirestoreError, OperationType } from '../firebase';
import { collection, getDocs, setDoc, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { ColoringPage } from '../types';
import { LogIn, LogOut, Plus, Edit2, Trash2, Save, X, RefreshCw, Layers, Check, AlertTriangle, FileText } from 'lucide-react';
import localColoringPages from '../data/coloring-pages.json';

interface CMSAdminProps {
  onClose: () => void;
  onRefreshData: (newPages: ColoringPage[]) => void;
}

export default function CMSAdmin({ onClose, onRefreshData }: CMSAdminProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Real-time Firestore items
  const [pages, setPages] = useState<ColoringPage[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Form states
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ColoringPage | null>(null);

  // Editable fields state
  const [editId, setEditId] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('動物・生き物');
  const [editTagsString, setEditTagsString] = useState('');
  const [editImage, setEditImage] = useState('');
  const [editImageType, setEditImageType] = useState<'svg' | 'jpg' | 'png'>('jpg');
  const [editPrompt, setEditPrompt] = useState('');
  const [editArticle, setEditArticle] = useState('');
  const [editSeoH1, setEditSeoH1] = useState('');
  const [editSeoDesc, setEditSeoDesc] = useState('');
  const [editSeoKeywordsString, setEditSeoKeywordsString] = useState('');

  // Handle Authentication status
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        // Strict evaluation of email address
        if (currentUser.email === 'mattan029@gmail.com') {
          setUser(currentUser);
          setErrorMsg('');
          fetchFirestorePages();
        } else {
          setErrorMsg('アクセス拒否: この管理システムは「mattan029@gmail.com」専用です。');
          setUser(null);
          signOut(auth);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setErrorMsg('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`ログインに失敗しました: ${err.message || err}`);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setPages([]);
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch colouring archives from Firestore DB
  const fetchFirestorePages = async () => {
    const path = 'coloringPages';
    try {
      const querySnapshot = await getDocs(collection(db, path));
      const list: ColoringPage[] = [];
      querySnapshot.forEach((doc) => {
        list.push(doc.data() as ColoringPage);
      });
      // Sort list by createdAt descending if exists
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setPages(list);
      if (list.length > 0) {
        onRefreshData(list);
      }
    } catch (err: any) {
      console.error("Firestore retrieval error:", err);
      setErrorMsg(`データ取得失敗: ${err.message || err}`);
      if (err instanceof Error && (err.message.includes('permission') || err.message.includes('Permission'))) {
        handleFirestoreError(err, OperationType.LIST, path);
      }
    }
  };

  // Sync / Bootstrap Firestore database with default local coloring json pages
  const handleBootstrapFirestore = async () => {
    if (!user) return;
    setIsSyncing(true);
    setSuccessMsg('');
    setErrorMsg('');
    const path = 'coloringPages';
    try {
      const batch = writeBatch(db);
      const castedLocal = localColoringPages as ColoringPage[];
      
      for (const item of castedLocal) {
        const itemRef = doc(db, path, item.slug || `item-${item.id}`);
        batch.set(itemRef, item);
      }
      
      await batch.commit();
      setSuccessMsg('ローカルの全ぬりえデータをFirestoreデータベースに同期しました！');
      await fetchFirestorePages();
    } catch (err: any) {
      console.error("Bootstrap sync error:", err);
      setErrorMsg(`同期中にエラーが発生しました: ${err.message || err}`);
      if (err instanceof Error && (err.message.includes('permission') || err.message.includes('Permission'))) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle CRUD select item for Editing
  const startEdit = (item: ColoringPage) => {
    setSelectedItem(item);
    setEditId(item.id);
    setEditSlug(item.slug);
    setEditTitle(item.title);
    setEditDescription(item.description);
    setEditCategory(item.category);
    setEditTagsString(item.tags?.join(', ') || '');
    setEditImage(item.image);
    setEditImageType(item.imageType || 'jpg');
    setEditPrompt(item.prompt);
    setEditArticle(item.article);
    setEditSeoH1(item.seo?.h1 || '');
    setEditSeoDesc(item.seo?.metaDescription || '');
    setEditSeoKeywordsString(item.seo?.keywords?.join(', ') || '');
    
    setIsEditing(true);
    setIsCreating(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Start Form for Creating
  const startCreate = () => {
    const nextId = String(pages.length > 0 ? Math.max(...pages.map(p => parseInt(p.id) || 0)) + 1 : Date.now());
    setSelectedItem(null);
    setEditId(nextId);
    setEditSlug('');
    setEditTitle('');
    setEditDescription('');
    setEditCategory('動物・生き物');
    setEditTagsString('');
    setEditImage('https://images.unsplash.com/photo-1603533867307-b3542258a449?auto=format&fit=crop&q=80&w=600');
    setEditImageType('jpg');
    setEditPrompt('children coloring page outline, high contrast countour in black ink, white backdrop');
    setEditArticle('### 親子でたのしむぬりえストーリー\n\nここにおもしろい物語を書いてね！\n\n#### このぬりえの色彩知育ポイント\n\nぬりえはお子様の色彩感覚を高めます。');
    setEditSeoH1('');
    setEditSeoDesc('無料のぬりえをダウンロード！');
    setEditSeoKeywordsString('ぬりえ 無料, 子供 ぬりえ, 知育 ぬりえ');
    
    setIsCreating(true);
    setIsEditing(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Save item (Insert or Update)
  const handleSavePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSlug || !editTitle) {
      setErrorMsg('スラグとタイトルは入力必須です。');
      return;
    }

    const cleanSlug = editSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const tagsArray = editTagsString.split(',').map(t => t.trim()).filter(Boolean);
    const keywordsArray = editSeoKeywordsString.split(',').map(t => t.trim()).filter(Boolean);

    const payload: ColoringPage = {
      id: editId,
      slug: cleanSlug,
      title: editTitle,
      description: editDescription,
      category: editCategory,
      tags: tagsArray,
      image: editImage,
      imageType: editImageType,
      prompt: editPrompt,
      createdAt: selectedItem?.createdAt || new Date().toISOString(),
      article: editArticle,
      seo: {
        h1: editSeoH1 || editTitle,
        metaDescription: editSeoDesc.includes('無料のぬりえをダウンロード') ? editSeoDesc : `無料のぬりえをダウンロード！${editSeoDesc}`,
        keywords: keywordsArray
      }
    };

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const docPath = `coloringPages/${cleanSlug}`;
    try {
      // Save directly to Firestore using sanitized slug as document key
      await setDoc(doc(db, 'coloringPages', cleanSlug), payload);
      setSuccessMsg(`「${editTitle}」を保存しました！`);
      setIsEditing(false);
      setIsCreating(false);
      await fetchFirestorePages();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`保存エラー: ${err.message || err}`);
      if (err instanceof Error && (err.message.includes('permission') || err.message.includes('Permission'))) {
        handleFirestoreError(err, OperationType.WRITE, docPath);
      }
    } finally {
      setLoading(false);
    }
  };

  // Delete Item
  const handleDeletePage = async (slug: string, title: string) => {
    if (!window.confirm(`「${title}」のぬりえデータを削除しますか？`)) {
      return;
    }
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    const docPath = `coloringPages/${slug}`;
    try {
      await deleteDoc(doc(db, 'coloringPages', slug));
      setSuccessMsg(`「${title}」を削除しました。`);
      await fetchFirestorePages();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`削除エラー: ${err.message || err}`);
      if (err instanceof Error && (err.message.includes('permission') || err.message.includes('Permission'))) {
        handleFirestoreError(err, OperationType.DELETE, docPath);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm max-w-4xl mx-auto">
        <RefreshCw className="w-8 h-8 text-brand-pink animate-spin" />
        <span className="text-gray-500 text-xs mt-3 font-semibold">読み込み中...</span>
      </div>
    );
  }

  // --- 1. NOT AUTHENTICATED VIEW ---
  if (!user) {
    return (
      <div className="bg-white rounded-[40px] shadow-2xl p-8 sm:p-12 text-center max-w-md mx-auto border-8 border-white" id="cms-login-board">
        <div className="w-16 h-16 bg-pink-100 rounded-3xl flex items-center justify-center mx-auto rotate-3 mb-6 shadow-md">
          <LogIn className="w-8 h-8 text-brand-pink" />
        </div>
        <h3 className="text-xl font-black text-brand-dark">管理者ログイン</h3>
        <p className="text-xs text-gray-500 mt-2 leading-relaxed">
          ぬりえの記事追加、修正、画像設定を行う場合はGoogleアカウントでログインしてください。<br />
          <span className="text-brand-pink font-bold">mattan029@gmail.com</span> アカウントのみ認証が許可されます。
        </p>

        {errorMsg && (
          <div className="mt-4 p-3.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-2xl text-[11px] font-bold text-left flex items-start gap-1.5 leading-relaxed">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <button
          onClick={handleLogin}
          className="w-full mt-6 py-3.5 px-4 bg-brand-pink hover:bg-[#ff7b8f] text-white font-black text-xs rounded-full shadow-lg shadow-pink-150 transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M12.24 10.285V13.4h6.86c-.277 1.56-1.602 4.585-6.86 4.585-4.54 0-8.24-3.765-8.24-8.4s3.7-8.4 8.24-8.4c2.58 0 4.307 1.095 5.298 2.045l2.465-2.37C18.435 1.21 15.62 0 12.24 0 5.58 0 0 5.37 0 12s5.58 12 12.24 12c6.96 0 11.57-4.89 11.57-11.79 0-.795-.085-1.4-.195-1.925H12.24z"/>
          </svg>
          Googleアカウントで認証
        </button>

        <button
          onClick={onClose}
          className="w-full mt-3 py-3 px-4 bg-gray-50 hover:bg-gray-100 text-gray-500 text-xs font-bold rounded-full transition-all cursor-pointer border border-gray-150"
        >
          キャンセル・閉じる
        </button>
      </div>
    );
  }

  // --- 2. AUTHENTICATED ADMINISTRATOR CMS VIEW ---
  return (
    <div className="bg-white rounded-[40px] shadow-2xl p-6 sm:p-8 max-w-4xl mx-auto border-8 border-white" id="cms-authenticated-dashboard">
      
      {/* CMS Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5 mb-6">
        <div>
          <span className="bg-pink-100 text-brand-pink text-xs font-black px-3 py-1 rounded-full border border-pink-200 uppercase tracking-wider">
            🔒 CMS CONTROL DASHBOARD
          </span>
          <h3 className="text-xl font-black text-brand-dark mt-2">ぬりえ記事・コンテンツ管理システム</h3>
          <p className="text-xs text-gray-400 mt-1 font-semibold">こんにちは、<span className="text-brand-pink">{user.email}</span> 様。記事の設定をリアルタイムに変更できます。</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-gray-150 hover:bg-rose-50 hover:text-rose-600 text-gray-650 rounded-full font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            ログアウト
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-brand-pink text-white rounded-full font-black text-xs hover:bg-[#ff7b8f] transition-colors cursor-pointer"
          >
            閉じる
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="mb-6 p-4 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-[20px] text-xs font-black flex items-center gap-2 shadow-inner">
          <Check className="w-5 h-5" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 p-4 bg-rose-50 text-rose-600 border border-rose-100 rounded-[20px] text-xs font-bold flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* --- FORM SECTION: CREATE / EDIT --- */}
      {(isCreating || isEditing) && (
        <form onSubmit={handleSavePage} className="bg-pink-50/10 border border-pink-100/40 rounded-[32px] p-5 sm:p-6 mb-8 space-y-5 shadow-inner">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h4 className="text-sm font-black text-brand-dark flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-pink" />
              {isCreating ? '🆕 新しいぬりえを追加' : '✏️ ぬりえ情報の編集'}
            </h4>
            <button
              type="button"
              onClick={() => { setIsEditing(false); setIsCreating(false); }}
              className="text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-black text-gray-400 mb-1.5 uppercase">ユニークスラグ (slug)*</label>
              <input
                type="text"
                required
                className="w-full px-4 py-2.5 text-xs font-bold rounded-xl bg-white border border-gray-200 outline-none focus:border-brand-pink/50 text-brand-dark placeholder-gray-400"
                placeholder="例: happy-lion-cub"
                value={editSlug}
                onChange={(e) => setEditSlug(e.target.value)}
                disabled={isEditing}
              />
              <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">※アルファベット小文字、数字、ハイフンのみ。一度保存すると変更できません。</p>
            </div>

            <div>
              <label className="block text-[11px] font-black text-gray-400 mb-1.5 uppercase">ぬりえのタイトル*</label>
              <input
                type="text"
                required
                className="w-full px-4 py-2.5 text-xs font-bold rounded-xl bg-white border border-gray-200 outline-none focus:border-brand-pink/50 text-brand-dark"
                placeholder="例: もこもこひつじさんの可愛いぬりえ"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-black text-gray-400 mb-1.5 uppercase">カテゴリー</label>
              <select
                className="w-full px-4 py-2.5 text-xs font-bold rounded-xl bg-white border border-gray-200 outline-none focus:border-brand-pink/50 text-brand-dark"
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
              >
                <option value="動物・生き物">動物・生き物</option>
                <option value="海の生き物">海の生き物</option>
                <option value="動物・食べ物">動物・食べ物</option>
                <option value="ファンタジー">ファンタジー</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-black text-gray-400 mb-1.5 uppercase">タグ (カンマ区切り)</label>
              <input
                type="text"
                className="w-full px-4 py-2.5 text-xs font-bold rounded-xl bg-white border border-gray-200 outline-none focus:border-brand-pink/50 text-brand-dark"
                placeholder="ひつじ, 動物, 簡単, かわいい"
                value={editTagsString}
                onChange={(e) => setEditTagsString(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-gray-400 mb-1.5 uppercase">画像ファイル形式</label>
              <select
                className="w-full px-4 py-2.5 text-xs font-bold rounded-xl bg-white border border-gray-200 outline-none focus:border-brand-pink/50 text-brand-dark"
                value={editImageType}
                onChange={(e) => setEditImageType(e.target.value as any)}
              >
                <option value="jpg">JPG画像</option>
                <option value="png">PNG画像</option>
                <option value="svg">SVGベクター</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
            <div>
              <label className="block text-[11px] font-black text-gray-400 mb-1.5 uppercase">ぬりえイラスト画像URL*</label>
              <input
                type="text"
                required
                className="w-full px-4 py-2.5 text-xs font-bold rounded-xl bg-white border border-gray-200 outline-none focus:border-brand-pink/50 text-brand-dark"
                placeholder="URLか、ローカルパス (/coloring-pages/slug.jpg など)"
                value={editImage}
                onChange={(e) => setEditImage(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-black text-gray-400 mb-1.5 uppercase">簡単な解説文 (description)*</label>
            <textarea
              required
              rows={2}
              className="w-full px-4 py-2.5 text-xs font-bold rounded-xl bg-white border border-gray-200 outline-none focus:border-brand-pink/50 text-brand-dark resize-y"
              placeholder="100文字程度の簡単な紹介・紹介文を入れてください。"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-[11px] font-black text-gray-400 mb-1.5 uppercase">ぬりえ遊び＋知育本文 (article - Markdown対応)*</label>
            <textarea
              required
              rows={5}
              className="w-full px-4 py-2.5 text-xs font-bold rounded-xl bg-white border border-gray-200 outline-none focus:border-brand-pink/50 text-brand-dark resize-y font-mono"
              placeholder="h3やh4を使って、子供向けのストーリーや親への知育のアドバイス記事を書いてください。"
              value={editArticle}
              onChange={(e) => setEditArticle(e.target.value)}
            />
          </div>

          {/* Form SEO block */}
          <div className="bg-white border border-gray-150 rounded-2xl p-4 sm:p-5 space-y-4">
            <span className="text-[11px] font-black text-brand-pink uppercase tracking-widest block border-b border-gray-100 pb-2">🔍 検索エンジンSEOメタ設定</span>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 mb-1 uppercase">SEO表示用見出し1 (H1)</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-white border border-gray-200 outline-none focus:border-brand-pink/50 text-brand-dark"
                  placeholder="例: 【無料印刷】もこもこ羊さんの簡単で可愛い子供用ぬりえイラスト"
                  value={editSeoH1}
                  onChange={(e) => setEditSeoH1(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-black text-gray-400 mb-1 uppercase">SEOキーワード (カンマ区切り)</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-white border border-gray-200 outline-none focus:border-brand-pink/50 text-brand-dark"
                  placeholder="ぬりえ 無料, ひつじ ぬりえ, 簡単 ぬりえ"
                  value={editSeoKeywordsString}
                  onChange={(e) => setEditSeoKeywordsString(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-400 mb-1 uppercase">メタディスクリプション (100〜120文字/「無料のぬりえをダウンロード」が自動で付加されます)</label>
              <textarea
                rows={2}
                className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-white border border-gray-200 outline-none focus:border-brand-pink/50 text-brand-dark resize-y"
                placeholder="ディスクリプション情報を入力してください。空欄の場合はタイトルと説明文から自動インプットされます。"
                value={editSeoDesc}
                onChange={(e) => setEditSeoDesc(e.target.value)}
              />
            </div>
          </div>

          <div className="hidden">
            {/* Kept internally to satisfy schema layout cleanly but hidden from front view */}
            <input type="text" value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)} />
            <input type="text" value={editId} onChange={(e) => setEditId(e.target.value)} />
          </div>

          <div className="flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => { setIsEditing(false); setIsCreating(false); }}
              className="px-5 py-2.5 rounded-full text-xs font-bold bg-white hover:bg-gray-50 border border-gray-200 text-gray-500 cursor-pointer"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-full text-xs font-black bg-brand-mint hover:bg-brand-mint-hover text-white flex items-center gap-1.5 shadow-md shadow-emerald-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              無事に保存する
            </button>
          </div>
        </form>
      )}

      {/* --- DATABASE STATS & BOOTSTRAP RESCUE ENGINE --- */}
      <div className="mb-6 p-5 bg-gray-50 border border-gray-150 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="font-mono text-xs font-bold text-gray-500 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-gray-400" />
            データベース状態:
            <span className="font-extrabold text-[#2F3542]">Firestore同期 {pages.length}件</span>
          </span>
          <p className="text-[10px] text-gray-400 leading-relaxed mt-1">
            Firestoreにデータが登録されると、公開ギャラリー一覧のぬりえは自動でFirestore側のリアルタイムデータに切り替わります。
          </p>
        </div>
        
        {pages.length === 0 && (
          <button
            onClick={handleBootstrapFirestore}
            disabled={isSyncing}
            className="bg-brand-pink text-white hover:bg-[#ff7b8f] disabled:bg-gray-300 font-black text-[11px] px-4 py-2.5 rounded-2xl flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-pink-100"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? '同期中...' : '初期データをFirestoreへ同期'}
          </button>
        )}
      </div>

      {/* --- CMS ARTICLES LIST --- */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-brand-dark uppercase tracking-widest block">ぬりえ記事リスト</span>
          <button
            onClick={startCreate}
            className="bg-brand-mint text-white hover:bg-brand-mint-hover font-black text-xs px-4 py-2 rounded-full cursor-pointer flex items-center gap-1 shadow-md shadow-emerald-50"
          >
            <Plus className="w-3.5 h-3.5" />
            ぬりえを新規追加
          </button>
        </div>

        {pages.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 border border-dashed border-gray-200 rounded-3xl text-xs text-gray-400">
            まだFirestoreにぬりえデータが存在しません。上のボタンをタップして初期データを同期しましょう。
          </div>
        ) : (
          <div className="border border-gray-150 rounded-3xl overflow-hidden bg-white max-h-[450px] overflow-y-auto divide-y divide-gray-100">
            {pages.map((item) => (
              <div key={item.slug} className="p-4 flex items-center justify-between gap-4 hover:bg-pink-50/5 text-xs transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-10 h-10 object-contain bg-gray-50 border border-gray-150 rounded-lg p-0.5 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] bg-pink-100/60 text-brand-pink font-bold px-1.5 py-0.5 rounded">
                        {item.category}
                      </span>
                      <span className="font-mono text-[9px] text-gray-400">
                        {item.slug}
                      </span>
                    </div>
                    <h5 className="font-black text-brand-dark mt-1 truncate">
                      {item.title}
                    </h5>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    onClick={() => startEdit(item)}
                    className="p-1 px-2.5 bg-gray-50 hover:bg-pink-50 hover:text-brand-pink text-gray-500 rounded-lg font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3 h-3" />
                    編集
                  </button>
                  <button
                    onClick={() => handleDeletePage(item.slug, item.title)}
                    className="p-1 px-2.5 bg-gray-50 hover:bg-rose-50 hover:text-rose-600 text-gray-500 rounded-lg font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

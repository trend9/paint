import { useState, useEffect } from 'react';
import { Search, Printer, Download, Sparkles, BookOpen, Settings, ChevronLeft, Brush, Heart, Baby, Smile, ClipboardList, Lock } from 'lucide-react';
import { ColoringPage } from './types';
import coloringPagesData from './data/coloring-pages.json';
import ColoringCard from './components/ColoringCard';
import InteractivePainter from './components/InteractivePainter';
import SEOHeader from './components/SEOHeader';
import CMSAdmin from './components/CMSAdmin';


export default function App() {
  // Database state (starts with local file data, and updates dynamically with Firestore if available)
  const [coloringPages, setColoringPages] = useState<ColoringPage[]>(coloringPagesData as ColoringPage[]);
  const [selectedPage, setSelectedPage] = useState<ColoringPage | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('すべて');
  
  // Custom Path / hash-based Admin CMS router
  const [isAdminMode, setIsAdminMode] = useState(false);



  // 2. Router connection for detail viewing and secure /host CMS checking
  useEffect(() => {
    function handleNavigation() {
      const path = window.location.pathname;
      const hash = window.location.hash;
      
      // Check if user is navigating to host CMS administration
      if (path.endsWith('/host') || hash === '#/host' || hash === '#host') {
        setIsAdminMode(true);
        setSelectedPage(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setIsAdminMode(false);
        const slug = hash.replace('#', '');
        if (slug) {
          const found = coloringPages.find(p => p.slug === slug);
          if (found) {
            setSelectedPage(found);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
          }
        }
        setSelectedPage(null);
      }
    }

    handleNavigation();
    window.addEventListener('hashchange', handleNavigation);
    window.addEventListener('popstate', handleNavigation);
    return () => {
      window.removeEventListener('hashchange', handleNavigation);
      window.removeEventListener('popstate', handleNavigation);
    };
  }, [coloringPages]);

  // Navigate back to overview & clear hash
  const handleBackToGallery = () => {
    window.location.hash = '';
    // If pathname was '/host', change history state back
    if (window.location.pathname.endsWith('/host')) {
      window.history.pushState({}, '', '/');
    }
    setSelectedPage(null);
    setIsAdminMode(false);
  };

  // Select coloring book and sync hash for SEO routing
  const handleSelectPage = (page: ColoringPage) => {
    window.location.hash = page.slug;
  };

  // Callback to handle real-time data syncs from CMSAdmin
  const handleRefreshDataFromCMS = (newPages: ColoringPage[]) => {
    setColoringPages(newPages);
  };

  // Filter listings based on search and selected categories
  const filteredPages = coloringPages.filter(p => {
    const matchesCategory = selectedCategory === 'すべて' || p.category === selectedCategory;
    const matchesSearch = 
      p.title.includes(searchQuery) || 
      p.description.includes(searchQuery) || 
      (p.tags && p.tags.some(t => t.includes(searchQuery))) ||
      p.article.includes(searchQuery);
    return matchesCategory && matchesSearch;
  });

  // Native A4 print trigger
  const triggerPrint = () => {
    window.print();
  };

  // Convert markdown-style raw text article into clean React paragraphs without any developer or AI telemetry
  const renderArticle = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, index) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('###')) {
        return (
          <h3 key={index} className="text-lg font-black text-brand-dark mt-6 mb-2.5 border-b-2 border-pink-100 pb-1 flex items-center gap-1.5">
            🌟 {trimmed.replace('###', '').trim()}
          </h3>
        );
      }
      if (trimmed.startsWith('####')) {
        return (
          <h4 key={index} className="text-sm font-bold text-gray-700 mt-4 mb-2 flex items-center gap-1">
            ✏️ {trimmed.replace('####', '').trim()}
          </h4>
        );
      }
      if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        const itemText = trimmed.replace(/^[\s-*]+/, '').trim();
        const parts = itemText.split(':');
        if (parts.length > 1) {
          return (
            <li key={index} className="ml-4 list-disc text-xs text-gray-650 leading-relaxed my-1">
              <strong className="text-brand-pink">{parts[0]}:</strong>{parts.slice(1).join(':')}
            </li>
          );
        }
        return (
          <li key={index} className="ml-4 list-disc text-xs text-gray-650 leading-relaxed my-1 font-medium">
            {itemText}
          </li>
        );
      }
      if (trimmed === '') {
        return <div key={index} className="h-2" />;
      }
      return (
        <p key={index} className="text-xs text-gray-600 leading-relaxed my-2 font-medium">
          {trimmed}
        </p>
      );
    });
  };

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-brand-pink/20 bg-brand-bg text-[#4A4A4A]" id="kids-coloring-app-root">
      
      {/* Dynamic SEO Injector (Standards Compliant without displaying system telemetry) */}
      <SEOHeader page={selectedPage || undefined} isLanding={!selectedPage} />

      {/* Cute Navigation with Artistic Flair and Warm Accents */}
      <header className="flex flex-col md:flex-row justify-between items-center px-6 md:px-10 py-6 gap-4 border-b-2 border-white/40 bg-white/30 backdrop-blur-md">
        <div className="flex items-center gap-3 cursor-pointer select-none" onClick={handleBackToGallery}>
          <div className="w-12 h-12 bg-brand-pink rounded-2xl rotate-3 flex items-center justify-center shadow-lg transition-transform hover:rotate-6">
            <svg viewBox="0 0 24 24" className="w-7 h-7 text-white fill-current">
              <path d="M21.7 8.01L15.99 2.3c-.39-.39-1.02-.39-1.41 0L3.29 13.59c-.18.19-.29.44-.29.7V19c0 .55.45 1 1 1h4.71c.27 0 .52-.11.7-.29l11.29-11.29c.39-.39.39-1.03 0-1.41zM7.59 18H5v-2.59l9-9L16.59 9l-9 9z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-brand-dark flex items-center gap-2">
              ぬりぬり！<span className="text-brand-pink">ぬりえ！</span>
              <span className="text-xs bg-brand-pink text-white font-extrabold px-2 py-0.5 rounded-full select-none rotate-2">無料</span>
            </h1>
            <p className="text-[10px] md:text-xs font-bold text-[#4A4A4A]/70 mt-0.5">
              こども用の可愛いぬりえをダウンロード・印刷して遊ぼう！
            </p>
          </div>
        </div>

        {/* Dynamic header states */}
        <nav className="flex items-center gap-2">
          <button
            onClick={handleBackToGallery}
            className={`px-4.5 py-2.5 rounded-2xl font-black text-xs flex items-center gap-1.5 cursor-pointer transition-all ${
              !isAdminMode
                ? 'bg-brand-pink text-white shadow-lg shadow-pink-200 border-2 border-brand-pink'
                : 'bg-white hover:bg-pink-50/20 text-brand-dark border-2 border-gray-200/60 shadow-sm'
            }`}
          >
            <Smile className="w-4 h-4 text-brand-yellow fill-brand-yellow/30" />
            ようこそギャラリー
          </button>
          
          {/* Hidden admin trigger but allows clicking if they desire to return to CMS */}
          {isAdminMode && (
            <span className="bg-brand-dark text-white font-black text-xs px-4.5 py-2.5 rounded-2xl border-2 border-brand-dark flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-pink-300" />
              管理者 CMS
            </span>
          )}
        </nav>
      </header>

      {/* Main Container Wrapper */}
      <main className="flex-grow max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        
        {/* Router Tab Content 1: Secure CMS Administrator console */}
        {isAdminMode ? (
          <CMSAdmin 
            onClose={handleBackToGallery} 
            onRefreshData={handleRefreshDataFromCMS} 
          />
        ) : (
          /* Router Tab Content 2: Standard Client Gallery & Details Panel */
          <>
             {!selectedPage ? (
              // --- LANDING OVERVIEW PAGE ---
              <div className="space-y-8 animate-fade-in">
                
                {/* Cheerful Greeting banner */}
                <div className="bg-white rounded-[40px] p-6 md:p-8 border-8 border-white text-center relative max-w-4xl mx-auto shadow-2xl shadow-pink-100/70">
                  <div className="absolute top-2 left-6 text-2xl animate-bounce">🎈</div>
                  <div className="absolute bottom-2 right-6 text-2xl animate-bounce">🧸</div>
                  
                  <span className="text-xs bg-brand-pink/15 text-brand-pink font-black px-3.5 py-1 rounded-full uppercase tracking-wider mb-3.5 inline-block">
                    無料のぬりえをダウンロードして知育保育を楽しもう！
                  </span>
                  <h2 className="text-2xl md:text-3.5xl font-black text-brand-dark leading-tight">
                    おいしいおやつ・かわいい動物のぬりえがいっぱい！
                  </h2>
                  <p className="text-xs md:text-sm text-gray-500 mt-3 max-w-2xl mx-auto leading-relaxed font-semibold">
                    子供の色彩感覚や集中力を育むぬりえが全部無料！ご家庭のプリンターで印刷するか、スマホからタップするだけでも色が塗れます。
                  </p>
                </div>

                {/* Filter and Search Layout Segment */}
                <div className="bg-white/60 backdrop-blur-md rounded-[24px] border-2 border-white p-4 shadow-xl shadow-pink-50/50 flex flex-col md:flex-row items-center justify-between gap-4 max-w-4xl mx-auto">
                  {/* Category Pills */}
                  <div className="flex flex-wrap gap-1.5 justify-center md:justify-start w-full md:w-auto">
                    {/* Dynamically extract categories from current coloring pages */}
                    {["すべて", ...Array.from(new Set(coloringPages.map(p => p.category).filter(Boolean)))].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-4 py-2 rounded-full text-xs font-black transition-all cursor-pointer ${
                          selectedCategory === cat
                            ? 'bg-brand-pink text-white shadow-md shadow-pink-200 border border-brand-pink'
                            : 'bg-white hover:bg-pink-50/40 text-[#4A4A4A] border border-gray-100'
                        }`}
                      >
                        {cat === 'すべて' ? '🌈 すべて' : cat}
                      </button>
                    ))}
                  </div>

                  {/* Cute search input */}
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-brand-pink/70 pointer-events-none" />
                    <input
                      type="text"
                      className="w-full pl-10 pr-4 py-2.5 text-xs font-bold rounded-2xl bg-white border border-gray-200 outline-none focus:border-brand-pink/60 text-brand-dark placeholder-gray-400"
                      placeholder="ゾウ、海の生き物などをお気軽検索..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                {/* Dynamic listings grid */}
                {filteredPages.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {filteredPages.map((page) => (
                      <ColoringCard
                        key={page.slug}
                        page={page}
                        onSelect={handleSelectPage}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 bg-white rounded-[32px] border border-dashed border-pink-200 shadow-sm max-w-md mx-auto">
                    <Baby className="w-12 h-12 text-brand-pink/60 mx-auto mb-3" />
                    <h4 className="font-black text-brand-dark text-sm">お探しのぬりえは見つかりません</h4>
                    <p className="text-xs text-gray-505 mt-1.5 max-w-xs mx-auto">
                      別の言葉で検索するか、上のメニューから他のカテゴリーをタップしてみてくださいね。
                    </p>
                  </div>
                )}
              </div>
            ) : (
              // --- INDIVIDUAL WORK DETAILS PAGE ---
              <div className="space-y-6 animate-fade-in">
                
                {/* Back button */}
                <button
                  onClick={handleBackToGallery}
                  className="inline-flex items-center gap-1.5 text-xs font-black text-brand-dark bg-white hover:bg-gray-50 border-2 border-gray-150 px-4 py-2.5 rounded-2xl transition-all cursor-pointer shadow-sm hover:shadow-md"
                >
                  <ChevronLeft className="w-4 h-4 text-brand-pink" />
                  ギャラリー一覧に戻る
                </button>

                {/* Two-column layout */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                  
                  {/* Left Column (Core coloring print visualizer & live painter widget) */}
                  <div className="xl:col-span-7 space-y-6">
                    
                    {/* Primary Coloring Page Print Container */}
                    <div className="bg-white rounded-[40px] shadow-2xl shadow-pink-100/70 border-8 border-white p-5 md:p-8 flex flex-col items-center">
                      
                      {/* Printable Area */}
                      <div 
                        id="printable-coloring-target" 
                        className="w-full max-w-[420px] aspect-[4/5] bg-white border-2 border-dashed border-gray-200 rounded-[32px] p-6 flex items-center justify-center overflow-hidden"
                      >
                        <img
                          src={selectedPage.image}
                          alt={selectedPage.title}
                          className="max-h-full max-w-full object-contain pointer-events-none opacity-95"
                          referrerPolicy="no-referrer"
                        />
                      </div>

                      {/* Print and Save utility controls */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full max-w-[420px] mt-6">
                        <button
                          onClick={triggerPrint}
                          className="flex items-center justify-center gap-2 py-4 px-6 bg-brand-pink hover:bg-[#ff7b8f] text-white font-black text-xs rounded-full shadow-lg shadow-pink-150 transition-all cursor-pointer transform active:scale-95"
                        >
                          <Printer className="w-4 h-4" />
                          用紙に印刷する (A4/PDF)
                        </button>
                        <a
                          href={selectedPage.image}
                          download={`${selectedPage.slug}.${selectedPage.imageType}`}
                          className="flex items-center justify-center gap-2 py-4 px-6 bg-brand-mint hover:bg-brand-mint-hover text-white font-black text-xs rounded-full shadow-lg shadow-emerald-50 transition-all cursor-pointer text-center transform active:scale-95"
                        >
                          <Download className="w-4 h-4" />
                          ぬりえを保存する
                        </a>
                      </div>
                      <p className="text-[10px] text-gray-400 text-center mt-4 leading-relaxed max-w-sm font-semibold">
                        ※「用紙に印刷する」をタップすると、ヘッダー等を自動で隠し、塗り絵イラストだけをA4サイズに美しく配置して印刷画面を開きます。
                      </p>
                    </div>

                    {/* Interactive digital paint element */}
                    <InteractivePainter 
                      imageUrl={selectedPage.image} 
                      title={selectedPage.title} 
                    />
                  </div>

                  {/* Right Column (Children's Stories & Parent's Educational Blogs) */}
                  <div className="xl:col-span-5 flex flex-col gap-6">
                    
                    {/* Details container */}
                    <div className="bg-white/60 p-6 sm:p-8 rounded-[32px] border-2 border-white/80 shadow-xl shadow-pink-50/20 space-y-6">
                      <div>
                        {/* Category tag and header tags */}
                        <div className="flex items-center justify-between gap-3 flex-wrap border-b border-gray-100 pb-4 mb-4">
                          <span className="bg-pink-100 text-brand-pink text-xs font-black px-3.5 py-1 rounded-full uppercase tracking-wider">
                            🎀 {selectedPage.category}
                          </span>
                          <span className="text-[10px] text-gray-400 font-bold tracking-wider">
                            NO: #{selectedPage.id}
                          </span>
                        </div>

                        <h2 className="text-xl sm:text-2xl font-black text-brand-dark leading-snug">
                          {selectedPage.title}
                        </h2>
                        <p className="text-xs text-gray-550 leading-relaxed italic mt-3 bg-white/40 p-4 rounded-2xl border border-white/60 font-semibold">
                          {selectedPage.description}
                        </p>
                      </div>

                      {/* The main Japanese optimized article content */}
                      <div className="prose prose-pink max-w-none text-xs text-gray-650 leading-relaxed space-y-3">
                        {renderArticle(selectedPage.article)}
                      </div>

                      {/* SEO playing keywords tag board */}
                      <div className="border-t border-gray-150 pt-5">
                        <span className="text-[10px] font-black text-gray-400 block mb-2 px-0.5 uppercase tracking-wide">あそびのキーワード</span>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedPage.seo.keywords && selectedPage.seo.keywords.map((kw) => (
                            <span key={kw} className="bg-pink-100/40 text-brand-pink text-[10px] font-black px-2.5 py-1 rounded-md border border-pink-100/50">
                              #{kw}
                            </span>
                          ))}
                        </div>
                      </div>

                    </div>
                  </div>
                </div>

              </div>
            )}
          </>
        )}

      </main>

      {/* Footer element styled in Artistic Flair's Deep slate theme */}
      <footer className="bg-brand-dark text-white/80 border-t-4 border-brand-pink py-12 px-6 mt-20 text-xs text-center relative select-none shadow-inner">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex items-center justify-center gap-2.5">
            <div className="w-10 h-10 bg-brand-pink rounded-xl flex items-center justify-center rotate-3 shadow-md">
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-white fill-current">
                <path d="M21.7 8.01L15.99 2.3c-.39-.39-1.02-.39-1.41 0L3.29 13.59c-.18.19-.29.44-.29.7V19c0 .55.45 1 1 1h4.71c.27 0 .52-.11.7-.29l11.29-11.29c.39-.39.39-1.03 0-1.41zM7.59 18H5v-2.59l9-9L16.59 9l-9 9z"/>
              </svg>
            </div>
            <span className="font-black text-white text-base tracking-wide">ぬりぬり！<span className="text-brand-pink">ぬりえ！</span></span>
          </div>
          <p className="max-w-md mx-auto text-[11px] text-gray-300 leading-relaxed font-semibold">
            ぬりぬり！ぬりえ！はお子様の知育・発達を促すために作られた、たくさんの可愛い塗り絵を無料提供する塗り絵専門ギャラリーサイトです。いつでもどこでも自由にダウンロード・印刷して遊んでいただけます。
          </p>
          <div className="text-[10px] text-gray-400 border-t border-white/5 pt-4">
            &copy; {new Date().getFullYear()} ぬりぬり！ぬりえ！ | All Rights Reserved
          </div>
        </div>
      </footer>

    </div>
  );
}

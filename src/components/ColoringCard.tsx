import { Calendar, Download, Eye } from 'lucide-react';
import { ColoringPage } from '../types';

interface ColoringCardProps {
  key?: string | number;
  page: ColoringPage;
  onSelect: (page: ColoringPage) => void;
}

export default function ColoringCard({ page, onSelect }: ColoringCardProps) {
  // Translate ISO date into Japanese formatted date
  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
    } catch (e) {
      return '';
    }
  };

  return (
    <article
      id={`coloring-card-${page.slug}`}
      className="group bg-white rounded-[32px] border-4 border-white hover:border-brand-pink/40 overflow-hidden shadow-lg shadow-pink-50/40 hover:shadow-2xl hover:shadow-pink-100/60 transition-all duration-300 flex flex-col h-full transform hover:-translate-y-1.5"
    >
      {/* Category Indicator Tag */}
      <div className="relative aspect-[4/3] bg-pink-50/10 flex items-center justify-center overflow-hidden border-b border-gray-100 p-4">
        {page.category && (
          <span className="absolute top-3 left-3 bg-white/90 text-brand-pink text-[10px] font-black tracking-wider px-2.5 py-1 rounded-full border border-pink-100 shadow-sm z-20">
            🎀 {page.category}
          </span>
        )}

        <img
          src={page.image}
          alt={page.title}
          className="max-h-[85%] max-w-[85%] object-contain group-hover:scale-105 transition-transform duration-300 pointer-events-none drop-shadow-sm opacity-90"
          referrerPolicy="no-referrer"
        />

        {/* View overlay */}
        <div 
          onClick={() => onSelect(page)}
          className="absolute inset-0 bg-brand-pink/10 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300 cursor-pointer"
        >
          <span className="bg-white text-brand-dark/95 font-black px-4 py-2.5 rounded-full flex items-center gap-1.5 text-xs shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 hover:bg-brand-pink hover:text-white">
            <Eye className="w-3.5 h-3.5" />
            ぬりえをひらく
          </span>
        </div>
      </div>

      {/* Card Content parameters */}
      <div className="p-5 flex-grow flex flex-col justify-between">
        <div>
          {/* Metadata Row */}
          <div className="flex items-center gap-3 text-[11px] text-gray-400 mb-2 font-bold tracking-wide">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-brand-pink" />
              {formatDate(page.createdAt)}
            </span>
          </div>

          <h2 
            onClick={() => onSelect(page)}
            className="text-base font-black text-brand-dark hover:text-brand-pink cursor-pointer leading-snug mb-2 line-clamp-2 transition-colors"
          >
            {page.title}
          </h2>

          <p className="text-xs text-gray-550 leading-relaxed mb-4 line-clamp-3">
            {page.description}
          </p>
        </div>

        <div>
          {/* Tags with Artistic Flair candy styling */}
          <div className="flex flex-wrap gap-1 mb-4">
            {page.tags && page.tags.slice(0, 3).map((tag) => (
              <span 
                key={tag} 
                className="bg-pink-100/40 text-brand-pink text-[9px] font-black px-2 py-0.5 rounded-md border border-pink-100/20"
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* Download and Select buttons with high-contrast palette styles */}
          <div className="grid grid-cols-2 gap-2 mt-auto">
            <button
              onClick={() => onSelect(page)}
              className="py-2.5 px-3 bg-gray-50 hover:bg-pink-50/50 text-[#4A4A4A] text-xs font-black rounded-full border border-gray-100 transition-colors cursor-pointer text-center"
            >
              みてみる
            </button>
            <a
              href={page.image}
              download={`${page.slug}.${page.imageType}`}
              className="py-2.5 px-3 bg-brand-mint hover:bg-brand-mint-hover text-white text-xs font-black rounded-full transition-all cursor-pointer text-center flex items-center justify-center gap-1 shadow-md shadow-emerald-50"
            >
              <Download className="w-3.5 h-3.5" />
              保存
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}

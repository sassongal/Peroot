"use client";

import { useState } from "react";
import { Play } from "lucide-react";

const YT_ID = "B8_n6uO3Qy4";

export function FeaturesVideoEmbed() {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="relative rounded-2xl overflow-hidden bg-black aspect-video ring-1 ring-white/10 shadow-2xl shadow-black/50">
      {playing ? (
        <iframe
          className="absolute inset-0 w-full h-full"
          src={`https://www.youtube.com/embed/${YT_ID}?autoplay=1&rel=0&modestbranding=1`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="פירוט - כל מה שאתם צריכים לדעת"
        />
      ) : (
        <button
          onClick={() => setPlaying(true)}
          className="absolute inset-0 w-full h-full group cursor-pointer"
          aria-label="הפעל סרטון הדרכה"
        >
          <img
            src={`https://i.ytimg.com/vi/${YT_ID}/hqdefault.jpg`}
            alt="סרטון הדרכה לפירוט"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent group-hover:from-black/80 transition-all duration-300" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-amber-500 flex items-center justify-center shadow-2xl shadow-amber-500/50 group-hover:scale-110 group-hover:shadow-amber-500/70 transition-all duration-200">
              <Play className="w-8 h-8 text-white fill-white ml-1" />
            </div>
          </div>
          <div className="absolute bottom-5 right-5 text-white/90 text-sm font-medium bg-black/50 backdrop-blur-sm px-4 py-1.5 rounded-full border border-white/10">
            צפו בפירוט בפעולה
          </div>
        </button>
      )}
    </div>
  );
}

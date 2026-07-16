// Gamification: badges based on user activity counts.
export type Badge = {
  id: string;
  title: string;
  desc: string;
  icon: string;
  color: string; // tailwind gradient
  earned: boolean;
};

export type Stats = {
  farms: number;
  hectares: number;
  readings: number;
  analyses: number;
};

export function computeBadges(s: Stats): Badge[] {
  return [
    { id: "first-farm", title: "أول مزرعة", desc: "أنشأت مزرعتك الأولى", icon: "🌱",
      color: "from-emerald-400 to-green-600", earned: s.farms >= 1 },
    { id: "surveyor", title: "مساح الأرض", desc: "رسمت أكثر من 1 هكتار", icon: "📐",
      color: "from-cyan-400 to-blue-600", earned: s.hectares >= 1 },
    { id: "sensor-master", title: "خبير الاستشعار", desc: "10 قراءات تربة", icon: "📡",
      color: "from-amber-400 to-orange-600", earned: s.readings >= 10 },
    { id: "analyst", title: "محلل نشيط", desc: "20 تحليل", icon: "📊",
      color: "from-violet-400 to-purple-600", earned: s.analyses >= 20 },
    { id: "veteran", title: "فلاح محنك", desc: "50 قراءة أو أكثر", icon: "🏆",
      color: "from-yellow-400 to-amber-600", earned: s.readings >= 50 },
  ];
}

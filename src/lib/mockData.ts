// Mock demo data for AgriPen
export const FARMER = {
  name: "أشرف مهلول",
  nameLatin: "Achraf Mehloul",
  location: "تيسمسيلت، الجزائر",
  farms: 3,
  hectares: 12.5,
};

export const SOIL_LATEST = {
  moisture: 28, temperature: 24, ph: 6.8, salinity: 1.1,
  nitrogen: 22, phosphorus: 14, potassium: 95, organic: 2.4,
  takenAt: "اليوم 09:14",
};

export const CROP_RECOMMENDATIONS = [
  { id: "tomato", name: "طماطم", score: 92, season: "ربيع/صيف", water: "متوسط", profit: "عالي", emoji: "🍅" },
  { id: "wheat", name: "قمح صلب", score: 88, season: "شتاء", water: "منخفض", profit: "متوسط", emoji: "🌾" },
  { id: "olive", name: "زيتون", score: 84, season: "دائم", water: "منخفض جدا", profit: "عالي", emoji: "🫒" },
  { id: "potato", name: "بطاطا", score: 79, season: "خريف", water: "عالي", profit: "متوسط", emoji: "🥔" },
  { id: "pepper", name: "فلفل حلو", score: 76, season: "صيف", water: "متوسط", profit: "متوسط", emoji: "🌶️" },
  { id: "barley", name: "شعير", score: 73, season: "شتاء", water: "منخفض", profit: "متوسط", emoji: "🌾" },
];

export const FERTILIZATION_PLAN = [
  { crop: "طماطم", type: "NPK 15-15-15", amount: "20 كغ/هكتار", when: "هاد الأسبوع", reason: "نقص النيتروجين" },
  { crop: "فلفل", type: "كومبوست عضوي", amount: "2 طن/هكتار", when: "آخر الشهر", reason: "تحسين بنية التربة" },
  { crop: "قمح", type: "يوريا 46%", amount: "150 كغ/هكتار", when: "بعد 10 أيام", reason: "مرحلة التفرع" },
  { crop: "زيتون", type: "سلفات البوتاسيوم", amount: "300 غ/شجرة", when: "بداية الإزهار", reason: "تحسين جودة الزيت" },
];

export const WEATHER_FORECAST = [
  { day: "اليوم", icon: "☀️", temp: 28, min: 18, rain: 0, wind: 12, humidity: 45, advice: "وقت مناسب للري الصباحي" },
  { day: "غدا", icon: "⛅", temp: 26, min: 17, rain: 10, wind: 15, humidity: 55, advice: "أجل التسميد" },
  { day: "الخميس", icon: "🌧️", temp: 22, min: 15, rain: 65, wind: 20, humidity: 80, advice: "لا حاجة للري" },
  { day: "الجمعة", icon: "🌦️", temp: 24, min: 16, rain: 30, wind: 18, humidity: 70, advice: "افحص التصريف" },
  { day: "السبت", icon: "☀️", temp: 29, min: 19, rain: 0, wind: 10, humidity: 40, advice: "ري إضافي مساءا" },
  { day: "الأحد", icon: "☀️", temp: 31, min: 20, rain: 0, wind: 8, humidity: 35, advice: "احذر الإجهاد الحراري" },
  { day: "الإثنين", icon: "⛅", temp: 27, min: 18, rain: 5, wind: 14, humidity: 50, advice: "ظروف عادية" },
];

// History spanning ~10 years for the period filter (3m / 6m / 1y / 5y / 10y)
function d(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

export const HISTORY: Array<{ id: string; date: string; type: string; farm: string; result: string; icon: string }> = [
  { id: "h1",  date: d(1),    type: "تحليل تربة",   farm: "البستان الكبير", result: "حموضة مثالية (pH 6.8) — رطوبة 28%", icon: "🌱" },
  { id: "h2",  date: d(3),    type: "تشخيص نبتة",   farm: "حقل الزيتون",   result: "ذبابة الزيتون — علاج بيولوجي موصى به", icon: "🌿" },
  { id: "h3",  date: d(5),    type: "توصية محصول",  farm: "—",              result: "اقتراح: طماطم (92%)، قمح صلب (88%)", icon: "🌾" },
  { id: "h4",  date: d(10),   type: "تحليل تربة",   farm: "حقل القمح",      result: "نقص نيتروجين خفيف", icon: "🌱" },
  { id: "h5",  date: d(20),   type: "تشخيص شجرة",   farm: "حقل الزيتون",   result: "صحة جيدة (84/100)", icon: "🌳" },
  { id: "h6",  date: d(45),   type: "تحليل تربة",   farm: "البستان الكبير", result: "ملوحة مرتفعة قليلا — غسيل بالماء", icon: "🌱" },
  { id: "h7",  date: d(75),   type: "تشخيص نبتة",   farm: "البستان الكبير", result: "بقع على أوراق الطماطم — Mildiou", icon: "🌿" },
  { id: "h8",  date: d(110),  type: "تحليل تربة",   farm: "حقل القمح",      result: "مادة عضوية ممتازة 2.4%", icon: "🌱" },
  { id: "h9",  date: d(160),  type: "توصية تسميد", farm: "البستان الكبير", result: "NPK 15-15-15 — 20 كغ/هكتار", icon: "🧪" },
  { id: "h10", date: d(220),  type: "تحليل تربة",   farm: "حقل الزيتون",   result: "تربة جيدة التهوية", icon: "🌱" },
  { id: "h11", date: d(310),  type: "تشخيص نبتة",   farm: "البستان الكبير", result: "ذبول فيوزاريوم — معالجة فطرية", icon: "🌿" },
  { id: "h12", date: d(400),  type: "تحليل تربة",   farm: "حقل القمح",      result: "بوتاسيوم منخفض — 95 mg/kg", icon: "🌱" },
  { id: "h13", date: d(620),  type: "تشخيص شجرة",   farm: "حقل الزيتون",   result: "نقص حديد طفيف", icon: "🌳" },
  { id: "h14", date: d(820),  type: "تحليل تربة",   farm: "البستان الكبير", result: "تحسن ملحوظ بعد التعديل", icon: "🌱" },
  { id: "h15", date: d(1100), type: "توصية محصول",  farm: "—",              result: "اقتراح دورة زراعية 3 سنوات", icon: "🌾" },
  { id: "h16", date: d(1500), type: "تحليل تربة",   farm: "حقل القمح",      result: "أول تحليل بعد التركيب — حالة متوسطة", icon: "🌱" },
  { id: "h17", date: d(2000), type: "تشخيص نبتة",   farm: "البستان الكبير", result: "آفة المن — معالجة طبيعية", icon: "🌿" },
  { id: "h18", date: d(2400), type: "تحليل تربة",   farm: "حقل الزيتون",   result: "حالة أولية — pH 7.4 (قلوية خفيفة)", icon: "🌱" },
  { id: "h19", date: d(2900), type: "تشخيص شجرة",   farm: "حقل الزيتون",   result: "تقليم موصى به — صحة 71/100", icon: "🌳" },
  { id: "h20", date: d(3300), type: "تحليل تربة",   farm: "البستان الكبير", result: "نقطة الانطلاق — قبل استعمال AgriPen", icon: "🌱" },
];

export const NOTIFICATIONS = [
  { id: "n1", title: "حان وقت الري",       body: "حقل 1 - طماطم: ري مجدول الساعة 06:30",         time: "قبل 5 د", level: "info",   icon: "💧" },
  { id: "n2", title: "تنبيه مناخي",         body: "أمطار غزيرة متوقعة الخميس — أجل التسميد",       time: "قبل ساعة", level: "warn",   icon: "🌧️" },
  { id: "n3", title: "نقص نيتروجين",        body: "البستان الكبير: التربة تحتاج تسميد NPK",         time: "اليوم 08:10", level: "warn",   icon: "🧪" },
  { id: "n4", title: "تقرير أسبوعي جاهز",   body: "ملخص أداء مزارعك جاهز للعرض",                   time: "أمس",      level: "info",   icon: "📊" },
  { id: "n5", title: "مرض محتمل",           body: "كشف بقع على أوراق الطماطم — افحص حقل 1",       time: "أمس",      level: "danger", icon: "🦠" },
  { id: "n6", title: "جهاز AgriPen متصل",   body: "تم استلام قراءة جديدة عبر البلوتوث",            time: "اليوم 09:14", level: "info",   icon: "📡" },
];

export const ANALYTICS = {
  yieldTrend: [
    { m: "جانفي", v: 32 }, { m: "فيفري", v: 41 }, { m: "مارس", v: 58 },
    { m: "أفريل", v: 72 }, { m: "ماي", v: 84 }, { m: "جوان", v: 91 },
  ],
  waterSaved: 38,
  fertilizerSaved: 22,
  diseaseDetected: 7,
  healthyFields: 88,
};

export const TREES = [
  { id: "t1", name: "شجرة زيتون #12",   age: 8,  height: "3.2م", health: 84, issue: null,                  lastCheck: "أمس" },
  { id: "t2", name: "شجرة زيتون #15",   age: 12, height: "4.1م", health: 62, issue: "ذبابة الزيتون",       lastCheck: "اليوم" },
  { id: "t3", name: "شجرة برتقال #3",   age: 5,  height: "2.5م", health: 91, issue: null,                  lastCheck: "أمس" },
  { id: "t4", name: "شجرة تين #1",      age: 15, height: "4.8م", health: 78, issue: "نقص حديد طفيف",      lastCheck: "منذ 3 أيام" },
];

export const DIALECTS = [
  { id: "darija",    label: "الدارجة الجزائرية" },
  { id: "wahrania",  label: "الوهرانية" },
  { id: "chelfia",   label: "الشلفية" },
  { id: "tlemcania", label: "التلمسانية" },
  { id: "charqia",   label: "الشرقية" },
  { id: "adraria",   label: "الأدرارية" },
];

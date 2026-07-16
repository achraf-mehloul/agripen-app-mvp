// Interactive spotlight tour — appears once per user (stored in localStorage).
import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useT } from "@/lib/i18n";

type Step = { title: string; description: string; icon: string };

const KEY = "agripen.tour.done";

export function OnboardingTour() {
  const { lang } = useT();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(KEY)) {
      const t = setTimeout(() => setOpen(true), 900);
      return () => clearTimeout(t);
    }
  }, []);

  const STEPS: readonly Step[] = STEPS_BY_LANG[lang as keyof typeof STEPS_BY_LANG] ?? STEPS_BY_LANG.ar;

  if (!open) return null;
  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  const close = () => { localStorage.setItem(KEY, "1"); setOpen(false); };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4 rise-in">
      <div className="glass-strong rounded-3xl w-full max-w-md p-6 relative">
        <button onClick={close} className="absolute top-3 end-3 size-8 rounded-full grid place-items-center hover:bg-white/10 press" aria-label="close">
          <X className="size-4" />
        </button>
        <div className="flex flex-col items-center text-center gap-3">
          <div className="text-5xl">{s.icon}</div>
          <h2 className="text-xl font-bold">{s.title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>
          <div className="flex gap-1.5 mt-2">
            {STEPS.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-primary" : "w-1.5 bg-muted"}`} />
            ))}
          </div>
        </div>
        <div className="mt-6 flex gap-2">
          {step > 0 && (
            <button onClick={() => setStep(step - 1)} className="flex-1 rounded-2xl border px-4 py-2.5 text-sm font-semibold press flex items-center justify-center gap-1">
              <ChevronRight className="size-4" /> السابق
            </button>
          )}
          <button
            onClick={() => (last ? close() : setStep(step + 1))}
            className="flex-1 rounded-2xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-bold press flex items-center justify-center gap-1"
          >
            {last ? "ابدأ" : "التالي"} <ChevronLeft className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

const STEPS_BY_LANG = {
  ar: [
    { icon: "🌱", title: "مرحبا بك في AgriPen", description: "منصة زراعية ذكية تجمع تحليل التربة، تشخيص الأمراض، والمساعد الصوتي في مكان واحد." },
    { icon: "🗺️", title: "مزرعتك على الخريطة", description: "ارسم حدود أرضك أو استخرجها تلقائيا من صورة، وسيقترح الذكاء الاصطناعي أفضل نقاط الغرس." },
    { icon: "🎙️", title: "تحدث بلهجتك", description: "استخدم زر الميكروفون لسؤال المساعد بالدارجة، أو صف عرض المرض صوتيا في صفحة التشخيص." },
    { icon: "📊", title: "بياناتك آمنة", description: "قراءات القلم تُحفظ في حسابك، ويمكنك تصدير تقارير PDF في أي وقت." },
  ],
  fr: [
    { icon: "🌱", title: "Bienvenue sur AgriPen", description: "Analyse du sol, diagnostic des maladies et assistant vocal, tout en un." },
    { icon: "🗺️", title: "Votre ferme sur la carte", description: "Dessinez ou extrayez automatiquement les limites de votre terrain." },
    { icon: "🎙️", title: "Parlez votre langue", description: "Interrogez l'assistant vocalement, y compris en darija." },
    { icon: "📊", title: "Vos données sont sécurisées", description: "Sauvegardées dans votre compte, exportables en PDF." },
  ],
  en: [
    { icon: "🌱", title: "Welcome to AgriPen", description: "Soil analysis, plant disease diagnosis, and a voice assistant in one place." },
    { icon: "🗺️", title: "Your farm on the map", description: "Draw or auto-extract your field boundary, get AI planting suggestions." },
    { icon: "🎙️", title: "Speak your language", description: "Ask the assistant by voice, describe symptoms vocally." },
    { icon: "📊", title: "Your data is safe", description: "Stored in your account, exportable as PDF anytime." },
  ],
  zgh: [
    { icon: "🌱", title: "ⴰⵣⵓⵍ ⴳ AgriPen", description: "ⵜⵉⵣⵔⴰⵡⵜ ⵏ ⵡⴰⴽⴰⵍ ⴷ ⵜⵉⵎⴰⴹⵓⵏⵜ ⴰⵎⴰⵎⵎⴰⵙ." },
    { icon: "🗺️", title: "ⵜⴰⵢⵎⵎⴰ ⵏⵏⴽ", description: "ⴽⵎⵍ ⵜⴰⵢⵎⵎⴰ ⵏⵏⴽ ⵅⴼ ⵜⴰⴽⴰⵔⴹⴰ." },
    { icon: "🎙️", title: "ⵙⵙⵉⵡⵍ", description: "ⵙⵙⵉⵡⵍ ⵉ ⵓⵎⵔⴰⵢ ⵙ ⵜⵎⴰⵣⵉⵖⵜ." },
    { icon: "📊", title: "ⵉⵙⴼⴽⴰ ⵏⵏⴽ", description: "ⵉⵜⵜⵓⴳⴰⵏ ⴷⴳ ⵓⵎⵉⴹⴰⵏ ⵏⵏⴽ." },
  ],
} as const;

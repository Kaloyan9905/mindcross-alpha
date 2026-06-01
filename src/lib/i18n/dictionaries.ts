import type { Locale } from "./config";

/** Translatable strings for the public homepage + primary nav. */
export interface Dictionary {
  nav: { home: string; find: string; mission: string };
  hero: {
    eyebrow: string;
    titleLead: string;
    titleAccent: string;
    subtitle: string;
    ctaFind: string;
    ctaJoin: string;
    trust: [string, string, string];
  };
  steps: {
    heading: string;
    sub: string;
    items: [
      { title: string; body: string },
      { title: string; body: string },
      { title: string; body: string },
    ];
  };
  featured: { heading: string; sub: string; browse: string };
  mission: { text: string; read: string };
  closing: { title: string; sub: string; cta: string };
}

const en: Dictionary = {
  nav: { home: "Home", find: "Find a Therapist", mission: "Our Mission" },
  hero: {
    eyebrow: "Culturally-matched therapy",
    titleLead: "Therapy that speaks",
    titleAccent: "your language.",
    subtitle:
      "MindCross connects migrants, refugees, and international students with therapists who share their language and cultural background — so you can be understood from the very first session.",
    ctaFind: "Find a therapist",
    ctaJoin: "Become a therapist",
    trust: [
      "Free during early access",
      "Therapists across 10+ languages",
      "Every therapist verified",
    ],
  },
  steps: {
    heading: "How it works",
    sub: "Three calm steps. No pressure, and nothing to pay.",
    items: [
      {
        title: "Filter by language and need",
        body: "Choose the language you feel most yourself in, and tell us what you'd like support with.",
      },
      {
        title: "Choose a therapist",
        body: "Read calm, honest profiles and pick someone who understands where you come from.",
      },
      {
        title: "Book a free session",
        body: "Pick a time that works for you. Your first session is free while we're in early access.",
      },
    ],
  },
  featured: {
    heading: "Meet a few of our therapists",
    sub: "Every therapist is verified and chosen for their cultural understanding.",
    browse: "Browse all",
  },
  mission: {
    text: "Finding mental-health support that understands your language, culture, and story should not be one more barrier. That gap is why we built MindCross.",
    read: "Read our mission",
  },
  closing: {
    title: "Take the first step, when you're ready.",
    sub: "There is no rush. When you feel ready, we'll help you find someone who understands.",
    cta: "Find a therapist",
  },
};

const uk: Dictionary = {
  nav: { home: "Головна", find: "Знайти терапевта", mission: "Наша місія" },
  hero: {
    eyebrow: "Терапія з урахуванням культури",
    titleLead: "Терапія, що говорить",
    titleAccent: "вашою мовою.",
    subtitle:
      "MindCross поєднує мігрантів, біженців та іноземних студентів із терапевтами, які поділяють їхню мову та культурне походження — щоб вас розуміли вже з першої сесії.",
    ctaFind: "Знайти терапевта",
    ctaJoin: "Стати терапевтом",
    trust: [
      "Безкоштовно під час раннього доступу",
      "Терапевти понад 10 мовами",
      "Кожен терапевт перевірений",
    ],
  },
  steps: {
    heading: "Як це працює",
    sub: "Три спокійні кроки. Без тиску й без оплати.",
    items: [
      {
        title: "Оберіть мову та потребу",
        body: "Виберіть мову, якою ви почуваєтеся собою, і розкажіть, із чим вам потрібна підтримка.",
      },
      {
        title: "Оберіть терапевта",
        body: "Читайте спокійні, чесні профілі та оберіть того, хто розуміє, звідки ви.",
      },
      {
        title: "Забронюйте безкоштовну сесію",
        body: "Виберіть зручний час. Перша сесія безкоштовна під час раннього доступу.",
      },
    ],
  },
  featured: {
    heading: "Познайомтеся з нашими терапевтами",
    sub: "Кожен терапевт перевірений і обраний за культурне розуміння.",
    browse: "Переглянути всіх",
  },
  mission: {
    text: "Пошук психологічної підтримки, яка розуміє вашу мову, культуру та історію, не має бути ще однією перешкодою. Саме тому ми створили MindCross.",
    read: "Читати нашу місію",
  },
  closing: {
    title: "Зробіть перший крок, коли будете готові.",
    sub: "Поспішати не треба. Коли відчуєте готовність, ми допоможемо знайти того, хто зрозуміє.",
    cta: "Знайти терапевта",
  },
};

const ar: Dictionary = {
  nav: { home: "الرئيسية", find: "ابحث عن معالج", mission: "مهمتنا" },
  hero: {
    eyebrow: "علاج نفسي متوافق ثقافياً",
    titleLead: "علاج يتحدث",
    titleAccent: "لغتك.",
    subtitle:
      "تربط MindCross المهاجرين واللاجئين والطلاب الدوليين بمعالجين يشاركونهم لغتهم وخلفيتهم الثقافية — لتشعر بأنك مفهوم منذ الجلسة الأولى.",
    ctaFind: "ابحث عن معالج",
    ctaJoin: "كن معالجاً",
    trust: [
      "مجاني خلال الوصول المبكر",
      "معالجون بأكثر من 10 لغات",
      "كل معالج موثّق",
    ],
  },
  steps: {
    heading: "كيف يعمل",
    sub: "ثلاث خطوات هادئة. دون ضغط ودون دفع.",
    items: [
      {
        title: "اختر اللغة والحاجة",
        body: "اختر اللغة التي تشعر فيها بنفسك، وأخبرنا بما تريد الدعم فيه.",
      },
      {
        title: "اختر معالجاً",
        body: "اقرأ ملفات صادقة وهادئة واختر من يفهم من أين أتيت.",
      },
      {
        title: "احجز جلسة مجانية",
        body: "اختر وقتاً يناسبك. جلستك الأولى مجانية خلال الوصول المبكر.",
      },
    ],
  },
  featured: {
    heading: "تعرّف على بعض معالجينا",
    sub: "كل معالج موثّق ومختار لفهمه الثقافي.",
    browse: "تصفّح الجميع",
  },
  mission: {
    text: "ألا يكون العثور على دعم نفسي يفهم لغتك وثقافتك وقصتك عائقاً إضافياً. هذه الفجوة هي سبب إنشائنا MindCross.",
    read: "اقرأ مهمتنا",
  },
  closing: {
    title: "اتخذ الخطوة الأولى عندما تكون مستعداً.",
    sub: "لا عجلة. عندما تشعر بالاستعداد، سنساعدك في إيجاد من يفهمك.",
    cta: "ابحث عن معالج",
  },
};

const es: Dictionary = {
  nav: { home: "Inicio", find: "Buscar terapeuta", mission: "Nuestra misión" },
  hero: {
    eyebrow: "Terapia con afinidad cultural",
    titleLead: "Terapia que habla",
    titleAccent: "tu idioma.",
    subtitle:
      "MindCross conecta a migrantes, refugiados y estudiantes internacionales con terapeutas que comparten su idioma y origen cultural, para que te sientas comprendido desde la primera sesión.",
    ctaFind: "Buscar terapeuta",
    ctaJoin: "Hazte terapeuta",
    trust: [
      "Gratis durante el acceso anticipado",
      "Terapeutas en más de 10 idiomas",
      "Cada terapeuta verificado",
    ],
  },
  steps: {
    heading: "Cómo funciona",
    sub: "Tres pasos tranquilos. Sin presión y sin pagar nada.",
    items: [
      {
        title: "Filtra por idioma y necesidad",
        body: "Elige el idioma en el que te sientes más tú y cuéntanos en qué te gustaría apoyo.",
      },
      {
        title: "Elige un terapeuta",
        body: "Lee perfiles honestos y tranquilos y elige a alguien que entienda de dónde vienes.",
      },
      {
        title: "Reserva una sesión gratis",
        body: "Elige una hora que te convenga. Tu primera sesión es gratis durante el acceso anticipado.",
      },
    ],
  },
  featured: {
    heading: "Conoce a algunos de nuestros terapeutas",
    sub: "Cada terapeuta está verificado y elegido por su comprensión cultural.",
    browse: "Ver todos",
  },
  mission: {
    text: "Encontrar apoyo de salud mental que entienda tu idioma, tu cultura y tu historia no debería ser una barrera más. Esa brecha es la razón por la que creamos MindCross.",
    read: "Lee nuestra misión",
  },
  closing: {
    title: "Da el primer paso cuando estés listo.",
    sub: "No hay prisa. Cuando te sientas listo, te ayudaremos a encontrar a alguien que te entienda.",
    cta: "Buscar terapeuta",
  },
};

export const dictionaries: Record<Locale, Dictionary> = { en, uk, ar, es };

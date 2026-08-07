import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Layers, Palette, Rocket, Sparkles, Mail, Phone, MapPin } from "lucide-react";
import heroImage from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "استوديو أفق — تصميم وتطوير مواقع عربية" },
      {
        name: "description",
        content:
          "نصمم ونبني مواقع ومتاجر إلكترونية عربية سريعة وأنيقة، من الفكرة حتى الإطلاق خلال أسابيع.",
      },
      { property: "og:title", content: "استوديو أفق — تصميم وتطوير مواقع عربية" },
      {
        property: "og:description",
        content: "من الفكرة إلى الإطلاق: مواقع ومتاجر عربية بتصميم أنيق وأداء عالٍ.",
      },
    ],
  }),
  component: Index,
});

const services = [
  {
    icon: Palette,
    title: "هوية بصرية",
    text: "شعار وألوان وخطوط عربية تعكس شخصية مشروعك وتُبقيه في الذاكرة.",
  },
  {
    icon: Layers,
    title: "تصميم واجهات",
    text: "واجهات عربية من اليمين إلى اليسار، مريحة للقراءة وسهلة على الجوال.",
  },
  {
    icon: Rocket,
    title: "تطوير وإطلاق",
    text: "مواقع سريعة ومتوافقة مع محركات البحث، جاهزة للنشر خلال أسابيع.",
  },
  {
    icon: Sparkles,
    title: "متابعة وتحسين",
    text: "تحديثات دورية وقياس للأداء لنُبقي الموقع في أفضل حالاته.",
  },
];

const works = [
  { name: "متجر رواق", type: "متجر إلكتروني", year: "٢٠٢٥" },
  { name: "مكتب البيان", type: "موقع مؤسسي", year: "٢٠٢٥" },
  { name: "منصة نُهى", type: "منصة تعليمية", year: "٢٠٢٦" },
  { name: "مقهى سِدرة", type: "هوية وموقع", year: "٢٠٢٦" },
];

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <a href="#top" className="font-display text-lg font-extrabold tracking-tight">
            استوديو <span className="text-primary">أفق</span>
          </a>
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#services" className="transition-colors hover:text-foreground">
              خدماتنا
            </a>
            <a href="#works" className="transition-colors hover:text-foreground">
              أعمالنا
            </a>
            <a href="#contact" className="transition-colors hover:text-foreground">
              تواصل
            </a>
          </nav>
          <a
            href="#contact"
            className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-soft transition-opacity hover:opacity-90"
          >
            ابدأ مشروعك
          </a>
        </div>
      </header>

      <main id="top">
        <section className="surface-arch relative overflow-hidden">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 md:grid-cols-2 md:py-28">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground">
                <span className="size-1.5 rounded-full bg-accent" />
                نستقبل مشاريع جديدة هذا الشهر
              </span>
              <h1 className="mt-6 text-4xl leading-[1.15] font-extrabold text-balance md:text-6xl">
                مواقع عربية <span className="text-gradient-gold">تليق بمشروعك</span>
              </h1>
              <p className="mt-5 max-w-md text-base leading-8 text-muted-foreground md:text-lg">
                نصمم ونبني مواقع ومتاجر إلكترونية بتصميم أنيق وأداء سريع — من أول فكرة حتى يوم
                الإطلاق.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#contact"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-lift transition-transform hover:-translate-y-0.5"
                >
                  احجز استشارة مجانية
                  <ArrowLeft className="size-4" />
                </a>
                <a
                  href="#works"
                  className="inline-flex items-center rounded-full border border-border bg-card px-7 py-3.5 text-sm font-semibold transition-colors hover:bg-secondary"
                >
                  تصفّح أعمالنا
                </a>
              </div>
              <dl className="mt-12 flex gap-10">
                {[
                  ["+٤٠", "مشروع مُنجز"],
                  ["٣ أسابيع", "متوسط الإطلاق"],
                  ["١٠٠٪", "متجاوب"],
                ].map(([value, label]) => (
                  <div key={label}>
                    <dt className="font-display text-2xl font-bold text-primary">{value}</dt>
                    <dd className="mt-1 text-xs text-muted-foreground">{label}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="relative">
              <div className="overflow-hidden rounded-[2.5rem] border border-border shadow-lift">
                <img
                  src={heroImage}
                  alt="عمارة عربية حديثة بأقواس وألوان رملية وخضراء"
                  width={1600}
                  height={1200}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="absolute -bottom-6 right-6 rounded-2xl border border-border bg-card px-5 py-4 shadow-soft">
                <p className="font-display text-sm font-bold">تصميم يُشبهك</p>
                <p className="mt-1 text-xs text-muted-foreground">لا قوالب جاهزة</p>
              </div>
            </div>
          </div>
        </section>

        <section id="services" className="mx-auto max-w-6xl px-5 py-20 md:py-28">
          <h2 className="text-3xl font-extrabold md:text-4xl">ماذا نقدّم؟</h2>
          <p className="mt-3 max-w-lg text-muted-foreground">
            فريق صغير يعمل بعناية على كل تفصيل، من الفكرة الأولى إلى ما بعد الإطلاق.
          </p>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {services.map(({ icon: Icon, title, text }) => (
              <article
                key={title}
                className="group rounded-3xl border border-border bg-card p-7 shadow-soft transition-transform hover:-translate-y-1"
              >
                <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-secondary text-primary">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-5 text-lg font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="works" className="border-y border-border bg-secondary/40">
          <div className="mx-auto max-w-6xl px-5 py-20 md:py-28">
            <h2 className="text-3xl font-extrabold md:text-4xl">مختارات من أعمالنا</h2>
            <ul className="mt-10 divide-y divide-border border-t border-border">
              {works.map((w) => (
                <li
                  key={w.name}
                  className="flex flex-wrap items-center justify-between gap-3 py-6 transition-colors hover:bg-card/60"
                >
                  <span className="font-display text-xl font-bold">{w.name}</span>
                  <span className="text-sm text-muted-foreground">{w.type}</span>
                  <span className="text-sm text-accent-foreground/70">{w.year}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-5 py-20 text-center md:py-28">
          <p className="font-display text-2xl leading-relaxed font-bold text-balance md:text-3xl">
            «أطلقنا الموقع خلال ثلاثة أسابيع، وتضاعفت طلباتنا في الشهر الأول. عمل دقيق وذوق عالٍ.»
          </p>
          <p className="mt-6 text-sm text-muted-foreground">ليلى المنصور — مؤسِّسة متجر رواق</p>
        </section>

        <section id="contact" className="mx-auto max-w-6xl px-5 pb-24">
          <div className="surface-arch rounded-[2.5rem] border border-border p-10 text-center shadow-soft md:p-16">
            <h2 className="text-3xl font-extrabold text-balance md:text-4xl">
              جاهز لإطلاق موقعك؟
            </h2>
            <p className="mx-auto mt-4 max-w-md text-muted-foreground">
              أخبرنا بفكرتك وسنعود إليك بخطة واضحة وسعر شفاف خلال ٢٤ ساعة.
            </p>
            <a
              href="mailto:hello@ofq.studio"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4 text-sm font-semibold text-primary-foreground shadow-lift transition-transform hover:-translate-y-0.5"
            >
              راسلنا الآن
              <ArrowLeft className="size-4" />
            </a>
            <div className="mt-10 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <Mail className="size-4" /> hello@ofq.studio
              </span>
              <span className="inline-flex items-center gap-2">
                <Phone className="size-4" /> ٩٦٣ ٩٠٠ ٠٠٠ ٠٠٠+
              </span>
              <span className="inline-flex items-center gap-2">
                <MapPin className="size-4" /> دمشق — عن بُعد
              </span>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-8 text-sm text-muted-foreground">
          <span className="font-display font-bold text-foreground">استوديو أفق</span>
          <span>© ٢٠٢٦ جميع الحقوق محفوظة</span>
        </div>
      </footer>
    </div>
  );
}

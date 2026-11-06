import PageHero from "../components/PageHero";
import CTA from "../components/CTA";
import { useLanguage } from "../context/LanguageContext";

const items = [
  {
    title: "1. جمع المعلومات",
    text: "نقوم بجمع المعلومات الضرورية لتقديم الخدمة، مثل بيانات التواصل، تفاصيل المشروع، ومعلومات الاتصال الأساسية عند إرسال نموذج الطلب أو التواصل المباشر مع الفريق.",
  },
  {
    title: "2. استخدام المعلومات",
    text: "يُستخدم البريد الإلكتروني ورقم الهاتف لتسليم الطلبات، متابعة المشاريع، وتقديم الدعم الفني المناسب. لا نستخدم بياناتك في أغراض غير مرتبطة بالخدمة التي نقدمها دون إذن صريح.",
  },
  {
    title: "3. الاحتفاظ بالبيانات",
    text: "نحتفظ بالبيانات فقط لفترة اللازمة لإدارة المشروع وتقديم الخدمة، أو وفق ما يطلبه القانون المعمول به في الدولة.",
  },
  {
    title: "4. مشاركة البيانات",
    text: "لا نبيع أو نؤجر بياناتك للغير. قد نشاركها مع أطراف موثوقة فقط عند الضرورة التشغيلية مثل خدمات الاستضافة أو الدفع أو دعم التقنية، مع الالتزام بالحفاظ على سرية المعلومات.",
  },
  {
    title: "5. حقوق المستخدم",
    text: "لك الحق في طلب الاطلاع على بياناتك أو تعديلها أو حذفها في أي وقت، عبر التواصل معنا مباشرة.",
  },
  {
    title: "6. ملفات الكوكيز",
    text: "قد نستخدم ملفات تعريف الارتباط لتحسين تجربة المستخدم وتحليل الأداء، مع الحفاظ على الخصوصية وفق أفضل الممارسات المتاحة.",
  },
];

export default function PrivacyPolicy() {
  const { lang } = useLanguage();
  return (
    <>
      <PageHero
        badge="سياسة الخصوصية"
        title="حماية بياناتك"
        highlight="أولوية"
        desc="نلتزم بحماية معلومات العملاء والعملاء المحتملين وفق أفضل الممارسات الرقمية واعتبارات الخصوصية.
"
        crumbs={[{ label: "الرئيسية", to: "/" }, { label: "سياسة الخصوصية" }]}
      />

      <section className="bg-white py-20 sm:py-24">
        <div dir={lang === "ar" ? "rtl" : "ltr"} className="container-x mb-8 max-w-4xl rounded-2xl border border-ink-100 p-6 text-sm leading-7">
          <h2 className="mb-3 font-bold">{lang === "ar" ? "التحليلات والتسويق الاختياري" : "Optional analytics and marketing"}</h2>
          <p>{lang === "ar" ? "عند تفعيل القياس، لا نحمّل Google Analytics عبر Google Tag Manager أو Meta Pixel إلا بعد موافقتك. الرفض لا يمنع استخدام الخدمات أو إرسال النماذج. يقيس Google الصفحات والإحالات والتفاعل ونجاح الطلبات، ويقيس Meta زيارات التسويق. لا نرسل أسماءك أو بريدك أو هاتفك أو محتوى النماذج ضمن أحداث التحليلات." : "When measurement is enabled, Google Analytics through Google Tag Manager and Meta Pixel load only after acceptance. Rejection does not prevent using services or submitting forms. Google measures pages, referrals, engagement and successful requests; Meta measures marketing visits. Our analytics events do not contain your name, email, phone number or form contents."}</p>
          <p className="mt-3">{lang === "ar" ? "نحفظ اختيارك على جهازك لمدة 180 يومًا. يمكنك فتح «اختيار الخصوصية» في أي صفحة ثم الرفض لسحب الموافقة. عند السحب نوقف الأحداث ونزيل ملفات القياس المعروفة التي يمكن للموقع الوصول إليها، وقد نعيد تحميل الصفحة لإيقاف الشيفرات المحملة. لا يؤدي السحب إلى حذف بيانات سبق إرسالها؛ تواصل معنا لطلبات البيانات. خدمات القياس قد تعالج معرفات الأجهزة وعناوين IP وفق سياساتها." : "Your choice is saved on this device for 180 days. Reopen Privacy choice on any page and reject to withdraw. Withdrawal stops events and removes known accessible measurement cookies; the page may reload to remove loaded tracking code. Withdrawal does not delete previously transmitted data; contact us for data requests. Measurement providers may process device identifiers and IP addresses under their policies."}</p>
          <p className="mt-3"><a href="https://policies.google.com/privacy" className="underline">Google privacy</a> · <a href="https://www.facebook.com/privacy/policy/" className="underline">Meta privacy</a></p>
        </div>
        <div className="container-x max-w-4xl">
          <div className="rounded-3xl border border-ink-100 bg-white p-7 sm:p-10">
            <p className="text-[15px] leading-8 text-ink-600">
              نرحب بك في awexen.com، ونسعى إلى حماية خصوصيتك في جميع التفاعلات مع موقعنا وخدماتنا. توضح هذه السياسة كيف نجمع المعلومات، وكيف نستخدمها، وما هي حقوقك تجاهها.
            </p>

            <div className="mt-8 space-y-6">
              {items.map((item) => (
                <div key={item.title} className="border-b border-ink-100 pb-6 last:border-b-0 last:pb-0">
                  <h2 className="text-[18px] font-extrabold text-ink-900">{item.title}</h2>
                  <p className="mt-2 text-[15px] leading-8 text-ink-600">{item.text}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-2xl bg-ink-50 p-5">
              <h3 className="text-[17px] font-extrabold text-ink-900">التواصل</h3>
              <p className="mt-2 text-[15px] leading-8 text-ink-600">
                إذا كان لديك سؤال أو طلب بخصوص سياسة الخصوصية، يمكنك التواصل معنا عبر البريد الإلكتروني: info@awexen.com أو عبر نموذج التواصل داخل الموقع.
              </p>
            </div>
          </div>
        </div>
      </section>

      <CTA />
    </>
  );
}

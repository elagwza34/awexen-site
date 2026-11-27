import { useStaticDocumentHandoff } from "../lib/removeStaticDocument";
import PageHero from "../components/PageHero";
import CTA from "../components/CTA";

import { termsClauses as clauses } from "../data/legalDocuments";

export default function TermsPage() {
  useStaticDocumentHandoff();
  return (
    <>
      <PageHero
        badge="الشروط والأحكام"
        title="مبادئ التعامل"
        highlight="المسؤول"
        desc="توضح هذه الصفحة القواعد العامة لاستخدام الموقع والخدمات الرقمية المقدمة من awexen.com."
        crumbs={[{ label: "الرئيسية", to: "/" }, { label: "الشروط والأحكام" }]}
      />

      <section className="bg-white py-20 sm:py-24">
        <div className="container-x max-w-4xl">
          <div className="rounded-3xl border border-ink-100 bg-white p-7 sm:p-10">
            <p className="text-[15px] leading-8 text-ink-600">
              يشكل استخدامك للموقع وقراءة هذه الشروط موافقة منك على الالتزام بها بالكامل. إذا كنت لا توافق على أي جزء من الشروط، نرجو عدم الاستمرار في استخدام الموقع.
            </p>

            <div className="mt-8 space-y-6">
              {clauses.map((clause) => (
                <div key={clause.title} className="border-b border-ink-100 pb-6 last:border-b-0 last:pb-0">
                  <h2 className="text-[18px] font-extrabold text-ink-900">{clause.title}</h2>
                  <p className="mt-2 text-[15px] leading-8 text-ink-600">{clause.text}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-2xl bg-ink-50 p-5">
              <h3 className="text-[17px] font-extrabold text-ink-900">التواصل</h3>
              <p className="mt-2 text-[15px] leading-8 text-ink-600">
                لأي استفسارات أو طلبات تتعلق بالشروط، يمكنك التواصل معنا عبر البريد الإلكتروني: info@awexen.com.
              </p>
            </div>
          </div>
        </div>
      </section>

      <CTA />
    </>
  );
}

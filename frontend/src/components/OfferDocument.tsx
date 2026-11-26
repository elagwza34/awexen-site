import { useState } from "react";
import { latinDigits, offerTable, type OfferDraft, type OfferTranslation } from "../lib/offers";
import OfferCalculator from "./OfferCalculator";
import "./offer-document.css";

type OfferContent = Pick<OfferDraft, "title" | "client_name" | "language" | "summary" | "sections" | "pricing">;

export default function OfferDocument({ offer, translation, printable = false }: {
  offer: OfferContent;
  translation?: OfferTranslation | null;
  printable?: boolean;
}) {
  const [requestedLanguage, setRequestedLanguage] = useState<OfferContent["language"]>();
  const language = translation ? requestedLanguage ?? offer.language : offer.language;
  const arabic = language === "ar";
  const localized = language !== offer.language ? translation : null;
  const content = localized ?? offer;
  return (
    <div className="offer-document" lang={language} dir={arabic ? "rtl" : "ltr"}>
      {(translation || printable) && (
        <div className="offer-toolbar">
          {translation && (
            <div className="offer-languages" role="group" aria-label={arabic ? "لغة العرض" : "Offer language"}>
              <button type="button" lang="ar" aria-pressed={arabic} onClick={() => setRequestedLanguage("ar")}>العربية</button>
              <button type="button" lang="en" aria-pressed={!arabic} onClick={() => setRequestedLanguage("en")}>English</button>
            </div>
          )}
          {printable && (
            <button type="button" className="offer-print" onClick={() => window.print()}>
              {arabic ? "طباعة العرض / حفظ PDF" : "Print offer / Save PDF"}
            </button>
          )}
        </div>
      )}
      <article className="offer-paper">
        <header className="offer-cover">
          <img className="offer-logo" src="/images/awexen-light.webp" alt="AWEXEN" width="520" height="135" />
          <p className="offer-kicker">{arabic ? "العرض الفني والمالي" : "Technical & commercial proposal"}</p>
          <h1>{latinDigits(content.title)}</h1>
          <p className="offer-client"><bdi>{latinDigits(offer.client_name)}</bdi></p>
          {content.summary && <p className="offer-body">{latinDigits(content.summary)}</p>}
        </header>
        {offer.pricing && <OfferCalculator pricing={offer.pricing} arabic={arabic} translation={localized} />}
        {content.sections.filter((section) => section.heading || section.body || section.table).map((section, index) => {
          const [head, ...rows] = offerTable(latinDigits(section.table));
          return (
            <section className="offer-section" key={index}>
              {section.heading && <h2>{latinDigits(section.heading)}</h2>}
              {section.body && <p className="offer-body">{latinDigits(section.body)}</p>}
              {head && (
                <div className="offer-table">
                  <table aria-label={section.heading || (arabic ? "تفاصيل العرض" : "Offer details")}>
                    <thead><tr>{head.map((cell, column) => <th scope="col" key={column}>{cell}</th>)}</tr></thead>
                    <tbody>{rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>{head.map((_, column) => <td key={column}>{row[column]}</td>)}</tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </section>
          );
        })}
      </article>
    </div>
  );
}

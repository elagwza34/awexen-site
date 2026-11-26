import { offerTable, type OfferDraft } from "../lib/offers";
import OfferCalculator from "./OfferCalculator";
import "./offer-document.css";

type OfferContent = Pick<OfferDraft, "title" | "client_name" | "language" | "summary" | "sections" | "pricing">;

export default function OfferDocument({ offer, printable = false }: { offer: OfferContent; printable?: boolean }) {
  const arabic = offer.language === "ar";
  return (
    <div className="offer-document" lang={offer.language} dir={arabic ? "rtl" : "ltr"}>
      {printable && (
        <button type="button" className="offer-print" onClick={() => window.print()}>
          {arabic ? "طباعة العرض / حفظ PDF" : "Print offer / Save PDF"}
        </button>
      )}
      <article className="offer-paper">
        <header className="offer-cover">
          <div className="offer-brand" dir="ltr">AWEXEN<span>.</span></div>
          <p className="offer-kicker">{arabic ? "العرض الفني والمالي" : "Technical & commercial proposal"}</p>
          <h1>{offer.title}</h1>
          <p className="offer-client" dir="auto">{offer.client_name}</p>
          {offer.summary && <p className="offer-body">{offer.summary}</p>}
        </header>
        {offer.pricing && <OfferCalculator pricing={offer.pricing} arabic={arabic} />}
        {offer.sections.filter((section) => section.heading || section.body || section.table).map((section, index) => {
          const [head, ...rows] = offerTable(section.table);
          return (
            <section className="offer-section" key={index}>
              {section.heading && <h2>{section.heading}</h2>}
              {section.body && <p className="offer-body">{section.body}</p>}
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

import { privacyClauses, termsClauses } from "./src/data/legalDocuments";
import { legalMetadata } from "./src/data/legalMetadata";

const escape = (value: string) => value.replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[char] ?? char);

const documents = {
  "/terms": { heading: "الشروط والأحكام", clauses: termsClauses },
  "/privacy": { heading: "سياسة الخصوصية", clauses: privacyClauses },
} as const;

export function prerenderLegalDocuments(template: string) {
  return (Object.keys(documents) as (keyof typeof documents)[]).map((route) => {
    const { heading, clauses } = documents[route];
    const { title, description } = legalMetadata[route];
    const canonical = `https://awexen.com${route}`;
    const content = `<main id="awexen-static-document" style="background:#fff;color:#202328;min-height:100vh;padding:3rem 1rem">
      <article style="max-width:48rem;margin:auto;line-height:1.8">
        <a href="/">AWEXEN</a><h1>${escape(heading)}</h1>
        ${clauses.map((entry) => `<section><h2>${escape(entry.title)}</h2><p>${escape(entry.text)}</p></section>`).join("\n")}
      </article>
    </main>`;
    const style = `<style>body:has(#awexen-static-document) #root,
      body:has(#awexen-static-document) #awexen-boot:not(.is-error):not(.is-outdated){display:none}</style>`;
    const html = template
      .replace(/<title>[^<]*<\/title>/, `<title>${escape(title)}</title>`)
      .replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/, `<meta name="description" content="${escape(description)}">`)
      .replace(/<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${canonical}">`)
      .replace(/<meta property="og:url" content="[^"]*"\s*\/?>/, `<meta property="og:url" content="${canonical}">`)
      .replace(/<meta (property="og:title"|name="twitter:title") content="[^"]*"\s*\/?>/g, `<meta $1 content="${escape(title)}">`)
      .replace(/<meta\s+(property="og:description"|name="twitter:description")\s+content="[^"]*"\s*\/?>/g, `<meta $1 content="${escape(description)}">`)
      .replace("</head>", `${style}\n    <meta property="og:locale" content="ar_EG">\n  </head>`)
      .replace('<div id="root"></div>', `<div id="root"></div>\n    ${content}`)
      .replace(/<noscript>[\s\S]*?<\/noscript>/, "");
    if (!html.includes('id="awexen-static-document"') || !html.includes(`rel="canonical" href="${canonical}"`)) {
      throw new Error(`Static document template is incompatible with ${route}.`);
    }
    return { fileName: `${route.slice(1)}/index.html`, html };
  });
}

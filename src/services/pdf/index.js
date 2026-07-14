import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { cleanText, detectIssuer, detectLast4, groupRows, parseRows } from "./parsers/genericParser";
import { getParser } from "./parsers";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export async function parseStatementLocally(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
  const allRows = [];
  let fullText = "";

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const items = content.items
      .filter(item => cleanText(item.str))
      .map(item => ({ text: cleanText(item.str), x: item.transform[4], y: item.transform[5], width: item.width }));
    allRows.push(...groupRows(items));
    fullText += `\n${items.map(i => i.text).join(" ")}`;
  }

  if (cleanText(fullText).length < 30) {
    throw new Error("The PDF does not contain selectable text. It may be a scanned image and requires OCR.");
  }

  const issuer = detectIssuer(fullText, file.name);
  const last4 = detectLast4(fullText);
  const card = issuer === "LEUMI" ? "LEUMI" : `${issuer}${last4 ? `-${last4}` : ""}`;

  const dedicatedParser = getParser(issuer);
  let transactions = dedicatedParser ? dedicatedParser(allRows, card) : [];
  if (!transactions.length) transactions = parseRows(allRows, card);

  if (!transactions.length) {
    throw new Error(`No transactions were detected. Document type: ${issuer}. A dedicated parser may be required.`);
  }

  return {
    transactions,
    metadata: {
      issuer,
      card,
      pages: pdf.numPages,
      extraction: "local",
      filename: file.name,
    },
  };
}

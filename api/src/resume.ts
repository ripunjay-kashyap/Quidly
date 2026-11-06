import { extractText, getDocumentProxy } from "unpdf";

export const MAX_RESUME_BYTES = 4 * 1024 * 1024;
const MAX_PAGES = 10;
export const MAX_RESUME_CHARS = 20000;
const MIN_RESUME_CHARS = 50;

export class ResumeError extends Error {}

export async function extractResumeText(pdf: Buffer): Promise<string> {
  if (pdf.subarray(0, 5).toString("latin1") !== "%PDF-") throw new ResumeError("Upload your resume as a PDF.");

  let text: string;
  try {
    const document = await getDocumentProxy(new Uint8Array(pdf));
    if (document.numPages > MAX_PAGES) throw new ResumeError(`Upload a resume of ${MAX_PAGES} pages or fewer.`);
    ({ text } = await extractText(document, { mergePages: true }));
  } catch (error) {
    if (error instanceof ResumeError) throw error;
    throw new ResumeError("This PDF couldn't be read. Try exporting it again.");
  }

  const cleaned = text
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
  // A scanned resume is an image, so it has no text to read.
  if (cleaned.length < MIN_RESUME_CHARS) {
    throw new ResumeError("No text was found in this PDF. If it's a scan, paste your resume instead.");
  }
  return cleaned.slice(0, MAX_RESUME_CHARS);
}

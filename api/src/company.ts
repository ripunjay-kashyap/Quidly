import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import { readsAsSentences } from "./feedback.ts";

export const INDUSTRIES = [
  "Software",
  "Fintech",
  "Healthcare",
  "E-commerce",
  "Education",
  "Media",
  "Logistics",
  "Energy",
  "Consulting",
  "Other",
];
export const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-1000", "1000+"];
const MIN_DESCRIPTION_LENGTH = 80;
// Short company copy uses fewer joining words than feedback, but a keyword list has none.
const MIN_DESCRIPTION_FUNCTION_WORDS = 2;
const WEBSITE_TIMEOUT_MS = 5000;

export type CompanyInput = {
  name: string;
  website?: string;
  industry: string;
  size: string;
  description: string;
};

// The automatic approval check: details a company must get right before posting roles.
export function companyProblems(input: CompanyInput): string[] {
  const problems: string[] = [];
  if (input.name.trim().length < 2) problems.push("Enter the company's name.");
  if (!INDUSTRIES.includes(input.industry)) problems.push("Pick an industry.");
  if (!COMPANY_SIZES.includes(input.size)) problems.push("Pick a company size.");
  const description = input.description.trim();
  if (description.length < MIN_DESCRIPTION_LENGTH || !readsAsSentences(description, MIN_DESCRIPTION_FUNCTION_WORDS)) {
    problems.push(`Describe the company in full sentences (at least ${MIN_DESCRIPTION_LENGTH} characters).`);
  }
  if (input.website && !normalizeWebsite(input.website)) {
    problems.push("Enter the website as a full address, such as https://example.com.");
  }
  return problems;
}

export function normalizeWebsite(website: string): string | undefined {
  try {
    const url = new URL(website.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    return url.origin;
  } catch {
    return undefined;
  }
}

const privateRanges = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.168.0.0", 16],
] as const) {
  privateRanges.addSubnet(network, prefix, "ipv4");
}
for (const [network, prefix] of [
  ["::1", 128],
  ["fc00::", 7],
  ["fe80::", 10],
] as const) {
  privateRanges.addSubnet(network, prefix, "ipv6");
}

// The server fetches a user-supplied address, so it refuses private networks
// and doesn't follow redirects, which could lead somewhere private.
export async function websiteIsReachable(origin: string): Promise<boolean> {
  try {
    const { hostname } = new URL(origin);
    const addresses = await lookup(hostname.replace(/^\[|\]$/g, ""), { all: true });
    const blocked = addresses.some(({ address, family }) =>
      privateRanges.check(address, family === 6 || isIP(address) === 6 ? "ipv6" : "ipv4"),
    );
    if (addresses.length === 0 || blocked) return false;

    const response = await fetch(origin, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(WEBSITE_TIMEOUT_MS),
    });
    await response.body?.cancel();
    return response.status < 400;
  } catch {
    return false;
  }
}

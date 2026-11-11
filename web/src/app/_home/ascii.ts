// Digits and colon from FIGlet's "standard" font. Every digit is padded to the same width,
// so a ticking clock never shifts sideways.
const glyphs: Record<string, string[]> = {
  "0": [String.raw`  ___   `, String.raw` / _ \  `, String.raw`| | | | `, String.raw`| |_| | `, String.raw` \___/  `],
  "1": [String.raw`   _    `, String.raw`  / |   `, String.raw`  | |   `, String.raw`  | |   `, String.raw`  |_|   `],
  "2": [String.raw` ____   `, String.raw`|___ \  `, String.raw`  __) | `, String.raw` / __/  `, String.raw`|_____| `],
  "3": [String.raw` _____  `, String.raw`|___ /  `, String.raw`  |_ \  `, String.raw` ___) | `, String.raw`|____/  `],
  "4": [String.raw` _  _   `, String.raw`| || |  `, String.raw`| || |_ `, String.raw`|__   _|`, String.raw`   |_|  `],
  "5": [String.raw` ____   `, String.raw`| ___|  `, String.raw`|___ \  `, String.raw` ___) | `, String.raw`|____/  `],
  "6": [String.raw`  __    `, String.raw` / /_   `, String.raw`| '_ \  `, String.raw`| (_) | `, String.raw` \___/  `],
  "7": [String.raw` _____  `, String.raw`|___  | `, String.raw`   / /  `, String.raw`  / /   `, String.raw` /_/    `],
  "8": [String.raw`  ___   `, String.raw` ( _ )  `, String.raw` / _ \  `, String.raw`| (_) | `, String.raw` \___/  `],
  "9": [String.raw`  ___   `, String.raw` / _ \  `, String.raw`| (_) | `, String.raw` \__, | `, String.raw`   /_/  `],
  ":": ["     ", "  _  ", " (_) ", "  _  ", " (_) "],
};

// "71:59:42" as five lines of ASCII art, with a unit under each pair of digits.
export function bigClock(clock: string): string {
  const rows = [0, 1, 2, 3, 4].map((row) => [...clock].map((character) => glyphs[character][row]).join(""));
  return [...rows, "", line(at(8, "hours"), at(29, "min"), at(50, "sec"))].join("\n");
}

type Part = [column: number, text: string];

// Text centred on a column.
function at(column: number, text: string): Part {
  return [column - Math.floor(text.length / 2), text];
}

function line(...parts: Part[]): string {
  return parts.reduce((row, [column, text]) => row.padEnd(column) + text, "");
}

function box(center: number, lines: string[]): string[] {
  const width = Math.max(...lines.map((text) => text.length)) + 4;
  const left = center - Math.floor(width / 2) - 1;
  const edge = line([left, `+${"-".repeat(width)}+`]);
  return [edge, ...lines.map((text) => line([left, `|  ${text.padEnd(width - 2)}|`])), edge];
}

const L = 10;
const M = 32;
const R = 55;
const join3 = line([L, `+${"-".repeat(M - L - 1)}+${"-".repeat(R - M - 1)}+`]);
const stems3 = (mark: string) => line([L, mark], [M, mark], [R, mark]);

// What happens to an application, drawn from the candidate's side.
export const seekerFlow = [
  line(at(M, "you apply for free  (PayPal holds $2)")),
  line([M, "|"]),
  line([M, "v"]),
  ...box(M, ["the 72-hour clock starts"]),
  line([M, "|"]),
  join3,
  stems3("|"),
  stems3("v"),
  line(at(L, "feedback with"), at(M, "an interview"), at(R, "no reply in")),
  line(at(L, "a clear reason"), at(M, "invite"), at(R, "72 hours")),
  stems3("|"),
  stems3("v"),
  line(at(L, "[  answered  ]"), at(M, "[  answered  ]"), at(R, "[ $5 to you ]")),
  stems3("|"),
  join3,
  line([M, "|"]),
  line([M, "v"]),
  line(at(M, "the $2 hold ends")),
].join("\n");

const L2 = 19;
const R2 = 45;

// The same rules, from the company's side.
export const companyFlow = [
  line(at(M, "you post a role")),
  line(at(M, "$49 + a $5 deposit for each person who can apply")),
  line([M, "|"]),
  line([M, "v"]),
  ...box(M, ["each applicant starts", "a 72-hour clock"]),
  line([M, "|"]),
  line([L2, `+${"-".repeat(M - L2 - 1)}+${"-".repeat(R2 - M - 1)}+`]),
  line([L2, "|"], [R2, "|"]),
  line([L2, "v"], [R2, "v"]),
  line(at(L2, "you reply in time"), at(R2, "you miss the")),
  line(at(L2, "with feedback or an"), at(R2, "72 hours")),
  line(at(L2, "interview invite")),
  line([L2, "|"], [R2, "|"]),
  line([L2, "v"], [R2, "v"]),
  line(at(L2, "[ $5 back to you ]"), at(R2, "[ $5 to the applicant ]")),
  line(at(L2, "when the role closes")),
].join("\n");

const RECEIPT_WIDTH = 26;
const rule = "-".repeat(RECEIPT_WIDTH);
const row = (label: string, value: string) => label + value.padStart(RECEIPT_WIDTH - label.length);

// The receipt a candidate gets when a company doesn't reply in time.
export function receipt(input: {
  company: string;
  role: string;
  applied: string;
  due: string;
  payment?: { status: string; batchId: string | null };
}): string {
  const fit = (text: string) => (text.length > RECEIPT_WIDTH ? `${text.slice(0, RECEIPT_WIDTH - 1)}…` : text);
  return [
    line(at(RECEIPT_WIDTH / 2, "QUIDLY  PAYOUT")),
    rule,
    fit(input.company),
    fit(input.role),
    "",
    row("applied", input.applied),
    row("reply due", input.due),
    row("company replied", "no"),
    rule,
    row("PAID TO YOU", "$5.00"),
    "via PayPal",
    ...(input.payment ? [row("status", input.payment.status)] : []),
    ...(input.payment?.batchId ? [row("payout id", input.payment.batchId.slice(0, 16))] : []),
    rule,
    line(at(RECEIPT_WIDTH / 2, "thanks for applying")),
  ].join("\n");
}

export const payoutReceipt = receipt({
  company: "Kestrel Mutual",
  role: "Claims Analyst",
  applied: "11/03 09:41",
  due: "11/06 09:41",
});

// A static "72:00:00" for the closing section.
export const fullClock = bigClock("72:00:00").split("\n").slice(0, 5).join("\n");

// Tests whether Elastic can separate generic rejections from specific ones.
// Run with: npm run spike:elastic [inference-endpoint-id]
import { Client } from "@elastic/elasticsearch";

const inferenceId = process.argv[2] ?? ".multilingual-e5-small-elasticsearch";
const indexName = `quidly-spike-templates${inferenceId.replaceAll(".", "-")}`;

const client = new Client({
  node: process.env.ELASTIC_URL!,
  auth: { apiKey: process.env.ELASTIC_API_KEY! },
});

const TEMPLATES = [
  "Sorry, we went with someone else.",
  "We have decided to move forward with other candidates.",
  "After careful consideration, we have decided not to proceed with your application.",
  "Unfortunately, we will not be moving forward with your application at this time.",
  "We received many qualified applicants and have selected another candidate.",
  "Thank you for your interest, but the position has been filled.",
  "We are pursuing candidates whose experience more closely matches our needs.",
  "You were not selected for this role. We wish you the best in your job search.",
  "Your background is impressive, but it is not the right fit at this time.",
  "We will keep your resume on file for future opportunities.",
  "The competition for this role was strong and we chose another applicant.",
  "We regret to inform you that you have not been successful on this occasion.",
  "No thanks.",
  "Not a fit.",
  "We have decided to go in a different direction.",
];

const RESUME =
  "Backend engineer with six years of experience. Built payment APIs in Go and Postgres at a fintech startup. Led a migration from a monolith to services. Some AWS Lambda experience. No professional Kubernetes experience listed.";
const REQUIREMENTS =
  "Senior Backend Engineer. Requirements: 5+ years of backend development, Go, PostgreSQL, running production Kubernetes clusters, on-call experience.";

const CASES: Array<{ expected: "BLOCK" | "PASS"; text: string }> = [
  { expected: "BLOCK", text: "Sorry, we went with someone else." },
  { expected: "BLOCK", text: "No thanks." },
  { expected: "BLOCK", text: "We've chosen to proceed with another applicant for this position." },
  { expected: "BLOCK", text: "Thanks for applying, but we won't be moving ahead with you right now. Best of luck!" },
  { expected: "BLOCK", text: "Unfortunately your profile does not match what we are looking for." },
  { expected: "BLOCK", text: "We were impressed by your skills and experience, but we picked a stronger candidate." },
  { expected: "BLOCK", text: "Sorry, we went with someone else. Go, Postgres, Kubernetes, payment APIs." },
  { expected: "BLOCK", text: "Go Postgres Kubernetes AWS Lambda on-call backend engineer fintech migration." },
  { expected: "BLOCK", text: "We need strong Go experience, and your resume shows you have never worked with Go or Postgres." },
  { expected: "BLOCK", text: "We need a mobile developer with Swift and iOS design experience, which your resume does not show." },
  {
    expected: "PASS",
    text: "This role requires running production Kubernetes clusters. Your Go and Postgres work at the fintech startup is strong, but your resume shows no Kubernetes experience.",
  },
  {
    expected: "PASS",
    text: "We need someone with on-call experience for production systems. Your monolith migration was impressive, but nothing in your background shows on-call ownership.",
  },
  {
    expected: "PASS",
    text: "Your payment API experience in Go fits well, but we need hands-on Kubernetes operations, and your cloud work appears limited to AWS Lambda.",
  },
];

if (!(await client.indices.exists({ index: indexName }))) {
  await client.indices.create({
    index: indexName,
    mappings: {
      properties: { text: { type: "semantic_text", inference_id: inferenceId } },
    },
  });
}

console.log(`Model: ${inferenceId}. Indexing ${TEMPLATES.length} templates...`);
const bulk = await client.bulk({
  refresh: true,
  timeout: "5m",
  operations: TEMPLATES.flatMap((text, id) => [{ index: { _index: indexName, _id: String(id) } }, { text }]),
});
if (bulk.errors) {
  const failed = bulk.items.find((item) => item.index?.error);
  throw new Error(`Bulk indexing failed: ${JSON.stringify(failed?.index?.error)}`);
}

const embed = async (input: string): Promise<number[]> => {
  const response: any = await client.inference.inference({ inference_id: inferenceId, input });
  return response.text_embedding[0].embedding;
};

const cosine = (a: number[], b: number[]): number => {
  const dot = a.reduce((sum, value, index) => sum + value * b[index], 0);
  const size = (vector: number[]) => Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  return dot / (size(a) * size(b));
};

const context = await embed(`${RESUME}\n${REQUIREMENTS}`);

console.log("\nexpected | template | fit  | closest template | text");
for (const { expected, text } of CASES) {
  const result = await client.search<{ text: string }>({
    index: indexName,
    size: 1,
    query: { semantic: { field: "text", query: text } },
    _source: ["text"],
  });
  const top = result.hits.hits[0];
  const fit = cosine(await embed(text), context);
  console.log(
    `${expected.padEnd(8)} | ${(top._score ?? 0).toFixed(3).padEnd(8)} | ${fit.toFixed(2)} | ${top._source?.text.slice(0, 32).padEnd(32)} | ${text.slice(0, 60)}`,
  );
}

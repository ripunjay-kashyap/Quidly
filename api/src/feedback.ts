import { Client } from "@elastic/elasticsearch";

const INFERENCE_ID = ".openai-text-embedding-3-small";
const TEMPLATE_INDEX = "quidly-rejection-templates";
// Starting thresholds from the Elastic test set in docs/roughplan.md.
const TEMPLATE_BLOCK_SCORE = 0.73;
const FIT_PASS_SCORE = 0.4;
const MIN_WORDS = 12;
const MIN_FUNCTION_WORDS = 4;

const FUNCTION_WORDS = new Set(
  "a an the and but or so because for of to in on at into with from by as is are was were be been has have had do does did not no can will would could should your you we our us they their them he she his her i my this that these those it its which who what when where how there than then also each every all any some".split(
    " ",
  ),
);

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

export type FeedbackVerdict =
  | { passed: true; qualityScore: number }
  | { passed: false; reason: string };

export interface FeedbackChecker {
  check(input: { feedback: string; resumeText: string; requirementsText: string }): Promise<FeedbackVerdict>;
}

// Keyword lists have almost no small joining words, while written sentences do.
export function readsAsSentences(text: string, minFunctionWords = MIN_FUNCTION_WORDS): boolean {
  const words = text.toLowerCase().match(/[a-z']+/g) ?? [];
  const functionWords = words.filter((word) => FUNCTION_WORDS.has(word)).length;
  return words.length >= MIN_WORDS && functionWords >= minFunctionWords;
}

function cosine(a: number[], b: number[]): number {
  const dot = a.reduce((sum, value, index) => sum + value * b[index], 0);
  const size = (vector: number[]) => Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  return dot / (size(a) * size(b));
}

export function createElasticFeedbackChecker(config: { url: string; apiKey: string }): FeedbackChecker {
  const client = new Client({ node: config.url, auth: { apiKey: config.apiKey } });
  let templatesReady: Promise<void> | undefined;

  async function indexTemplates(): Promise<void> {
    if (await client.indices.exists({ index: TEMPLATE_INDEX })) return;
    await client.indices.create({
      index: TEMPLATE_INDEX,
      mappings: { properties: { text: { type: "semantic_text", inference_id: INFERENCE_ID } } },
    });
    const bulk = await client.bulk({
      refresh: true,
      timeout: "5m",
      operations: TEMPLATES.flatMap((text, id) => [
        { index: { _index: TEMPLATE_INDEX, _id: String(id) } },
        { text },
      ]),
    });
    if (bulk.errors) throw new Error("Indexing the rejection templates failed");
  }

  // Indexed on first use, so an Elastic outage can't stop the backend starting.
  function ensureTemplates(): Promise<void> {
    templatesReady ??= indexTemplates().catch((error) => {
      templatesReady = undefined;
      throw error;
    });
    return templatesReady;
  }

  async function embed(input: string): Promise<number[]> {
    const response: any = await client.inference.inference({ inference_id: INFERENCE_ID, input });
    return response.text_embedding[0].embedding;
  }

  return {
    async check({ feedback, resumeText, requirementsText }) {
      await ensureTemplates();
      const closest = await client.search({
        index: TEMPLATE_INDEX,
        size: 1,
        query: { semantic: { field: "text", query: feedback } },
      });
      if ((closest.hits.hits[0]?._score ?? 0) >= TEMPLATE_BLOCK_SCORE) {
        return {
          passed: false,
          reason: "This reads like a generic rejection. Explain which requirement the resume doesn't meet.",
        };
      }

      if (!readsAsSentences(feedback)) {
        return { passed: false, reason: "Write the feedback as full sentences, not a list of keywords." };
      }

      const [feedbackVector, contextVector] = await Promise.all([
        embed(feedback),
        embed(`${resumeText}\n${requirementsText}`),
      ]);
      const fit = cosine(feedbackVector, contextVector);
      if (fit < FIT_PASS_SCORE) {
        return {
          passed: false,
          reason: "This doesn't seem to be about this candidate's resume and the role's requirements.",
        };
      }
      return { passed: true, qualityScore: fit };
    },
  };
}

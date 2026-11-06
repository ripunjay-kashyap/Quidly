import Form from "next/form";
import Link from "next/link";
import { AuthButton } from "@/lib/auth-dialog";
import { Icon } from "@/lib/icons";
import { fullClock } from "./_home/ascii";
import { FeaturedJobs } from "./_home/featured-jobs";
import { HeroVisual } from "./_home/hero-visual";
import { HowItWorks } from "./_home/how-it-works";
import { LoginReturn } from "./_home/login-return";
import { PriceCalculator } from "./_home/price-calculator";

const promises = [
  { value: "72 hours", text: "for the company to reply to you" },
  { value: "$5", text: "paid to you if it doesn't reply in time" },
  { value: "1 clear reason", text: "in every rejection, so you know what to work on" },
];

const companyPoints = [
  {
    title: "Serious applicants",
    text: "Each person can have only 5 applications waiting at a time, so they choose with care.",
  },
  { title: "Quick replies", text: "Pick the requirement a person is missing, write a few sentences and send." },
  { title: "A Verified badge", text: "We check your company website, then show a badge on your roles." },
  { title: "Everything in one place", text: "See each applicant, their resume and the time left to reply." },
];

const faqs = [
  {
    question: "Do I pay to apply?",
    answer:
      "No. When you apply, PayPal puts a $2 hold on your account. A hold works like a hotel deposit: the money stays in your account, but it is set aside for a while. Quidly never takes it. The hold ends when you get your answer or your $5.",
  },
  {
    question: "What counts as an answer?",
    answer:
      "Feedback that names a requirement from the job listing, or an interview invite that you confirm is real. A vague message like “we went another way” can't be sent, because AI checks every message first.",
  },
  {
    question: "How do I get my $5?",
    answer:
      "You don't need to do anything. If 72 hours pass without an answer, Quidly sends $5 to the PayPal account you log in with. You can see the payment in your dashboard.",
  },
  {
    question: "Why can I only have 5 applications at a time?",
    answer:
      "It keeps applications focused and gives companies time to read each one. Each application uses one of your 5 slots, and the slot opens again when that application gets its answer.",
  },
  {
    question: "What do companies pay?",
    answer:
      "$49 to post a role, plus a $5 deposit for each person who can apply. When the role closes, the company gets back the deposit for every applicant it answered in time.",
  },
  {
    question: "Are these real jobs?",
    answer:
      "Listings marked “Sample listing” are examples, so you can try Quidly from start to finish. PayPal is in test mode, so no real money moves.",
  },
];

const dots = (label: string) => `${label} ${".".repeat(30 - label.length)}`;
const aiCheck = [
  "AI CHECK BEFORE SENDING",
  `${dots("written in full sentences")} ok`,
  `${dots("not a copy-paste template")} ok`,
  `${dots("about this person's resume")} ok`,
  "-> sent to the applicant",
].join("\n");

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <LoginReturn />

      <section className="bg-hero overflow-hidden">
        <div className="container-page grid items-center gap-14 pt-14 pb-20 md:pt-20 lg:grid-cols-[1.08fr_1fr] lg:gap-12 lg:pb-24">
          <div className="rise flex flex-col items-start">
            <h1 className="h-display">
              Every application gets <span className="text-accent">an answer</span>.
            </h1>
            <p className="lead mt-6 max-w-xl">
              Quidly is a job board where companies must answer every applicant within 72 hours, with feedback or an
              interview invite. If a company misses the deadline, it pays you $5.
            </p>
            <Form
              action="/jobs"
              className="mt-8 flex w-full max-w-xl flex-col gap-2 rounded-2xl border border-border bg-white p-2 shadow-raised transition-shadow focus-within:border-accent focus-within:shadow-[0_0_0_4px_var(--ring)] sm:flex-row"
            >
              <label className="flex flex-1 items-center gap-3 px-3">
                <Icon name="search" size={18} className="shrink-0 text-muted" />
                <span className="sr-only">Search jobs</span>
                <input
                  name="q"
                  placeholder="Job title, skill or company"
                  className="h-11 w-full bg-transparent text-base outline-none placeholder:text-[#8c95ab]"
                />
              </label>
              <button className="btn btn-primary btn-lg" type="submit">
                Search jobs
              </button>
            </Form>
          </div>
          <HeroVisual />
        </div>
      </section>

      <section className="border-y border-border bg-white">
        <div className="container-page grid divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {promises.map((promise) => (
            <div key={promise.value} className="py-8 sm:px-8 sm:first:pl-0">
              <p className="font-mono text-2xl font-medium tracking-tight">{promise.value}</p>
              <p className="mt-1.5 leading-relaxed text-muted">{promise.text}</p>
            </div>
          ))}
        </div>
      </section>

      <HowItWorks />

      <section className="bg-band py-20 text-white md:py-28">
        <div className="container-page grid items-center gap-14 lg:grid-cols-2">
          <ReplyPreview />
          <div>
            <h2 className="h-section">Every &ldquo;no&rdquo; comes with a reason.</h2>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-white/85">
              To turn you down, a company must name the requirement you&apos;re missing and explain it in a few
              sentences.
            </p>
            <p className="mt-4 max-w-lg text-lg leading-relaxed text-white/85">
              AI checks every message before it&apos;s sent. It blocks vague answers and copy-paste templates, so you
              always learn what to work on next.
            </p>
            <Link className="btn btn-dark btn-lg mt-9" href="/jobs">
              Browse jobs
              <Icon name="arrow-right" />
            </Link>
          </div>
        </div>
      </section>

      <FeaturedJobs />

      <section id="pricing" className="py-20 md:py-28">
        <div className="container-page grid items-center gap-14 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <h2 className="h-section">$49 to post a role. Nothing more if you reply on time.</h2>
            <p className="lead mt-5 max-w-xl">
              You also pay a $5 deposit for each person who can apply. You get it back for everyone you answer in
              time. If you miss someone, their $5 goes to them.
            </p>
            <dl className="mt-10 grid gap-x-10 gap-y-7 sm:grid-cols-2">
              {companyPoints.map((point) => (
                <div key={point.title} className="border-t border-border pt-4">
                  <dt className="font-semibold">{point.title}</dt>
                  <dd className="mt-1 leading-relaxed text-muted">{point.text}</dd>
                </div>
              ))}
            </dl>
          </div>
          <PriceCalculator />
        </div>
      </section>

      <section id="faq" className="border-t border-border bg-surface-2 py-20 md:py-28">
        <div className="container-page grid gap-12 lg:grid-cols-[1fr_1.6fr]">
          <div>
            <h2 className="h-section">Common questions</h2>
            <p className="lead mt-4">About the $2 hold, the 72-hour deadline and the $5.</p>
          </div>
          <div className="card px-6 sm:px-8">
            {faqs.map((faq, index) => (
              <details key={faq.question} className={`faq ${index > 0 ? "border-t border-border" : ""}`}>
                <summary>{faq.question}</summary>
                <p className="pb-6 leading-relaxed text-muted">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-24">
        <div className="container-page">
          <div className="grid items-center gap-10 rounded-3xl bg-navy px-6 py-14 text-white sm:px-12 md:py-16 lg:grid-cols-[1fr_auto]">
            <div>
              <h2 className="h-section">Apply today. Hear back within 72 hours.</h2>
              <p className="mt-4 max-w-md text-lg text-white/75">
                If the company doesn&apos;t reply in time, it pays you $5.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link className="btn btn-white btn-lg" href="/jobs">
                  Find a job
                </Link>
                <AuthButton role="RECRUITER" className="btn btn-outline-white btn-lg">
                  Start hiring
                </AuthButton>
              </div>
            </div>
            <pre aria-hidden="true" className="ascii hidden text-[10px] text-white/35 sm:block xl:text-[12px]">
              {fullClock}
            </pre>
          </div>
        </div>
      </section>
    </main>
  );
}

// The company's reply screen, with the AI check that runs before feedback is sent.
function ReplyPreview() {
  return (
    <div
      role="img"
      aria-label="A company writing feedback that names a missing requirement and passes the AI check"
      className="rounded-2xl border border-white/30 bg-white/15 p-2 shadow-float"
    >
      <div className="overflow-hidden rounded-xl bg-white text-foreground">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
          <div>
            <p className="text-sm font-semibold">Applicant 4 · Data Engineer</p>
            <p className="text-xs text-muted">Corvane Logistics</p>
          </div>
          <span className="badge badge-warn badge-dot">5h 12m left</span>
        </div>
        <div className="p-5 sm:p-6">
          <p className="text-xs font-medium text-muted">Which requirement is missing?</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {["Python", "SQL", "Airflow or Dagster"].map((requirement) => (
              <span key={requirement} className="chip h-7 text-xs">
                {requirement}
              </span>
            ))}
            <span className="chip h-7 border-navy bg-navy text-xs text-white">streaming data (Kafka)</span>
          </div>
          <p className="mt-5 text-xs font-medium text-muted">Your feedback</p>
          <p className="mt-2 rounded-lg border border-border bg-surface-2 p-3 text-sm leading-relaxed">
            Your Python and SQL work is strong, and your Airflow pipelines match our stack. We need someone who has run
            Kafka in production, and your resume doesn&rsquo;t show that yet.
          </p>
          <pre className="ascii mt-4 overflow-x-auto rounded-lg bg-navy p-4 text-[10px] text-[#c9d3ff] sm:text-[11px]">
            {aiCheck}
          </pre>
        </div>
      </div>
    </div>
  );
}

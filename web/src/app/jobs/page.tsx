import type { Metadata } from "next";
import { JobSearch } from "./job-search";

export const metadata: Metadata = {
  title: "Find jobs",
  description: "Open roles where the company promises a reply within 72 hours, or pays you $5.",
};

export default function JobsPage() {
  return <JobSearch />;
}

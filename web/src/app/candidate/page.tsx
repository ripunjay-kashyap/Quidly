import type { Metadata } from "next";
import { CandidateDashboard } from "../candidate-view";

export const metadata: Metadata = { title: "My applications" };

export default function CandidatePage() {
  return <CandidateDashboard />;
}

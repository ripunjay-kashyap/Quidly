import type { Metadata } from "next";
import { CompanyDashboard } from "../recruiter-view";

export const metadata: Metadata = { title: "Company dashboard" };

export default function CompanyPage() {
  return <CompanyDashboard />;
}

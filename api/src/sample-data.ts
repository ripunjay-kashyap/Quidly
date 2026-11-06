// Made-up companies shown as "Sample listing" so the board looks like a working site.
// None of them are real companies.

type SampleRole = {
  title: string;
  description: string;
  requirementsText: string;
  location: string;
  employmentType: "Full-time" | "Part-time" | "Contract" | "Internship";
  salaryRange: string;
  applicantCap: number;
};

export type SampleCompany = {
  slug: string;
  name: string;
  industry: string;
  size: string;
  description: string;
  roles: SampleRole[];
};

export const SAMPLE_COMPANIES: SampleCompany[] = [
  {
    slug: "quillfern-health",
    name: "Quillfern Health",
    industry: "Healthcare",
    size: "51-200",
    description:
      "Quillfern Health builds scheduling and intake software for small clinics. Our tools help front desks spend less time on the phone and more time with patients.",
    roles: [
      {
        title: "Senior Backend Engineer",
        description: "Own the booking and billing services that thousands of clinics rely on every morning.",
        requirementsText:
          "5+ years of backend development, Go, PostgreSQL, running production Kubernetes clusters, on-call experience",
        location: "Remote (US)",
        employmentType: "Full-time",
        salaryRange: "$150k–$180k",
        applicantCap: 25,
      },
      {
        title: "Product Designer",
        description: "Design intake flows that work for patients of every age and every level of comfort with tech.",
        requirementsText: "4+ years of product design, Figma, accessibility (WCAG), user research, healthcare or forms-heavy products",
        location: "Boston, MA (hybrid)",
        employmentType: "Full-time",
        salaryRange: "$120k–$145k",
        applicantCap: 20,
      },
    ],
  },
  {
    slug: "corvane-logistics",
    name: "Corvane Logistics",
    industry: "Logistics",
    size: "201-1000",
    description:
      "Corvane Logistics plans routes for regional freight carriers. We turn messy delivery data into schedules that drivers can actually follow.",
    roles: [
      {
        title: "Data Engineer",
        description: "Build the pipelines that feed our route planner with live traffic, weather and order data.",
        requirementsText: "3+ years of data engineering, Python, SQL, Airflow or Dagster, streaming data (Kafka)",
        location: "Chicago, IL",
        employmentType: "Full-time",
        salaryRange: "$130k–$155k",
        applicantCap: 30,
      },
      {
        title: "Operations Analyst",
        description: "Work with carriers to find where routes break down and how to fix them.",
        requirementsText: "2+ years in operations or supply chain analysis, Excel or Google Sheets, SQL, clear written communication",
        location: "Chicago, IL",
        employmentType: "Full-time",
        salaryRange: "$75k–$90k",
        applicantCap: 40,
      },
    ],
  },
  {
    slug: "lumenvale-energy",
    name: "Lumenvale Energy",
    industry: "Energy",
    size: "51-200",
    description:
      "Lumenvale Energy helps homeowners size and finance rooftop solar. We model a home's usage and show exactly what a system would save.",
    roles: [
      {
        title: "Full-Stack Engineer",
        description: "Ship the quote builder that turns a roof photo and a utility bill into a solar proposal.",
        requirementsText: "3+ years of full-stack development, TypeScript, React, Node.js, PostgreSQL",
        location: "Denver, CO (hybrid)",
        employmentType: "Full-time",
        salaryRange: "$125k–$150k",
        applicantCap: 25,
      },
    ],
  },
  {
    slug: "brindle-ledger",
    name: "Brindle Ledger",
    industry: "Fintech",
    size: "11-50",
    description:
      "Brindle Ledger gives freelancers simple bookkeeping. We sort income and expenses automatically and keep quarterly tax estimates up to date.",
    roles: [
      {
        title: "iOS Engineer",
        description: "Build the app freelancers open to snap receipts and check what they owe this quarter.",
        requirementsText: "3+ years of iOS development, Swift, SwiftUI, offline sync, App Store releases",
        location: "Remote (US/Canada)",
        employmentType: "Full-time",
        salaryRange: "$135k–$160k",
        applicantCap: 20,
      },
      {
        title: "Customer Support Specialist",
        description: "Help freelancers get their books right, by chat and email.",
        requirementsText: "2+ years of customer support, written communication, basic bookkeeping knowledge, Zendesk or Intercom",
        location: "Remote (US)",
        employmentType: "Part-time",
        salaryRange: "$28–$34/hour",
        applicantCap: 50,
      },
    ],
  },
  {
    slug: "saltmarsh-learning",
    name: "Saltmarsh Learning",
    industry: "Education",
    size: "11-50",
    description:
      "Saltmarsh Learning makes reading practice software for primary schools. Teachers see which pupils need help without marking every worksheet.",
    roles: [
      {
        title: "Frontend Engineer",
        description: "Build reading activities that children enjoy and teachers trust.",
        requirementsText: "2+ years of frontend development, React, TypeScript, accessibility, animation or game-like interfaces",
        location: "Remote (UK)",
        employmentType: "Full-time",
        salaryRange: "£55k–£70k",
        applicantCap: 25,
      },
      {
        title: "Curriculum Designer",
        description: "Write and test the reading activities our software delivers.",
        requirementsText: "Primary teaching experience, phonics, lesson planning, working with product teams",
        location: "Bristol, UK",
        employmentType: "Contract",
        salaryRange: "£300–£400/day",
        applicantCap: 15,
      },
    ],
  },
  {
    slug: "harrowgate-media",
    name: "Harrowgate Media",
    industry: "Media",
    size: "201-1000",
    description:
      "Harrowgate Media runs a network of local news sites. We are rebuilding our publishing tools so small newsrooms can publish faster.",
    roles: [
      {
        title: "Senior Platform Engineer",
        description: "Lead the move of our publishing platform to managed cloud services.",
        requirementsText: "6+ years of infrastructure engineering, AWS, Terraform, CI/CD, incident response",
        location: "Remote (US)",
        employmentType: "Full-time",
        salaryRange: "$165k–$195k",
        applicantCap: 20,
      },
    ],
  },
  {
    slug: "pinecrest-commerce",
    name: "Pinecrest Commerce",
    industry: "E-commerce",
    size: "51-200",
    description:
      "Pinecrest Commerce builds storefronts for independent outdoor gear shops. We handle inventory, checkout and shipping so owners can focus on customers.",
    roles: [
      {
        title: "Payments Engineer",
        description: "Own checkout, refunds and payouts for hundreds of independent shops.",
        requirementsText: "4+ years of backend development, payment APIs (PayPal or similar), idempotency, Node.js, PostgreSQL",
        location: "Portland, OR (hybrid)",
        employmentType: "Full-time",
        salaryRange: "$145k–$170k",
        applicantCap: 25,
      },
      {
        title: "Merchandising Intern",
        description: "Help shops set up their catalogues and learn what sells online.",
        requirementsText: "Studying business or marketing, spreadsheets, attention to detail, interest in outdoor retail",
        location: "Portland, OR",
        employmentType: "Internship",
        salaryRange: "$22/hour",
        applicantCap: 40,
      },
    ],
  },
  {
    slug: "orrery-labs",
    name: "Orrery Labs",
    industry: "Software",
    size: "11-50",
    description:
      "Orrery Labs builds developer tools for testing mobile apps on real devices. Teams use us to catch layout bugs before their users do.",
    roles: [
      {
        title: "Developer Advocate",
        description: "Write guides, give talks and turn customer feedback into product changes.",
        requirementsText: "3+ years of software development, technical writing, public speaking, mobile testing (Appium or XCUITest)",
        location: "Remote (Europe)",
        employmentType: "Full-time",
        salaryRange: "€70k–€85k",
        applicantCap: 20,
      },
      {
        title: "Android Engineer",
        description: "Build the agent that runs tests on hundreds of Android devices at once.",
        requirementsText: "4+ years of Android development, Kotlin, Android internals, device farms or CI at scale",
        location: "Berlin, Germany",
        employmentType: "Full-time",
        salaryRange: "€75k–€90k",
        applicantCap: 20,
      },
    ],
  },
  {
    slug: "kestrel-mutual",
    name: "Kestrel Mutual",
    industry: "Fintech",
    size: "1000+",
    description:
      "Kestrel Mutual offers renters and pet insurance online. We are replacing paper claims with a process that takes minutes instead of weeks.",
    roles: [
      {
        title: "Machine Learning Engineer",
        description: "Build models that route claims to the right reviewer and flag the ones that need a closer look.",
        requirementsText: "3+ years of machine learning in production, Python, scikit-learn or PyTorch, model monitoring, SQL",
        location: "New York, NY (hybrid)",
        employmentType: "Full-time",
        salaryRange: "$170k–$205k",
        applicantCap: 30,
      },
      {
        title: "Claims Specialist",
        description: "Review complex claims and help customers through stressful moments.",
        requirementsText: "2+ years in insurance claims, empathy, written communication, state adjuster license or willingness to get one",
        location: "Columbus, OH",
        employmentType: "Full-time",
        salaryRange: "$58k–$68k",
        applicantCap: 50,
      },
    ],
  },
  {
    slug: "fernhollow-foods",
    name: "Fernhollow Foods",
    industry: "E-commerce",
    size: "11-50",
    description:
      "Fernhollow Foods delivers weekly boxes from local farms. We plan each box around what the farms actually harvested that week.",
    roles: [
      {
        title: "Marketing Manager",
        description: "Grow our subscriber base in three new cities without losing the local feel.",
        requirementsText: "4+ years of growth or lifecycle marketing, email marketing, paid social, analytics, subscription businesses",
        location: "Austin, TX",
        employmentType: "Full-time",
        salaryRange: "$95k–$115k",
        applicantCap: 30,
      },
    ],
  },
  {
    slug: "veriton-security",
    name: "Veriton Security",
    industry: "Software",
    size: "51-200",
    description:
      "Veriton Security scans small business networks for weak passwords and unpatched devices. We explain each finding in plain language with a fix.",
    roles: [
      {
        title: "Security Engineer",
        description: "Write the checks our scanner runs and help customers fix what it finds.",
        requirementsText: "3+ years of security engineering, network security, Python or Go, vulnerability management, clear writing",
        location: "Remote (US)",
        employmentType: "Full-time",
        salaryRange: "$150k–$175k",
        applicantCap: 20,
      },
      {
        title: "Sales Engineer",
        description: "Run technical demos and help small businesses understand their scan results.",
        requirementsText: "2+ years in sales engineering or IT consulting, networking basics, presenting, CRM tools",
        location: "Atlanta, GA",
        employmentType: "Full-time",
        salaryRange: "$110k–$140k",
        applicantCap: 25,
      },
    ],
  },
  {
    slug: "ambergrove-studio",
    name: "Ambergrove Studio",
    industry: "Media",
    size: "1-10",
    description:
      "Ambergrove Studio is a small team making narrative games for phones and tablets. Our last game was played by over a million people.",
    roles: [
      {
        title: "Gameplay Programmer",
        description: "Build the systems behind our next story-driven puzzle game.",
        requirementsText: "2+ years of game development, Unity, C#, mobile performance, shipped at least one game",
        location: "Remote (worldwide)",
        employmentType: "Contract",
        salaryRange: "$60–$80/hour",
        applicantCap: 15,
      },
    ],
  },
  {
    slug: "tallis-rowe",
    name: "Tallis & Rowe Consulting",
    industry: "Consulting",
    size: "201-1000",
    description:
      "Tallis & Rowe helps mid-sized manufacturers move their planning off spreadsheets. We design the process first and then pick the software.",
    roles: [
      {
        title: "Business Analyst",
        description: "Map how factories plan production today and design how it should work.",
        requirementsText: "2+ years as a business analyst, process mapping, SQL, stakeholder interviews, ERP systems",
        location: "Detroit, MI (hybrid)",
        employmentType: "Full-time",
        salaryRange: "$85k–$105k",
        applicantCap: 30,
      },
      {
        title: "Technical Project Manager",
        description: "Run software rollouts at client sites from kickoff to go-live.",
        requirementsText: "5+ years of project management, ERP or MRP implementations, Agile, budget tracking, client communication",
        location: "Detroit, MI",
        employmentType: "Full-time",
        salaryRange: "$120k–$140k",
        applicantCap: 20,
      },
    ],
  },
  {
    slug: "riverbend-care",
    name: "Riverbend Care",
    industry: "Healthcare",
    size: "1000+",
    description:
      "Riverbend Care runs home health services across four states. Our nurses use our apps to plan visits and record care at the bedside.",
    roles: [
      {
        title: "Mobile Engineer (React Native)",
        description: "Build the app nurses use on every home visit, including in areas with poor signal.",
        requirementsText: "3+ years of mobile development, React Native, TypeScript, offline-first data, HIPAA awareness",
        location: "Remote (US)",
        employmentType: "Full-time",
        salaryRange: "$140k–$165k",
        applicantCap: 25,
      },
    ],
  },
  {
    slug: "cobaltline-robotics",
    name: "Cobaltline Robotics",
    industry: "Logistics",
    size: "51-200",
    description:
      "Cobaltline Robotics builds picking robots for small warehouses. Our robots work alongside people instead of replacing whole aisles.",
    roles: [
      {
        title: "Robotics Software Engineer",
        description: "Improve how our robots plan their paths around people and shelves.",
        requirementsText: "3+ years of robotics software, C++, ROS 2, motion planning, testing on real hardware",
        location: "Pittsburgh, PA",
        employmentType: "Full-time",
        salaryRange: "$145k–$175k",
        applicantCap: 20,
      },
      {
        title: "Field Service Technician",
        description: "Install and maintain robots at customer warehouses.",
        requirementsText: "2+ years of field service or electromechanical repair, troubleshooting, travel up to 50%",
        location: "Pittsburgh, PA",
        employmentType: "Full-time",
        salaryRange: "$65k–$80k",
        applicantCap: 30,
      },
    ],
  },
  {
    slug: "wrenfield-people",
    name: "Wrenfield People",
    industry: "Software",
    size: "11-50",
    description:
      "Wrenfield People builds payroll and leave tracking for restaurants. Managers can approve shift swaps and time off from their phone.",
    roles: [
      {
        title: "Backend Engineer",
        description: "Build the payroll engine that has to be right every single pay day.",
        requirementsText: "3+ years of backend development, Ruby on Rails, PostgreSQL, background jobs, payroll or accounting domain",
        location: "Remote (US)",
        employmentType: "Full-time",
        salaryRange: "$130k–$150k",
        applicantCap: 25,
      },
    ],
  },
  {
    slug: "aldermoor-credit-union",
    name: "Aldermoor Credit Union",
    industry: "Fintech",
    size: "201-1000",
    description:
      "Aldermoor Credit Union serves teachers and their families. We are modernising our online banking while keeping the personal service members expect.",
    roles: [
      {
        title: "QA Engineer",
        description: "Test our new online banking app before it reaches 90,000 members.",
        requirementsText: "3+ years of QA, test automation (Playwright or Cypress), API testing, banking or regulated software",
        location: "Minneapolis, MN (hybrid)",
        employmentType: "Full-time",
        salaryRange: "$95k–$115k",
        applicantCap: 25,
      },
      {
        title: "Member Experience Lead",
        description: "Lead the team that answers member questions by phone, chat and in branches.",
        requirementsText: "4+ years in customer service leadership, coaching, banking or credit union experience, scheduling",
        location: "Minneapolis, MN",
        employmentType: "Full-time",
        salaryRange: "$80k–$95k",
        applicantCap: 20,
      },
    ],
  },
  {
    slug: "glasswing-analytics",
    name: "Glasswing Analytics",
    industry: "Software",
    size: "51-200",
    description:
      "Glasswing Analytics shows retailers why sales changed. Our dashboards explain the drivers behind each number instead of just charting it.",
    roles: [
      {
        title: "Analytics Engineer",
        description: "Model retail data so our explanations are accurate and fast.",
        requirementsText: "3+ years of analytics engineering, SQL, dbt, Snowflake or BigQuery, data modelling",
        location: "Remote (US)",
        employmentType: "Full-time",
        salaryRange: "$135k–$160k",
        applicantCap: 25,
      },
      {
        title: "Senior Product Manager",
        description: "Decide what our dashboards explain next and how they explain it.",
        requirementsText: "5+ years of product management, B2B SaaS, analytics products, customer discovery, SQL",
        location: "San Francisco, CA (hybrid)",
        employmentType: "Full-time",
        salaryRange: "$175k–$210k",
        applicantCap: 20,
      },
    ],
  },
  {
    slug: "seabright-journeys",
    name: "Seabright Journeys",
    industry: "E-commerce",
    size: "51-200",
    description:
      "Seabright Journeys sells small-group walking holidays. We handle every booking, guide and hotel so travellers just turn up and walk.",
    roles: [
      {
        title: "Full-Stack Engineer",
        description: "Build the booking flow and the tools our guides use on tour.",
        requirementsText: "3+ years of full-stack development, Python, Django, React, payments integration",
        location: "Edinburgh, UK (hybrid)",
        employmentType: "Full-time",
        salaryRange: "£60k–£75k",
        applicantCap: 20,
      },
    ],
  },
  {
    slug: "thornbury-grid",
    name: "Thornbury Grid",
    industry: "Energy",
    size: "1000+",
    description:
      "Thornbury Grid operates battery storage sites that balance the power grid. Our software decides when each battery charges and discharges.",
    roles: [
      {
        title: "Optimisation Engineer",
        description: "Improve the models that schedule our batteries against live power prices.",
        requirementsText: "3+ years of optimisation or operations research, Python, linear programming, energy markets",
        location: "London, UK",
        employmentType: "Full-time",
        salaryRange: "£80k–£100k",
        applicantCap: 20,
      },
      {
        title: "Site Reliability Engineer",
        description: "Keep our control systems running around the clock.",
        requirementsText: "4+ years of SRE, Linux, Kubernetes, observability (Prometheus/Grafana), on-call experience",
        location: "London, UK (hybrid)",
        employmentType: "Full-time",
        salaryRange: "£75k–£95k",
        applicantCap: 20,
      },
    ],
  },
  {
    slug: "larkspur-legal",
    name: "Larkspur Legal Tech",
    industry: "Software",
    size: "11-50",
    description:
      "Larkspur Legal Tech helps small law firms manage contracts. Our software finds key dates and clauses so nothing slips through.",
    roles: [
      {
        title: "Applied AI Engineer",
        description: "Build features that find clauses and deadlines in contracts, and measure how often they are right.",
        requirementsText: "3+ years of software engineering, Python, LLM APIs, evaluation and testing of AI features, document parsing",
        location: "Remote (US)",
        employmentType: "Full-time",
        salaryRange: "$160k–$190k",
        applicantCap: 25,
      },
    ],
  },
  {
    slug: "copperleaf-design",
    name: "Copperleaf Design Co.",
    industry: "Consulting",
    size: "1-10",
    description:
      "Copperleaf Design Co. is a small studio that designs websites for nonprofits. We focus on clear writing and pages that load fast on any phone.",
    roles: [
      {
        title: "Web Designer",
        description: "Design and build websites for nonprofit clients from first sketch to launch.",
        requirementsText: "2+ years of web design, Figma, HTML and CSS, writing for the web, working directly with clients",
        location: "Remote (US)",
        employmentType: "Contract",
        salaryRange: "$50–$70/hour",
        applicantCap: 15,
      },
    ],
  },
  {
    slug: "highmoor-diagnostics",
    name: "Highmoor Diagnostics",
    industry: "Healthcare",
    size: "201-1000",
    description:
      "Highmoor Diagnostics runs testing labs for hospitals. Our software tracks each sample from collection to result.",
    roles: [
      {
        title: "Integration Engineer",
        description: "Connect our lab systems to hospital records so results arrive where doctors need them.",
        requirementsText: "3+ years of integration engineering, HL7 or FHIR, Java or C#, interface engines, healthcare IT",
        location: "Raleigh, NC",
        employmentType: "Full-time",
        salaryRange: "$115k–$140k",
        applicantCap: 20,
      },
    ],
  },
  {
    slug: "starling-street",
    name: "Starling Street Academy",
    industry: "Education",
    size: "51-200",
    description:
      "Starling Street Academy runs part-time coding courses for adults changing careers. Most of our students study in the evenings around a full-time job.",
    roles: [
      {
        title: "Coding Instructor",
        description: "Teach evening web development classes and mentor students through their projects.",
        requirementsText: "3+ years of professional web development, JavaScript, teaching or mentoring, evening availability",
        location: "Remote (US)",
        employmentType: "Part-time",
        salaryRange: "$45–$60/hour",
        applicantCap: 30,
      },
      {
        title: "Career Coach",
        description: "Help graduates prepare for interviews and land their first developer role.",
        requirementsText: "2+ years of recruiting or career coaching, tech hiring knowledge, resume review, interview practice",
        location: "Remote (US)",
        employmentType: "Full-time",
        salaryRange: "$70k–$85k",
        applicantCap: 25,
      },
    ],
  },
];

// All site copy. Facts come from the CV (public/assets/cv/CV_Faris_Radifan.pdf);
// nothing here should state anything the CV or the owner has not.
import type { GroupId } from '../lib/gallery-match';

export const site = {
  url: 'https://farisradifana.my.id',
  name: 'Faris Radifan Ahmad',
  monogram: 'FR',
  tagline: 'Data Analyst · Business Intelligence · Automation',
  title: 'Faris Radifan Ahmad | Data Analyst, Business Intelligence, Automation',
  description:
    'Data analyst with three years in commercial planning at Indosat. SQL, Power BI and Python for sales, distribution and budget reporting.',
  location: 'Yogyakarta, Indonesia',
  email: 'radifan.ahmad96@gmail.com',
  cv: '/assets/cv/CV_Faris_Radifan.pdf',
  /** Flip to true to show Dashboard in the public navbar. */
  showDashboardInNav: false,
};

export const nav = [
  { href: '/#home', label: 'Home' },
  { href: '/#about', label: 'About' },
  { href: '/#expertise', label: 'Expertise' },
  { href: '/#experience', label: 'Experience' },
  { href: '/#projects', label: 'Projects' },
  { href: '/#skills', label: 'Skills' },
  ...(site.showDashboardInNav ? [{ href: '/dashboard/', label: 'Dashboard' }] : []),
  { href: '/#contact', label: 'Contact' },
];

export const hero = {
  paragraphs: [
    'I turn sales, distribution and budget data into dashboards and reports that managers use to decide.',
    'Three years in commercial planning at Indosat, working in SQL, Power BI and Python, after five years measuring mobile networks in the field.',
  ],
};

export const about = {
  summary: [
    'I am a Telecommunications Engineering graduate from Telkom University with experience in data analysis, business planning, commercial performance monitoring and distribution operations.',
    'My work sits between the data and the people who act on it: sales KPIs, revenue, budget use and partner performance, reported in a form that is quick to read and hard to misread.',
  ],
  values: [
    {
      icon: 'chart-line',
      title: 'Decisions first',
      text: 'KPI, revenue and target reports built around the question a manager needs answered.',
    },
    {
      icon: 'workflow',
      title: 'Automate the routine',
      text: 'Recurring reports moved to PostgreSQL, Power Query, Python and KNIME so they run without manual work.',
    },
    {
      icon: 'map-pinned',
      title: 'Checked in the field',
      text: 'Field visits across rural Central Java to compare what the numbers say with what the market shows.',
    },
  ],
};

export const expertise = [
  {
    icon: 'chart-column',
    title: 'Data Analysis & Visualization',
    text: 'Sales, revenue and distribution analysis that finds underperforming areas and says what to change.',
  },
  {
    icon: 'layout-dashboard',
    title: 'Business Intelligence',
    text: 'Dashboards in Power BI and Tableau for target achievement, outlet productivity and area performance.',
  },
  {
    icon: 'database',
    title: 'SQL & Data Engineering',
    text: 'PostgreSQL, BigQuery and Impala queries, with data cleaning and validation before anything is reported.',
  },
  {
    icon: 'repeat',
    title: 'Reporting Automation',
    text: 'Daily, weekly and monthly reports automated with Python (Pandas), KNIME, Power Query and n8n.',
  },
  {
    icon: 'target',
    title: 'Business Planning & KPI Monitoring',
    text: 'Business case evaluation, site planning records and budget monitoring for commercial planning.',
  },
  {
    icon: 'bot',
    title: 'AI-Powered Workflow',
    text: 'AI features and usage analytics built into products, such as the Kata10 learning platform.',
  },
];

export const stats = [
  { value: 100, suffix: '+', label: 'Distribution partners managed' },
  { value: 89, suffix: '', label: 'Rural districts covered' },
  { value: 1500, suffix: '', label: 'Site-planning records monitored' },
  { value: 2, prefix: 'IDR ', suffix: 'B', label: 'Annual budget monitored' },
  { value: 10, suffix: '', label: 'Business cases evaluated' },
];

export interface Role {
  title: string;
  period: string;
  points: string[];
  highlight?: string;
  gallery?: Exclude<GroupId, 'other'>;
}

export interface Employer {
  company: string;
  roles: Role[];
}

export const experience: Employer[] = [
  {
    company: 'PT Indosat Tbk',
    roles: [
      {
        title: 'Staff Rural Distribution IM3',
        period: 'Dec 2024 – Jan 2026',
        gallery: 'rural',
        points: [
          'Managed 100+ IM3 distribution partners across 89 rural districts in Central Java, monitoring product distribution, stock availability, electronic transactions and operational performance.',
          'Monitored sales targets and KPIs throughout 2025 to evaluate partner productivity, and analyzed sales and distribution performance to find underperforming areas and recommend improvements.',
          'Conducted field visits to evaluate market conditions, sales activity and product availability, and worked with sales and distribution teams to resolve transaction and inventory issues.',
        ],
      },
      {
        title: 'Staff Trade Marketing 3ID',
        period: 'May 2024 – Dec 2024',
        gallery: 'trade',
        points: [
          'Developed and managed trade programs end to end, from concept and proposal through to execution.',
          'Managed performance monitoring and payment processing, analyzing outlet productivity, revenue contribution, budgets and cost-to-revenue ratios with analytics and automation tools.',
        ],
      },
      {
        title: 'Staff Prepaid Operations & Budget Management 3ID',
        period: 'Apr 2024 – May 2024',
        points: [
          'Monitored regional operational budgets totaling IDR 2 billion a year and analyzed budget utilization, sales performance and KPI achievement.',
          'Supported purchase order, sales order and product delivery processes for 15 partners with the sales, finance and distribution teams.',
        ],
      },
      {
        title: 'Business Planning & Performance 3ID',
        period: 'Feb 2023 – Apr 2024',
        gallery: 'busplan',
        highlight: 'Champion 3ID Business Planning Team, Champions League Indosat Ooredoo Hutchison 2023',
        points: [
          'Evaluated 10 business cases and monitored 1,500 site-planning records to support business development, distribution expansion and commercial planning.',
          'Analyzed sales KPIs, revenue, target achievement, distribution performance and budget utilization to support management decisions.',
          'Developed dashboards and automated reports using PostgreSQL, Power BI, Power Query, Python and KNIME.',
        ],
      },
    ],
  },
  {
    company: 'PT Prima Sentral Distribusi',
    roles: [
      {
        title: 'MIS Coordinator',
        period: '2021 – 2022',
        gallery: 'mis',
        points: [
          'Monitored daily, weekly and monthly sales, distribution and operational performance.',
          'Collected, cleaned, processed and validated data for MIS reports and KPI monitoring.',
          'Developed reports and dashboards in Microsoft Excel and Power Query, and automated data processing with Python (Pandas).',
        ],
      },
    ],
  },
  {
    company: 'NextWave Technologies',
    roles: [
      {
        title: 'Drive Test Engineer',
        period: '2017 – 2022',
        points: [
          'Conducted drive tests for MOCN trials and activation using TEMS Investigation and Nemo.',
          'Performed Site Signaling Verification and monitored network KPIs: coverage, signal quality, throughput and mobility.',
          'Identified network issues and prepared drive-test reports to support RF network optimization.',
        ],
      },
    ],
  },
  {
    company: 'Telkom Malang',
    roles: [
      {
        title: 'FTTH Intern',
        period: 'Aug 2016 – Sep 2016',
        points: [
          'Assisted with fiber-optic network installation, infrastructure inspection and basic FTTH maintenance.',
          'Supported network quality monitoring and learned connectivity troubleshooting and fault handling.',
        ],
      },
    ],
  },
];

export const galleryTitles: Record<GroupId, string> = {
  rural: 'Staff Rural Distribution IM3',
  trade: 'Staff Trade Marketing 3ID',
  busplan: 'Business Planning & Performance 3ID',
  mis: 'MIS Coordinator',
  other: 'Other Work',
};

/** Alt text keyed by normalized filename (see normalizeName). */
export const galleryAlt: Record<string, string> = {
  'region team': 'Central Java regional team of sixteen in matching white jerseys on an office rooftop',
  'rural region': 'Seven people at a field coordination meeting in a café, laptops open on small tables',
  'porto prepaid region 1':
    'Power BI dashboard, Central Java overview and performance 2024: revenue, tertiary and secondary sales cards, achievement table by branch and a sub-district cluster map',
  'circle 1': 'Regional team posing in front of the stage screen at the Indosat Reset to Rise 2025 event',
  'circle 2': 'Regional team cheering with arms raised at the Indosat Reset to Rise 2025 event',
  'circle 3': 'About thirty colleagues on an indoor badminton court after an office tournament',
  'circle 4': 'Team gathering at night in front of a domed colonial church in an old town square',
  'trade 1': 'KRO Trip IM3 participants holding a "Goes to Lombok" banner at the Mandalika circuit, December 2024',
  'trade 2': 'KRO Trip IM3 participants with arms raised on a Lombok beach, boats behind them',
  'trade 3': 'Outlet KRO West Java group with a "Goes to Lombok" banner under trees in North Lombok',
  'trade 4': 'KRO Trip group wearing woven scarves at the Lombok airport entrance',
  'porto trade 1':
    'Power BI dashboard for the Mega Cuan voucher program: outlet counts, growth and revenue by region with region, area and branch filters',
  'busplan 1': 'Collage of three photos of the business planning team in white shirts in the 3ID office',
  'porto busplan 2':
    'Power BI area overview dashboard for Purwokerto: site map, sub-district map, NCP progress at 96.59% and market share table',
  'mis 1': 'Large group at the HIRO Wild Wolf Central Java District outbound event, hills in the background',
  'mis 2': 'Distribution team in black shirts posing indoors at a team event',
  'mis 3': 'Eleven colleagues with raised fists in front of an Indosat Ooredoo Hutchison backdrop',
};

export interface Project {
  title: string;
  kind: string;
  text: string;
  tags: string[];
  href?: string;
  linkLabel?: string;
  /** Present on the detailed projects only. */
  goal?: string;
  infrastructure?: string[];
  flow?: string[];
  note?: string;
  gallery?: { dir: string; images: { file: string; alt: string }[] };
}

export const projects: Project[] = [
  {
    title: 'AI Sales Intelligence Telco',
    kind: 'WhatsApp sales assistant prototype · 2026',
    text: 'A WhatsApp assistant for a telecom distribution team in East Java. Field sales record sell-in and ask about stock, targets and rankings in chat. The AI sits behind tools, not in front of the data.',
    goal: 'Let a sales team work from WhatsApp without trusting a language model with the numbers: every figure in a reply comes from the database and is checked before the message is sent.',
    infrastructure: [
      'WhatsApp Cloud API reaches a FastAPI service through a Cloudflare named tunnel. The webhook verifies the HMAC signature on the raw body and drops duplicates.',
      'n8n routes each message to one of three lanes: quick commands, sell-in input or the AI Agent. It also runs the daily target nudges and an outbox dispatcher every 20 seconds.',
      'PostgreSQL 17 is the source of truth for master data, transactions, the stock ledger, queues, quotas and chat memory.',
      'The AI Agent reads through five read-only tools bound to the current request. Models are reached through a gateway with a backup route.',
      'Google Sheets holds the sell-in recap, and a React dashboard serves supervisors.',
    ],
    flow: [
      'A sales rep sends a WhatsApp message.',
      'The API verifies the signature, identifies the sender and role, and queues the message. Authorization is deny by default.',
      'The n8n router picks a lane: quick command, sell-in input or AI Agent.',
      'Sell-in becomes a draft. After the rep confirms, it is written to the stock ledger and the recap sheet.',
      'For a question, the agent calls its tools and drafts an answer. The API checks every number against the evidence from that turn; if one fails, a standard report is sent instead.',
      'The reply leaves through the outbox to WhatsApp.',
    ],
    note: 'Runs on 500,000 synthetic transactions across 38 regencies and cities, 666 districts and 120 outlets, with five roles from Sales to Head of Region and 125 automated tests. Region names are real; outlets, people and transactions are fictional.',
    tags: ['n8n', 'FastAPI', 'PostgreSQL', 'WhatsApp Cloud API', 'AI agent'],
    href: 'https://github.com/farisradifana/ai-sales-telco',
    linkLabel: 'View the repository on GitHub',
    gallery: {
      dir: 'telco',
      images: [
        { file: 'cover.png', alt: 'Title card of the AI Sales Intelligence Telco prototype' },
        { file: 'n8n-workflow.png', alt: 'n8n canvas showing all workflow lanes: message router, sell-in input, AI Agent, quick commands, target nudges and outbox' },
        { file: 'demo-n8n-lanes.png', alt: 'Demo video frame of the n8n workflow lanes handling a message' },
        { file: 'demo-chat-sales.png', alt: 'WhatsApp chat where a sales rep records sell-in and gets a confirmation' },
        { file: 'demo-chat-head-of-region.png', alt: 'WhatsApp chat where a Head of Region asks for a regional sales report' },
        { file: 'explainer-message-flow.png', alt: 'Diagram of the message flow from WhatsApp through the API and n8n back to the reply' },
        { file: 'explainer-database.png', alt: 'Diagram of the PostgreSQL database as the single source of truth' },
        { file: 'explainer-roles.png', alt: 'Diagram of the five user roles and what each may see' },
        { file: 'explainer-guardrail.png', alt: 'Diagram of the guardrail that checks every number in an AI reply against database evidence' },
      ],
    },
  },
  {
    title: 'Kata10',
    kind: 'English vocabulary web app · live at kata10.id · 2026',
    text: 'An English vocabulary app for Indonesian learners: ten words a day, spaced review, daily grammar, speaking practice, games and AI practice tools, with a free plan and a one-time Lifetime plan.',
    goal: 'Make vocabulary stick with a habit small enough to keep: ten new words a day, then review on a fixed schedule until each word is remembered.',
    infrastructure: [
      'Next.js App Router with Server Actions, React 19, TypeScript and Tailwind CSS 4, running on Cloudflare Workers through OpenNext.',
      'Supabase for Postgres, Google sign-in and storage. Every table has row-level security, and plan limits are enforced in the database.',
      'Lynk.id payments: a signed, idempotent webhook activates the Lifetime plan and AI credit packs.',
      'AI Labs call Claude and Gemini models and are metered by credits. Word audio is generated ahead of time.',
      'Vitest unit tests plus database tests that exercise the security policies.',
    ],
    flow: [
      'The learner signs in with Google and picks a level, mapped to CEFR A1 to C2.',
      'Daily 10: ten new words through four exercise types, graded on the server.',
      'Words come back for review after 1, 3, 7, 14 and 30 days, weakest first.',
      'Ten grammar questions follow the review, each explained after the set.',
      'Finishing the day opens the Play Zone. AI Labs and Video Shadowing add sentence, listening and speaking practice.',
      'XP from each step feeds a weekly leaderboard.',
    ],
    note: 'Also includes a referral program and an admin area for payments, vocabulary, arcade, video and marketing.',
    tags: ['Next.js', 'Supabase', 'Cloudflare Workers', 'Payments', 'AI'],
    href: 'https://kata10.id',
    linkLabel: 'Visit kata10.id',
    gallery: {
      dir: 'kata10',
      images: [
        { file: 'landing-1-hero.png', alt: 'Kata10 landing page hero with the ten words a day promise' },
        { file: 'landing-2-how-it-works.png', alt: 'Landing page section explaining how daily learning works' },
        { file: 'landing-3-grammar.png', alt: 'Landing page section on the ten daily grammar questions' },
        { file: 'landing-4-leaderboard.png', alt: 'Landing page section showing the weekly leaderboard' },
        { file: 'landing-5-speaking.png', alt: 'Landing page section on speaking practice' },
        { file: 'landing-6-play-zone.png', alt: 'Landing page section introducing the Play Zone games' },
        { file: 'landing-7-ai-labs.png', alt: 'Landing page section listing the AI Labs tools' },
        { file: 'landing-8-cta.png', alt: 'Landing page closing section with the sign-up call to action' },
        { file: 'app-home.jpg', alt: 'App home screen with the streak, early access progress, and the Play Zone and Video Shadowing cards' },
        { file: 'app-lesson-card.png', alt: 'Daily lesson card for the word achieve with a meaning question and pronunciation practice' },
        { file: 'app-grammar-card.png', alt: 'Daily grammar question on the present simple with the rule shown after the answer' },
        { file: 'app-progress.jpg', alt: 'Progress page with the streak, vocabulary strength bar and daily activity heatmap' },
        { file: 'app-learning-path.jpg', alt: 'Progress page showing grammar mastery, the learning path stages and progress per category' },
        { file: 'app-play-zone.jpg', alt: 'Play Zone page with the Vocabulary Adventure and Daily Arcade games, locked until the daily session is done' },
        { file: 'app-adventure-island.jpg', alt: 'Vocabulary Adventure island map with ten numbered checkpoints' },
        { file: 'app-2-play-zone-word-catcher.png', alt: 'Play Zone Word Catcher game asking the learner to catch the word that means berani' },
        { file: 'app-video-lesson.jpg', alt: 'Video Shadowing lesson page with the video, practice modes and the credit cost to start' },
        { file: 'app-shadowing-session.jpg', alt: 'Video Shadowing session with the video, playback controls, practice mode tabs and the sentence list' },
        { file: 'app-shadowing-practice.jpg', alt: 'Video Shadowing practice panel with phonetic transcription, translation, intonation options and the record button' },
        { file: 'app-marketing-dashboard.jpg', alt: 'Admin marketing dashboard with posts, views and interactions for Instagram, Facebook, Threads and TikTok' },
      ],
    },
  },
  {
    title: 'AI Job Apply Automation',
    kind: 'Python CLI with a browser agent · 2026',
    text: 'Finds jobs, scores them against one candidate pack, verifies each on the real application page and records every result in a tracker. A job counts as applied only after the confirmation page is seen.',
    tags: ['Python', 'Automation', 'Scoring', 'Tracker'],
  },
  {
    title: 'Portfolio and application analytics',
    kind: 'This site · 2026',
    text: 'A static site on Cloudflare Workers with a job-application dashboard: KPIs, funnel, heatmap and insights computed from the tracker data. The public view runs on synthetic data.',
    tags: ['Astro', 'TypeScript', 'Cloudflare Workers', 'SVG charts'],
    href: '/dashboard/',
    linkLabel: 'Open the demo dashboard',
  },
];

/** Self-assessed proficiency, set by the site owner. */
export const skills = [
  { name: 'SQL / PostgreSQL', level: 90 },
  { name: 'Power BI', level: 90 },
  { name: 'Python / Pandas', level: 85 },
  { name: 'Power Query', level: 85 },
  { name: 'Tableau', level: 80 },
  { name: 'BigQuery', level: 75 },
  { name: 'KNIME', level: 75 },
  { name: 'n8n', level: 75 },
];

export const skillChips = [
  'Data Analysis', 'Business Intelligence', 'Business Planning', 'Sales Performance Analysis',
  'KPI Monitoring', 'Revenue Analysis', 'Distribution Analysis', 'Budget Monitoring',
  'Dashboard Development', 'Reporting Automation', 'Data Cleaning', 'Data Validation',
];

export const languages = ['Bahasa Indonesia (native)', 'English (intermediate)'];

export const education = [
  { degree: 'B.Eng. Telecommunications Engineering', school: 'Telkom University', period: '2023 – 2026', note: 'GPA 3.45 / 4.00' },
  { degree: 'Diploma III, Telecommunications Engineering', school: 'Telkom University', period: '2013 – 2016', note: 'GPA 3.41 / 4.00' },
];

export const certifications = [
  { name: 'n8n Quickstart Course', date: 'Oct 2026' },
  { name: 'AI-Driven Analytics', issuer: 'SkillHacks', date: 'Oct 2024' },
  { name: 'Convincing Communication through Data-Driven Storytelling', issuer: 'Skill Hack', date: 'Oct 2024' },
  { name: 'Mastering Power BI: Essential Skills for Data Analysts', date: 'Jun 2023' },
];

export const beyond = {
  title: 'Off the clock',
  text: 'Away from the dashboards, usually somewhere with a long view. This one is Kelingking Beach on Nusa Penida.',
  alt: 'Faris standing with arms crossed at the cliff-top viewpoint above Kelingking Beach, Nusa Penida, turquoise sea below',
};

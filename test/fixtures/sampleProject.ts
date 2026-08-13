import { Project, Product, Architecture, Entity, Task, Decision, Rule } from "../src/types/pim.ts";

export const sampleProduct: Product = {
  vision: "A habit tracking app that helps users build streaks and stay consistent",
  target_audience: "Health-conscious individuals aged 18-45 who want to build better habits",
  mvp_scope: "- User registration and authentication\n- Habit creation and editing\n- Daily check-in with streak tracking\n- Basic progress dashboard",
  phase2_scope: "- Social features (friends, challenges)\n- Push notifications\n- Habit templates\n- Data export",
  core_workflows: [
    "User signs up and creates their first habit",
    "User checks in daily to maintain their streak",
    "User views progress and analytics dashboard"
  ]
};

export const sampleArchitecture: Architecture = {
  frontend: {
    framework: "Next.js 15",
    ui_library: "Tailwind CSS + Shadcn UI",
    state_management: "React Server Components + Context API",
    routing: "App Router"
  },
  backend: {
    runtime: "Node.js",
    framework: "Next.js Route Handlers",
    api_style: "REST"
  },
  database: {
    type: "PostgreSQL",
    orm: "Prisma",
    hosting: "Supabase"
  },
  auth: {
    strategy: "Session-based",
    provider: "NextAuth.js v5"
  },
  storage: {
    provider: "Supabase Storage",
    type: "Object storage"
  },
  infrastructure: {
    hosting: "Vercel",
    ci_cd: "GitHub Actions"
  },
  rationale: {
    frontend: "Next.js provides excellent DX, App Router for modern patterns, and Vercel integration",
    backend: "Route Handlers keep everything in one project, reducing complexity",
    database: "PostgreSQL is reliable and Supabase provides easy hosting with great DX",
    auth: "NextAuth is the standard for Next.js, well-documented and flexible",
    storage: "Supabase Storage integrates seamlessly with the database",
    infrastructure: "Vercel offers zero-config deployment and great Next.js support"
  }
};

export const sampleEntities: Entity[] = [
  {
    id: "ENT-001",
    name: "User",
    fields: [
      { name: "id", type: "string", required: true, unique: true, indexed: true, description: "UUID primary key" },
      { name: "email", type: "string", required: true, unique: true, indexed: true },
      { name: "password_hash", type: "string", required: true, unique: false, indexed: false },
      { name: "created_at", type: "datetime", required: true, unique: false, indexed: false }
    ],
    relationships: [
      { type: "one_to_many", target_entity: "Habit", foreign_key: "user_id", description: "A user has many habits" }
    ]
  },
  {
    id: "ENT-002",
    name: "Habit",
    fields: [
      { name: "id", type: "string", required: true, unique: true, indexed: true },
      { name: "user_id", type: "string", required: true, unique: false, indexed: true },
      { name: "name", type: "string", required: true, unique: false, indexed: false },
      { name: "streak_count", type: "number", required: true, unique: false, indexed: false, default: "0" },
      { name: "created_at", type: "datetime", required: true, unique: false, indexed: false }
    ],
    relationships: [
      { type: "many_to_one", target_entity: "User", foreign_key: "user_id", description: "A habit belongs to a user" }
    ]
  }
];

export const sampleTasks: Task[] = [
  {
    id: "TASK-001",
    title: "Initialize Next.js project with TypeScript",
    description: "Set up the base project with TypeScript, Tailwind CSS, and all config files",
    depends_on: [],
    status: "not_started",
    acceptance_criteria: ["Project runs with npm run dev", "TypeScript strict mode enabled", "Tailwind configured"],
    files_expected: ["package.json", "tsconfig.json", "tailwind.config.js", "next.config.js"],
    requirement_ids: [],
    estimated_effort: "small"
  },
  {
    id: "TASK-002",
    title: "Set up Prisma schema and database",
    description: "Define the User and Habit models in Prisma and run initial migration",
    depends_on: ["TASK-001"],
    status: "not_started",
    acceptance_criteria: ["Prisma schema defined", "Migration runs successfully", "Database tables created"],
    files_expected: ["prisma/schema.prisma", "prisma/migrations/"],
    requirement_ids: ["ENT-001", "ENT-002"],
    estimated_effort: "medium"
  },
  {
    id: "TASK-003",
    title: "Implement authentication with NextAuth",
    description: "Set up NextAuth.js v5 with email/password and session management",
    depends_on: ["TASK-002"],
    status: "not_started",
    acceptance_criteria: ["User can register", "User can log in", "Session persists across refreshes"],
    files_expected: src/app/api/auth/[...nextauth]/route.ts", "src/components/auth/"],
    requirement_ids: [],
    estimated_effort: "large"
  }
];

export const sampleDecisions: Decision[] = [
  {
    id: "DEC-001",
    topic: "Frontend Framework",
    options: [
      { name: "Next.js", pros: ["Great DX", "App Router", "Vercel hosting"], cons: ["Opinionated"] },
      { name: "Remix", pros: ["Web standards", "Nested routes"], cons: ["Smaller ecosystem"] },
      { name: "Vite + React", pros: ["Fast", "Flexible"], cons: ["More setup"] }
    ],
    chosen: "Next.js",
    rationale: "Best balance of developer experience, ecosystem, and deployment simplicity",
    impacts: ["Frontend", "Deployment", "Backend API design"],
    status: "approved"
  }
];

export const sampleRules: Rule[] = [
  {
    id: "RULE-001",
    category: "architecture",
    text: "Use Next.js App Router for all routing",
    rationale: "Selected as the frontend framework"
  },
  {
    id: "RULE-002",
    category: "architecture",
    text: "Use PostgreSQL with Prisma for all data persistence",
    rationale: "Selected as the database solution"
  }
];

export const sampleProject: Project = {
  schemaVersion: "1.0.0",
  id: "proj_sample123",
  name: "Habit Tracker",
  category: "saas",
  created_at: "2025-01-15T10:00:00Z",
  updated_at: "2025-01-15T10:00:00Z",
  product: sampleProduct,
  requirements: [
    { id: "REQ-001", text: "User can register and log in", priority: "must", source: "mvp_scope" },
    { id: "REQ-002", text: "User can create and track habits", priority: "must", source: "mvp_scope" }
  ],
  features: [],
  architecture: sampleArchitecture,
  entities: sampleEntities,
  tasks: sampleTasks,
  decisions: sampleDecisions,
  rules: sampleRules,
  context_packs: []
};

import { ProjectCategory } from "./pim";

export interface CategoryInfo {
  value: ProjectCategory;
  label: string;
  description: string;
  examples: string[];
}

export const CATEGORIES: CategoryInfo[] = [
  {
    value: "saas",
    label: "SaaS / Web App",
    description: "Web application with users, billing, dashboards. Typically browser-based with a backend server.",
    examples: [
      "Project management tool for remote teams",
      "CRM system for small businesses",
      "E-commerce platform for digital products",
      "Subscription-based analytics dashboard"
    ]
  },
  {
    value: "mobile",
    label: "Mobile App",
    description: "iOS/Android application. Can be React Native, Flutter, or native development.",
    examples: [
      "Workout tracking app with progress charts",
      "Meditation and mindfulness app",
      "Food delivery app for local restaurants",
      "Social fitness challenges app"
    ]
  },
  {
    value: "cli_tool",
    label: "CLI Tool",
    description: "Command-line utility or tool. Runs in terminal, distributed via npm/brew/binary.",
    examples: [
      "Markdown to PDF converter",
      "Code scaffolding tool",
      "File organizer that sorts by type",
      "Git workflow automation tool"
    ]
  },
  {
    value: "browser_ext",
    label: "Browser Extension",
    description: "Chrome/Firefox extension that enhances web browsing experience.",
    examples: [
      "Bookmark manager with tags",
      "Password manager extension",
      "Productivity timer for websites",
      "Note-taking sidebar for any webpage"
    ]
  },
  {
    value: "game",
    label: "Game",
    description: "2D/3D game for web, mobile, or desktop. Has game loops, physics, scoring.",
    examples: [
      "2D platformer with level editor",
      "Puzzle game with daily challenges",
      "Multiplayer card game",
      "Endless runner mobile game"
    ]
  },
  {
    value: "internal_tool",
    label: "Internal Tool",
    description: "Internal business tool, dashboard, or admin panel. Not customer-facing.",
    examples: [
      "Admin dashboard for managing users",
      "Internal analytics reporting tool",
      "Employee onboarding checklist app",
      "Inventory management system"
    ]
  }
];

export const PROJECT_CATEGORY_LABELS: Record<ProjectCategory, string> = {
  saas: "SaaS / Web App",
  mobile: "Mobile App",
  cli_tool: "CLI Tool",
  browser_ext: "Browser Extension",
  game: "Game",
  internal_tool: "Internal Tool"
};

export interface QuestionOption {
  value: string;
  label: string;
  description?: string;
}

export interface Question {
  id: string;
  category: string;
  text: string;
  type: "select" | "multi_select" | "text" | "boolean";
  options?: QuestionOption[];
  default: string;
  tooltip: string;
  required: boolean;
  mapsTo: string;
}

export interface Answer {
  questionId: string;
  value: string;
  skipped: boolean;
}

// SaaS Question Bank (10 questions)
export const SAAS_QUESTIONS: Question[] = [
  {
    id: "auth_strategy",
    category: "saas",
    text: "How should users log in?",
    type: "select",
    options: [
      { value: "email_password", label: "Email + Password", description: "Traditional email/password with reset flow" },
      { value: "oauth", label: "OAuth (Google/GitHub)", description: "Social login via Google, GitHub, etc." },
      { value: "magic_link", label: "Magic Link", description: "Passwordless email link login" },
      { value: "sso", label: "SSO (Single Sign-On)", description: "Enterprise single sign-on" }
    ],
    default: "email_password",
    tooltip: "Auth affects your database schema, session handling, and user onboarding flow",
    required: true,
    mapsTo: "architecture.auth.strategy"
  },
  {
    id: "multi_tenancy",
    category: "saas",
    text: "Do organizations need separate workspaces?",
    type: "select",
    options: [
      { value: "single_tenant", label: "No, single workspace", description: "All users share one workspace" },
      { value: "multi_tenant_shared", label: "Yes, shared database", description: "Workspaces with shared DB and row-level security" },
      { value: "multi_tenant_isolated", label: "Yes, isolated databases", description: "Each organization gets its own database" }
    ],
    default: "single_tenant",
    tooltip: "Multi-tenancy significantly impacts your database design and query complexity",
    required: true,
    mapsTo: "architecture.database.multiTenancy"
  },
  {
    id: "billing",
    category: "saas",
    text: "Will you charge users?",
    type: "select",
    options: [
      { value: "free", label: "Free, no payments", description: "No monetization planned" },
      { value: "one_time", label: "One-time purchase", description: "Single payment for lifetime access" },
      { value: "subscription", label: "Subscription (monthly/yearly)", description: "Recurring payments with plans" },
      { value: "usage_based", label: "Usage-based pricing", description: "Pay per usage (API calls, storage, etc.)" }
    ],
    default: "free",
    tooltip: "Billing requires payment provider integration, webhooks, and receipt management",
    required: true,
    mapsTo: "product.billing"
  },
  {
    id: "real_time",
    category: "saas",
    text: "Do you need real-time features?",
    type: "select",
    options: [
      { value: "none", label: "No real-time needed", description: "Standard request-response is fine" },
      { value: "live_updates", label: "Live updates", description: "Real-time data sync (WebSockets)" },
      { value: "notifications", label: "Notifications only", description: "Push notifications, no live data" },
      { value: "full_realtime", label: "Full real-time", description: "Collaborative editing, live cursors, etc." }
    ],
    default: "none",
    tooltip: "Real-time adds infrastructure complexity (WebSockets, Redis, connection management)",
    required: true,
    mapsTo: "architecture.infrastructure.realTime"
  },
  {
    id: "target_scale",
    category: "saas",
    text: "How many users do you expect?",
    type: "select",
    options: [
      { value: "personal", label: "Personal (< 100 users)", description: "Just me or a small group" },
      { value: "small", label: "Small (100 - 1,000)", description: "Small team or community" },
      { value: "medium", label: "Medium (1,000 - 10,000)", description: "Growing user base" },
      { value: "large", label: "Large (10,000+)", description: "Scale-ready from the start" }
    ],
    default: "small",
    tooltip: "Scale affects caching strategy, database provisioning, and hosting choices",
    required: true,
    mapsTo: "architecture.infrastructure.scale"
  },
  {
    id: "admin_panel",
    category: "saas",
    text: "Do you need an admin dashboard?",
    type: "select",
    options: [
      { value: "no", label: "No admin panel", description: "No internal management needed" },
      { value: "basic", label: "Basic analytics", description: "Simple user stats and metrics" },
      { value: "full", label: "Full management", description: "User management, content moderation, settings" }
    ],
    default: "basic",
    tooltip: "Admin panels add CRUD screens, role-based access, and audit logging",
    required: true,
    mapsTo: "features.adminPanel"
  },
  {
    id: "api_exposure",
    category: "saas",
    text: "Will third-party developers use your API?",
    type: "select",
    options: [
      { value: "no", label: "No public API", description: "API is internal only" },
      { value: "api_keys", label: "Yes, with API keys", description: "Simple key-based access" },
      { value: "oauth_apps", label: "Yes, with OAuth apps", description: "Full OAuth2 app ecosystem" }
    ],
    default: "no",
    tooltip: "Public APIs need rate limiting, documentation, versioning, and developer portal",
    required: true,
    mapsTo: "architecture.backend.apiExposure"
  },
  {
    id: "file_uploads",
    category: "saas",
    text: "Will users upload files?",
    type: "select",
    options: [
      { value: "no", label: "No file uploads", description: "Text-only application" },
      { value: "images_only", label: "Images only", description: "Profile pictures, attachments" },
      { value: "any_file", label: "Any file type", description: "Documents, videos, etc." }
    ],
    default: "no",
    tooltip: "File uploads need storage (S3), processing, virus scanning, and CDN delivery",
    required: true,
    mapsTo: "architecture.storage.uploads"
  },
  {
    id: "search",
    category: "saas",
    text: "How will users find content?",
    type: "select",
    options: [
      { value: "none", label: "No search needed", description: "Content is browsed, not searched" },
      { value: "basic_sql", label: "Basic (SQL LIKE)", description: "Simple text matching" },
      { value: "fulltext", label: "Full-text search", description: "PostgreSQL full-text or similar" },
      { value: "external", label: "External search engine", description: "Algolia, Meilisearch, Elasticsearch" }
    ],
    default: "basic_sql",
    tooltip: "Search complexity ranges from simple queries to dedicated search infrastructure",
    required: true,
    mapsTo: "architecture.backend.search"
  },
  {
    id: "deployment",
    category: "saas",
    text: "Where will you host?",
    type: "select",
    options: [
      { value: "vercel", label: "Vercel", description: "Zero-config, great for Next.js" },
      { value: "aws", label: "AWS", description: "Full control, scalable" },
      { value: "self_hosted", label: "Self-hosted", description: "Your own servers" },
      { value: "not_sure", label: "Not sure yet", description: "Recommend for me" }
    ],
    default: "vercel",
    tooltip: "Hosting affects CI/CD setup, environment variables, and scaling options",
    required: true,
    mapsTo: "architecture.infrastructure.hosting"
  }
];

// Mobile Question Bank (8 questions)
export const MOBILE_QUESTIONS: Question[] = [
  {
    id: "platforms",
    category: "mobile",
    text: "Which platforms?",
    type: "select",
    options: [
      { value: "ios", label: "iOS only", description: "Swift/SwiftUI for iPhone/iPad" },
      { value: "android", label: "Android only", description: "Kotlin for Android devices" },
      { value: "both", label: "Both iOS and Android", description: "Cross-platform development" }
    ],
    default: "both",
    tooltip: "Cross-platform vs native affects your framework choice and development speed",
    required: true,
    mapsTo: "architecture.frontend.platforms"
  },
  {
    id: "framework",
    category: "mobile",
    text: "Which framework?",
    type: "select",
    options: [
      { value: "react_native", label: "React Native", description: "JavaScript/TypeScript, large ecosystem" },
      { value: "flutter", label: "Flutter", description: "Dart, great performance, single codebase" },
      { value: "native", label: "Native (Swift/Kotlin)", description: "Best performance, platform-specific" }
    ],
    default: "react_native",
    tooltip: "Framework determines language, ecosystem, performance, and hiring pool",
    required: true,
    mapsTo: "architecture.frontend.framework"
  },
  {
    id: "offline",
    category: "mobile",
    text: "Does it work offline?",
    type: "select",
    options: [
      { value: "no", label: "Online only", description: "Requires internet connection" },
      { value: "partial", label: "Partial offline", description: "Cached data, sync when online" },
      { value: "full", label: "Full offline", description: "Works without internet, syncs later" }
    ],
    default: "partial",
    tooltip: "Offline requires local database, sync logic, and conflict resolution",
    required: true,
    mapsTo: "architecture.frontend.offline"
  },
  {
    id: "push_notifications",
    category: "mobile",
    text: "Do you need push notifications?",
    type: "select",
    options: [
      { value: "no", label: "No notifications", description: "In-app only" },
      { value: "basic", label: "Basic push", description: "Simple alerts and reminders" },
      { value: "rich", label: "Rich notifications", description: "Actions, images, deep linking" }
    ],
    default: "no",
    tooltip: "Push requires Firebase/APNs setup, token management, and permission handling",
    required: true,
    mapsTo: "architecture.infrastructure.pushNotifications"
  },
  {
    id: "camera_media",
    category: "mobile",
    text: "Will you use camera or media?",
    type: "select",
    options: [
      { value: "no", label: "No camera/media", description: "No native device features" },
      { value: "camera", label: "Camera only", description: "Take photos and videos" },
      { value: "photo_library", label: "Photo library", description: "Access device photos" },
      { value: "both", label: "Camera + library", description: "Full media access" }
    ],
    default: "no",
    tooltip: "Camera/media requires native modules, permissions, and image processing",
    required: true,
    mapsTo: "architecture.frontend.media"
  },
  {
    id: "authentication",
    category: "mobile",
    text: "How do users sign in?",
    type: "select",
    options: [
      { value: "email_password", label: "Email + Password", description: "Traditional login" },
      { value: "social_login", label: "Social login", description: "Google, Apple, Facebook" },
      { value: "phone_otp", label: "Phone OTP", description: "SMS verification code" },
      { value: "biometrics", label: "Biometrics", description: "Face ID, Touch ID, fingerprint" }
    ],
    default: "email_password",
    tooltip: "Auth affects onboarding flow, data security, and user experience",
    required: true,
    mapsTo: "architecture.auth.strategy"
  },
  {
    id: "state_management",
    category: "mobile",
    text: "How will you manage app state?",
    type: "select",
    options: [
      { value: "context", label: "Context API", description: "Built into React Native" },
      { value: "redux", label: "Redux", description: "Predictable state container" },
      { value: "zustand", label: "Zustand", description: "Lightweight and simple" },
      { value: "riverpod", label: "Riverpod", description: "For Flutter apps" }
    ],
    default: "context",
    tooltip: "State management affects app architecture, testability, and developer experience",
    required: true,
    mapsTo: "architecture.frontend.stateManagement"
  },
  {
    id: "monetization",
    category: "mobile",
    text: "How will you make money?",
    type: "select",
    options: [
      { value: "free", label: "Free", description: "No monetization" },
      { value: "paid_app", label: "Paid app", description: "One-time purchase in app store" },
      { value: "in_app_purchases", label: "In-app purchases", description: "Consumables or unlockables" },
      { value: "subscriptions", label: "Subscriptions", description: "Recurring revenue" },
      { value: "ads", label: "Advertisements", description: "Ad-supported model" }
    ],
    default: "free",
    tooltip: "Monetization affects store integration, receipt validation, and pricing strategy",
    required: true,
    mapsTo: "product.billing"
  }
];

// CLI Tool Question Bank (8 questions)
export const CLI_QUESTIONS: Question[] = [
  {
    id: "distribution",
    category: "cli_tool",
    text: "How will users install it?",
    type: "select",
    options: [
      { value: "npm", label: "npm", description: "npm install -g your-tool" },
      { value: "homebrew", label: "Homebrew", description: "brew install your-tool" },
      { value: "binary", label: "Standalone binary", description: "Download and run" },
      { value: "cargo", label: "Cargo", description: "Rust package manager" }
    ],
    default: "npm",
    tooltip: "Distribution affects versioning, updates, and platform support",
    required: true,
    mapsTo: "architecture.distribution.method"
  },
  {
    id: "interactive_vs_flags",
    category: "cli_tool",
    text: "How do users interact?",
    type: "select",
    options: [
      { value: "flags_only", label: "Flags only", description: "All input via command-line flags" },
      { value: "interactive", label: "Interactive prompts", description: "Ask questions during execution" },
      { value: "both", label: "Both", description: "Flags for automation, prompts for guidance" }
    ],
    default: "both",
    tooltip: "Interactive prompts need TUI libraries (inquirer, prompts)",
    required: true,
    mapsTo: "architecture.frontend.interaction"
  },
  {
    id: "config_format",
    category: "cli_tool",
    text: "How is it configured?",
    type: "select",
    options: [
      { value: "flags_only", label: "CLI flags only", description: "No config files" },
      { value: "json", label: "JSON config file", description: "Standard JSON configuration" },
      { value: "yaml", label: "YAML config file", description: "Human-readable config" },
      { value: "toml", label: "TOML config file", description: "Simple, readable format" },
      { value: "both", label: "Flags + config file", description: "Flexible configuration" }
    ],
    default: "both",
    tooltip: "Config files need parsing, validation, and schema definition",
    required: true,
    mapsTo: "architecture.backend.configFormat"
  },
  {
    id: "output_format",
    category: "cli_tool",
    text: "What does it output?",
    type: "select",
    options: [
      { value: "plain_text", label: "Plain text", description: "Human-readable output" },
      { value: "json", label: "JSON", description: "Machine-parseable output" },
      { value: "colored", label: "Colored/formatted", description: "Pretty-printed with colors" },
      { value: "silent", label: "Silent (exit codes)", description: "Only success/failure codes" }
    ],
    default: "colored",
    tooltip: "Output format affects parsing for scripting vs human reading",
    required: true,
    mapsTo: "architecture.backend.outputFormat"
  },
  {
    id: "plugin_system",
    category: "cli_tool",
    text: "Will it support plugins/extensions?",
    type: "select",
    options: [
      { value: "no", label: "No plugins", description: "Self-contained tool" },
      { value: "builtin", label: "Built-in plugins", description: "Official extensions only" },
      { value: "community", label: "Community plugins", description: "Open plugin API" }
    ],
    default: "no",
    tooltip: "Plugins need an API, loading system, versioning, and sandboxing",
    required: true,
    mapsTo: "architecture.backend.pluginSystem"
  },
  {
    id: "network",
    category: "cli_tool",
    text: "Does it make network requests?",
    type: "select",
    options: [
      { value: "no", label: "No network", description: "Purely local operations" },
      { value: "api_calls", label: "API calls", description: "REST API integration" },
      { value: "heavy_data", label: "Heavy data transfer", description: "Large uploads/downloads" }
    ],
    default: "no",
    tooltip: "Network needs error handling, retries, timeouts, and auth",
    required: true,
    mapsTo: "architecture.backend.network"
  },
  {
    id: "filesystem",
    category: "cli_tool",
    text: "Does it read/write files?",
    type: "select",
    options: [
      { value: "no", label: "No file operations", description: "Input/output via stdin/stdout" },
      { value: "read_only", label: "Read only", description: "Read and process files" },
      { value: "read_write", label: "Read + write", description: "Modify files in place" },
      { value: "complex", label: "Complex operations", description: "Directory traversal, renaming, etc." }
    ],
    default: "read_write",
    tooltip: "File operations need path handling, permissions, and error handling",
    required: true,
    mapsTo: "architecture.backend.filesystem"
  },
  {
    id: "logging",
    category: "cli_tool",
    text: "How verbose should output be?",
    type: "select",
    options: [
      { value: "silent", label: "Silent", description: "No output on success" },
      { value: "errors_only", label: "Errors only", description: "Only show problems" },
      { value: "normal", label: "Normal", description: "Progress and results" },
      { value: "verbose", label: "Verbose/Debug", description: "Detailed logging option" }
    ],
    default: "normal",
    tooltip: "Logging level affects debugging experience and script integration",
    required: true,
    mapsTo: "architecture.backend.logging"
  }
];

// Browser Extension Question Bank (8 questions)
export const BROWSER_EXT_QUESTIONS: Question[] = [
  {
    id: "target_browsers",
    category: "browser_ext",
    text: "Which browsers must you support?",
    type: "multi_select",
    options: [
      { value: "chrome", label: "Chrome" },
      { value: "firefox", label: "Firefox" },
      { value: "edge", label: "Edge" },
      { value: "safari", label: "Safari" }
    ],
    default: "chrome",
    tooltip: "Cross-browser support affects APIs, packaging, and testing matrix",
    required: true,
    mapsTo: "architecture.targetBrowsers"
  },
  {
    id: "ext_manifest",
    category: "browser_ext",
    text: "Which manifest version?",
    type: "select",
    options: [
      { value: "mv3", label: "Manifest V3", description: "Current standard (Chrome/Edge), service workers" },
      { value: "mv2", label: "Manifest V2", description: "Legacy, deprecated" },
      { value: "not_sure", label: "Recommend for me", description: "Use MV3" }
    ],
    default: "mv3",
    tooltip: "MV3 uses service workers and restricts remote code; affects architecture",
    required: true,
    mapsTo: "architecture.manifestVersion"
  },
  {
    id: "ext_ui",
    category: "browser_ext",
    text: "What UI surfaces do you need?",
    type: "multi_select",
    options: [
      { value: "popup", label: "Popup" },
      { value: "options_page", label: "Options page" },
      { value: "content_script", label: "Content script (page injection)" },
      { value: "side_panel", label: "Side panel" },
      { value: "devtools", label: "DevTools panel" }
    ],
    default: "popup",
    tooltip: "Different surfaces require different messaging and lifecycle handling",
    required: true,
    mapsTo: "architecture.extUi"
  },
  {
    id: "ext_permissions",
    category: "browser_ext",
    text: "What permissions will you need?",
    type: "multi_select",
    options: [
      { value: "storage", label: "Storage" },
      { value: "tabs", label: "Tabs" },
      { value: "active_tab", label: "Active tab" },
      { value: "cookies", label: "Cookies" },
      { value: "host_permissions", label: "Host permissions (site access)" }
    ],
    default: "storage",
    tooltip: "Broad permissions trigger review friction and user trust issues",
    required: true,
    mapsTo: "architecture.extPermissions"
  },
  {
    id: "ext_storage",
    category: "browser_ext",
    text: "How is state persisted?",
    type: "select",
    options: [
      { value: "local", label: "Local (chrome.storage.local)", description: "Device-only" },
      { value: "sync", label: "Sync storage", description: "Cross-device sync" },
      { value: "backend", label: "Backend API", description: "Central server" }
    ],
    default: "local",
    tooltip: "Sync storage has tight size limits; a backend adds auth complexity",
    required: true,
    mapsTo: "architecture.storage.type"
  },
  {
    id: "ext_messaging",
    category: "browser_ext",
    text: "Do you need a background service?",
    type: "select",
    options: [
      { value: "none", label: "No background work", description: "UI only" },
      { value: "service_worker", label: "Service worker", description: "Event-driven, MV3 style" },
      { value: "long_running", label: "Long-running tasks", description: "Periodic/websocket work" }
    ],
    default: "service_worker",
    tooltip: "MV3 service workers are ephemeral; long tasks need careful design",
    required: true,
    mapsTo: "architecture.extMessaging"
  },
  {
    id: "ext_monetization",
    category: "browser_ext",
    text: "How will it make money?",
    type: "select",
    options: [
      { value: "free", label: "Free" },
      { value: "one_time", label: "One-time purchase" },
      { value: "subscription", label: "Subscription" },
      { value: "ads", label: "Ads" }
    ],
    default: "free",
    tooltip: "Store policies restrict some monetization models",
    required: true,
    mapsTo: "product.billing"
  },
  {
    id: "ext_publish",
    category: "browser_ext",
    text: "Where will you publish?",
    type: "multi_select",
    options: [
      { value: "chrome_web_store", label: "Chrome Web Store" },
      { value: "firefox_addons", label: "Firefox Add-ons" },
      { value: "edge_addons", label: "Edge Add-ons" },
      { value: "internal", label: "Internally / unlisted" }
    ],
    default: "chrome_web_store",
    tooltip: "Each store has its own review process and policies",
    required: true,
    mapsTo: "architecture.infrastructure.hosting"
  }
];

// Game Question Bank (8 questions)
export const GAME_QUESTIONS: Question[] = [
  {
    id: "game_genre",
    category: "game",
    text: "What genre?",
    type: "select",
    options: [
      { value: "puzzle", label: "Puzzle / casual" },
      { value: "platformer", label: "Platformer" },
      { value: "rpg", label: "RPG" },
      { value: "strategy", label: "Strategy" },
      { value: "multiplayer", label: "Multiplayer / competitive" }
    ],
    default: "puzzle",
    tooltip: "Genre drives rendering, physics, and networking needs",
    required: true,
    mapsTo: "product.genre"
  },
  {
    id: "game_engine",
    category: "game",
    text: "Which engine / approach?",
    type: "select",
    options: [
      { value: "unity", label: "Unity (C#)" },
      { value: "unreal", label: "Unreal (Blueprints/C++)" },
      { value: "godot", label: "Godot" },
      { value: "web", label: "Web (Canvas/WebGL/Three.js)" },
      { value: "phaser", label: "Phaser (2D web)" },
      { value: "not_sure", label: "Recommend for me" }
    ],
    default: "web",
    tooltip: "Engine choice locks in language, tooling, and distribution",
    required: true,
    mapsTo: "architecture.frontend.framework"
  },
  {
    id: "game_platform",
    category: "game",
    text: "Which platforms?",
    type: "multi_select",
    options: [
      { value: "web", label: "Web browser" },
      { value: "ios", label: "iOS" },
      { value: "android", label: "Android" },
      { value: "desktop", label: "Desktop (Steam/Epic)" },
      { value: "console", label: "Console" }
    ],
    default: "web",
    tooltip: "Platforms affect input, performance budgets, and store rules",
    required: true,
    mapsTo: "architecture.platforms"
  },
  {
    id: "game_multiplayer",
    category: "game",
    text: "Is it multiplayer?",
    type: "select",
    options: [
      { value: "single", label: "Single player" },
      { value: "local", label: "Local co-op / pass-and-play" },
      { value: "online_async", label: "Online async" },
      { value: "online_real_time", label: "Online real-time" }
    ],
    default: "single",
    tooltip: "Real-time multiplayer needs servers, netcode, and anti-cheat",
    required: true,
    mapsTo: "architecture.backend.network"
  },
  {
    id: "game_art",
    category: "game",
    text: "What's the art approach?",
    type: "select",
    options: [
      { value: "2d", label: "2D sprites" },
      { value: "3d_low", label: "3D low-poly" },
      { value: "3d_realistic", label: "3D realistic" },
      { value: "vector", label: "Vector / minimal" }
    ],
    default: "2d",
    tooltip: "Art style sets pipeline and asset tooling requirements",
    required: true,
    mapsTo: "architecture.frontend.artStyle"
  },
  {
    id: "game_save",
    category: "game",
    text: "How is progress saved?",
    type: "select",
    options: [
      { value: "local", label: "Local save file" },
      { value: "cloud", label: "Cloud save" },
      { value: "none", label: "No persistence" }
    ],
    default: "local",
    tooltip: "Cloud saves need accounts and storage backend",
    required: true,
    mapsTo: "architecture.storage.type"
  },
  {
    id: "game_monetization",
    category: "game",
    text: "How will it make money?",
    type: "select",
    options: [
      { value: "free", label: "Free / open" },
      { value: "premium", label: "Premium purchase" },
      { value: "iap", label: "In-app purchases" },
      { value: "ads", label: "Ads" },
      { value: "early_access", label: "Early access" }
    ],
    default: "free",
    tooltip: "Monetization affects store integration and UX",
    required: true,
    mapsTo: "product.billing"
  },
  {
    id: "game_perf",
    category: "game",
    text: "What's the performance target?",
    type: "select",
    options: [
      { value: "low", label: "Low-end mobile" },
      { value: "mid", label: "Mid-range" },
      { value: "high", label: "High-end / desktop" }
    ],
    default: "mid",
    tooltip: "Performance budget drives engine and optimization choices",
    required: true,
    mapsTo: "architecture.infrastructure.scale"
  }
];

// Internal Tool Question Bank (8 questions)
export const INTERNAL_TOOL_QUESTIONS: Question[] = [
  {
    id: "internal_audience",
    category: "internal_tool",
    text: "Who uses it?",
    type: "select",
    options: [
      { value: "employees", label: "Internal employees" },
      { value: "ops", label: "Ops / engineering" },
      { value: "support", label: "Support / success" },
      { value: "exec", label: "Leadership / reporting" }
    ],
    default: "employees",
    tooltip: "Audience determines UX expectations and access scope",
    required: true,
    mapsTo: "product.targetAudience"
  },
  {
    id: "internal_auth",
    category: "internal_tool",
    text: "How do users authenticate?",
    type: "select",
    options: [
      { value: "sso", label: "SSO (Okta/Entra/Azure AD)" },
      { value: "ldap", label: "LDAP" },
      { value: "email", label: "Email + password" },
      { value: "existing", label: "Existing internal IdP" }
    ],
    default: "sso",
    tooltip: "Internal tools usually require SSO and SCIM provisioning",
    required: true,
    mapsTo: "architecture.auth.strategy"
  },
  {
    id: "internal_data",
    category: "internal_tool",
    text: "How sensitive is the data?",
    type: "select",
    options: [
      { value: "public", label: "Non-sensitive" },
      { value: "internal", label: "Internal only" },
      { value: "confidential", label: "Confidential (PII)" },
      { value: "regulated", label: "Regulated (GDPR/HIPAA/SOX)" }
    ],
    default: "internal",
    tooltip: "Sensitivity drives encryption, audit logging, and compliance",
    required: true,
    mapsTo: "architecture.compliance"
  },
  {
    id: "internal_integrations",
    category: "internal_tool",
    text: "What must it integrate with?",
    type: "multi_select",
    options: [
      { value: "db", label: "Internal databases" },
      { value: "saas", label: "SaaS (Salesforce, Slack, Jira)" },
      { value: "api", label: "Internal APIs" },
      { value: "warehouse", label: "Data warehouse / BI" }
    ],
    default: "db",
    tooltip: "Integrations define connectors, auth, and sync logic",
    required: true,
    mapsTo: "architecture.integrations"
  },
  {
    id: "internal_deploy",
    category: "internal_tool",
    text: "How is it deployed?",
    type: "select",
    options: [
      { value: "k8s", label: "Kubernetes" },
      { value: "vm", label: "Internal VMs" },
      { value: "serverless", label: "Serverless" },
      { value: "static", label: "Internal static hosting" }
    ],
    default: "k8s",
    tooltip: "Internal deployment has its own CI/CD and networking rules",
    required: true,
    mapsTo: "architecture.infrastructure.hosting"
  },
  {
    id: "internal_stack",
    category: "internal_tool",
    text: "Any stack constraints?",
    type: "multi_select",
    options: [
      { value: "typescript", label: "Must be TypeScript" },
      { value: "python", label: "Python preferred" },
      { value: "react", label: "React UI" },
      { value: "no_constraint", label: "No constraint" }
    ],
    default: "no_constraint",
    tooltip: "Internal platforms often mandate a stack for maintainability",
    required: true,
    mapsTo: "architecture.frontend.framework"
  },
  {
    id: "internal_compliance",
    category: "internal_tool",
    text: "Which compliance controls are required?",
    type: "multi_select",
    options: [
      { value: "audit_log", label: "Audit logging" },
      { value: "rbac", label: "Role-based access (RBAC)" },
      { value: "encryption", label: "Encryption at rest/in transit" },
      { value: "review", label: "Approval workflows" }
    ],
    default: "rbac",
    tooltip: "Internal tools need governance controls for safe operation",
    required: true,
    mapsTo: "architecture.complianceControls"
  },
  {
    id: "internal_uptime",
    category: "internal_tool",
    text: "What availability is expected?",
    type: "select",
    options: [
      { value: "best_effort", label: "Best effort" },
      { value: "business_hours", label: "Business hours" },
      { value: "99_9", label: "99.9% (24/7)" }
    ],
    default: "business_hours",
    tooltip: "Availability target drives HA, monitoring, and on-call needs",
    required: true,
    mapsTo: "architecture.infrastructure.scale"
  }
];

export const QUESTION_BANKS: Record<string, Question[]> = {
  saas: SAAS_QUESTIONS,
  mobile: MOBILE_QUESTIONS,
  cli_tool: CLI_QUESTIONS,
  browser_ext: BROWSER_EXT_QUESTIONS,
  game: GAME_QUESTIONS,
  internal_tool: INTERNAL_TOOL_QUESTIONS
};

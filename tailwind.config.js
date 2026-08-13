/** @type {import("tailwindcss").Config} */
module.exports = {
  content: ["./webview/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        vscode: {
          bg: "var(--vscode-editor-background)",
          fg: "var(--vscode-editor-foreground)",
          accent: "var(--vscode-focusBorder)",
          button: "var(--vscode-button-background)",
          buttonHover: "var(--vscode-button-hoverBackground)",
          buttonFg: "var(--vscode-button-foreground)",
          input: "var(--vscode-input-background)",
          inputFg: "var(--vscode-input-foreground)",
          inputBorder: "var(--vscode-input-border)",
          sidebar: "var(--vscode-sideBar-background)",
          sidebarFg: "var(--vscode-sideBar-foreground)",
        }
      }
    },
  },
  plugins: [],
};

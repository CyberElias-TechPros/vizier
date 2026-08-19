/**
 * Vizier Memory Engine — Identity Queries
 *
 * Read-only identity_rules queries with NO dependency on the `vscode`
 * module. Split out from identity-layer.ts (which owns the
 * FileSystemWatcher wiring and therefore must import vscode) so that
 * code needing to just *read* identity rules — like shared-memory.ts,
 * or a future CLI/test — doesn't transitively require a live VS Code
 * extension host.
 */

import { queryAll } from "./database";

export interface IdentityRule {
  path: string;
  content: string;
  updated_at: string;
}

export function getIdentityRules(): IdentityRule[] {
  return queryAll<IdentityRule>("SELECT path, content, updated_at FROM identity_rules");
}

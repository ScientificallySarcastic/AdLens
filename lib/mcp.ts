// ── MCP service interface (placeholder) ────────────────────────────
// Future: the reasoning engine calls an MCP server for campaign data,
// benchmarks, and platform tools. Nothing depends on this yet.

export interface MCPService {
  listResources(): Promise<{ uri: string; name: string }[]>;
  readResource(uri: string): Promise<unknown>;
  callTool(name: string, args: Record<string, unknown>): Promise<unknown>;
}

class NullMCPService implements MCPService {
  async listResources() { return []; }
  async readResource() { return null; }
  async callTool() { return null; }
}

/** Swap NullMCPService for a real MCP client when the server exists. */
export function getMCP(): MCPService {
  return new NullMCPService();
}

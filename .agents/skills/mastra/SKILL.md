---
name: mastra
description: "Comprehensive Mastra framework guide with intelligent documentation lookup. Uses Context7 MCP when available, falls back to embedded docs (node_modules) or remote docs (mastra.ai/llms.txt). Always provides accurate, up-to-date API information for agents, workflows, tools, memory, and RAG."
license: Apache-2.0
metadata:
  author: Mastra
  version: "3.1.0"
  repository: https://github.com/mastra-ai/skills
---

# Mastra Framework Guide

Build AI applications with Mastra. This skill provides **intelligent documentation lookup** with automatic fallback to ensure you always get accurate, up-to-date API information.

## ⚠️ Critical: Never trust internal knowledge

Everything you know about Mastra is likely outdated or wrong. **Always verify against current documentation.**

Mastra evolves rapidly - APIs change between versions, constructor signatures shift, and patterns get refactored.

---

## 🔍 Documentation Lookup Strategy (Automatic Fallback)

This skill uses a **3-tier fallback system** to ensure you always get accurate documentation:

```
┌─────────────────────────────────────────────────────────────┐
│  Tier 1: Context7 MCP (Recommended)                        │
│  → Fastest, most up-to-date documentation                  │
│  → Requires: Context7 MCP server running                   │
│  → Usage: Automatic when available                         │
└─────────────────────────────────────────────────────────────┘
                           ↓ (fallback if unavailable)
┌─────────────────────────────────────────────────────────────┐
│  Tier 2: Embedded Docs (Most Reliable)                     │
│  → Matches your EXACT installed version                    │
│  → Location: node_modules/@mastra/*/dist/docs/             │
│  → Usage: Check with ls node_modules/@mastra/              │
└─────────────────────────────────────────────────────────────┘
                           ↓ (fallback if not installed)
┌─────────────────────────────────────────────────────────────┐
│  Tier 3: Remote Docs (Always Available)                    │
│  → Latest published documentation                          │
│  → Source: https://mastra.ai/llms.txt                      │
│  → Usage: Fetch when no local packages                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start: Context7 MCP (Recommended)

### Setup Context7 MCP Server

#### VSCode Remote (Configured ✅)

The VSCode Remote environment has Context7 MCP configured and running. The server is automatically available when you load the workspace.

**Verify it's working:**
```bash
npx -y @upstash/context7-mcp@latest --help
```

#### Configuration Options

**Option A: HTTP Remote Server (No local install)**
```json
{
  "mcpServers": {
    "context7": {
      "type": "http",
      "url": "https://mcp.context7.com/mcp",
      "headers": {
        "CONTEXT7_API_KEY": "optional-your-key-here"
      }
    }
  }
}
```

**Option B: Local STDIO Server (Project configuration)**

Project config at `.agents/mcp/context7.json`:
```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"],
      "transport": "stdio"
    }
  }
}
```

**Get API Key (optional, for higher rate limits):**
- Visit: https://context7.com/dashboard
- Add to headers: `CONTEXT7_API_KEY: your-key`

### Available Context7 Libraries

| Library | ID | Use For |
|---------|-----|---------|
| Mastra Core | `/mastra-ai/mastra` | Agents, workflows, tools, memory, RAG |
| Mastra Skills | `/mastra-ai/skills` | Official Mastra skills |
| Mastra (llms.txt) | `/llmstxt/mastra_ai_llms_txt` | Overview and concepts |
| Mastra AI Agents | `/llmstxt/mastra_ai_llms-full_txt` | Agents and voice capabilities |

### Using Context7 MCP Tools

When Context7 MCP is available, use these tools in sequence:

#### Available Context7 Tools

| Tool | Purpose | Required Parameters |
|------|---------|---------------------|
| `resolve-library-id` | Find library ID from name | `libraryName`, `query` |
| `query-docs` | Get documentation for a library | `libraryId`, `query` |

#### Step 1: Resolve Library ID

Use the `resolve-library-id` tool to find the correct Context7 library ID:

```
Tool: resolve-library-id
libraryName: "mastra"
query: "mastra framework"
```

This returns library IDs like:
- `/mastra-ai/mastra` - Main framework documentation (6601 code snippets, Score: 86.19)
- `/mastra-ai/skills` - Official skills (145 code snippets, Score: 66.44)
- `/llmstxt/mastra_ai_llms_txt` - Overview docs (7378 code snippets, Score: 83.66)

> **Note:** You can skip this step if you already know the exact library ID (e.g., `/mastra-ai/mastra`).

#### Step 2: Query Documentation

Use the `query-docs` tool to retrieve specific documentation:

**Tool Parameters:**
- `libraryId` (required): The Context7 library ID (e.g., `/mastra-ai/mastra`)
- `query` (required): Your specific question about the API

#### Query Examples by Topic

**For Agents:**
```
Tool: query-docs
libraryId: "/mastra-ai/mastra"
query: "How to create and configure an Agent with tools and memory"
```

**For Workflows:**
```
Tool: query-docs
libraryId: "/mastra-ai/mastra"
query: "Workflow creation using createWorkflow and createStep"
```

**For Tools:**
```
Tool: query-docs
libraryId: "/mastra-ai/mastra"
query: "How to create custom tools using createTool with zod validation"
```

**For Memory:**
```
Tool: query-docs
libraryId: "/mastra-ai/mastra"
query: "Memory configuration with Postgres and semantic recall"
```

**For RAG:**
```
Tool: query-docs
libraryId: "/mastra-ai/mastra"
query: "RAG implementation with vector stores and embeddings"
```

#### Best Practices for Context7 Queries

1. **Be specific**: Include class names, method names, or specific concepts
2. **Include version if known**: e.g., `/mastra-ai/mastra/1.12.0`
3. **Ask for examples**: Request "with code examples" or "with TypeScript examples"
4. **Query once per concept**: Don't bundle multiple unrelated questions

#### Example Complete Workflow

```
User: "How do I create an Agent with memory?"

Step 1: resolve-library-id
→ Returns: /mastra-ai/mastra

Step 2: get-library-docs
  libraryId: "/mastra-ai/mastra"
  query: "Agent class constructor with memory configuration using Postgres storage"

Step 3: Provide answer with code example based on documentation
```

---

## 📦 Tier 2: Embedded Documentation

Use when Context7 is unavailable but Mastra packages are installed.

### Check Installation
```bash
ls node_modules/@mastra/
```

### Lookup Commands

**Search for specific topic:**
```bash
grep -r "Agent" node_modules/@mastra/core/dist/docs/references/ | head -10
```

**Read specific documentation file:**
```bash
cat node_modules/@mastra/core/dist/docs/references/docs-agents-overview.md
```

**Check type definitions:**
```bash
cat node_modules/@mastra/core/dist/docs/assets/SOURCE_MAP.json | grep '"Agent"'
```

### Quick Reference Table

| User Question | Check This File |
|--------------|-----------------|
| "Create/install Mastra" | [`references/create-mastra.md`](references/create-mastra.md) |
| "How to use Agent?" | `docs-agents-overview.md` in embedded docs |
| "How to use Workflow?" | `docs-workflows-overview.md` in embedded docs |
| "Error troubleshooting" | [`references/common-errors.md`](references/common-errors.md) |
| "Upgrade from v0.x to v1.x" | [`references/migration-guide.md`](references/migration-guide.md) |

---

## 🌐 Tier 3: Remote Documentation

Use when no local packages are installed.

### Fetch Latest Docs
```bash
curl -s https://mastra.ai/llms.txt
```

### Key URLs
- **Main docs:** https://mastra.ai/llms.txt
- **Full reference:** https://mastra.ai/reference
- **Examples:** https://github.com/mastra-ai/mastra/tree/main/examples

---

## 🧠 Core Concepts

### Agents vs Workflows

| | Agent | Workflow |
|---|---|---|
| **Purpose** | Autonomous decision-making | Structured sequence |
| **Use for** | Open-ended tasks | Defined processes |
| **Examples** | Support, research, analysis | Pipelines, approvals, ETL |

### Key Components

- **Tools**: Extend agent capabilities (APIs, databases, external services)
- **Memory**: Maintain context (message history, working memory, semantic recall)
- **RAG**: Query external knowledge (vector stores, graph relationships)
- **Storage**: Persist data (Postgres, LibSQL, MongoDB)

---

## ⚙️ Critical Requirements

### TypeScript Configuration

Mastra requires **ES2022 modules**. CommonJS will fail.

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler"
  }
}
```

### Model Format

Always use `"provider/model-name"`:

```typescript
"openai/gpt-5.2"
"anthropic/claude-sonnet-4-5"
"google/gemini-2.5-pro"
"groq/llama-3.3-70b-versatile"
```

---

## 🔧 Development Workflow

### Before Writing Any Code

```
┌────────────────────────────────────────────────────────────┐
│ STEP 1: Verify Context7 MCP is available                   │
│         → If yes, use Context7 queries                     │
│         → If no, proceed to Step 2                         │
├────────────────────────────────────────────────────────────┤
│ STEP 2: Check packages installed                           │
│         ls node_modules/@mastra/                           │
│         → If packages exist, use embedded docs             │
│         → If not, fetch remote docs                        │
├────────────────────────────────────────────────────────────┤
│ STEP 3: Look up current API                                │
│         → Context7: Use library queries                    │
│         → Embedded: grep/cat docs in node_modules          │
│         → Remote: curl mastra.ai/llms.txt                  │
├────────────────────────────────────────────────────────────┤
│ STEP 4: Write code based on current docs                   │
│         → Never assume - always verify                     │
├────────────────────────────────────────────────────────────┤
│ STEP 5: Test in Mastra Studio                              │
│         ./scripts/mastra-studio.sh restart                 │
│         → http://localhost:4111                            │
└────────────────────────────────────────────────────────────┘
```

### Troubleshooting Documentation Issues

**Verify Context7 MCP is working:**
```bash
# Test server initialization
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | npx -y @upstash/context7-mcp@latest --transport stdio

# Expected: Server info with version (e.g., "version":"2.1.4")
```

**Test complete workflow:**
```bash
# Test library resolution (both libraryName and query are required)
cat << 'EOF' | npx -y @upstash/context7-mcp@latest --transport stdio
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"resolve-library-id","arguments":{"libraryName":"mastra","query":"mastra framework"}}}
EOF

# Expected: List of libraries including /mastra-ai/mastra
```

**Test documentation query:**
```bash
# Query docs (both libraryId and query are required)
cat << 'EOF' | npx -y @upstash/context7-mcp@latest --transport stdio
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"query-docs","arguments":{"libraryId":"/mastra-ai/mastra","query":"How to create an Agent"}}}
EOF

# Expected: Code examples and documentation
```

**Fallback to Embedded Docs:**
```bash
# If Context7 is unavailable, use embedded docs
cd Xpert && ls node_modules/@mastra/core/dist/docs/

# Search for specific API
grep -r "class Agent" node_modules/@mastra/core/dist/docs/references/
```

**Embedded docs not found?**
```bash
# Reinstall packages
cd Xpert && pnpm install

# Verify docs exist
ls node_modules/@mastra/core/dist/docs/
```

---

## 🐛 When You See Errors

**Type errors often mean your knowledge is outdated.**

### Common Signs of Outdated Knowledge

| Error | Meaning | Action |
|-------|---------|--------|
| `Property X does not exist on type Y` | API changed | Check current docs |
| `Cannot find module` | Import path changed | Verify package structure |
| `Type mismatch` | Signature changed | Check type definitions |
| Constructor parameter errors | Constructor changed | Read class definition |

### What To Do

1. **Don't assume the error is your mistake** - it might be outdated knowledge
2. **Check [`references/common-errors.md`](references/common-errors.md)**
3. **Verify current API** using the 3-tier fallback
4. **Update your code** based on current documentation

---

## 📚 Resources

### Documentation
- **Context7 Libraries:** `/mastra-ai/mastra`, `/mastra-ai/skills`
- **Setup Guide:** [`references/create-mastra.md`](references/create-mastra.md)
- **Embedded Docs:** `node_modules/@mastra/core/dist/docs/`
- **Remote Docs:** https://mastra.ai/llms.txt

### Project Configuration
- **MCP Config:** `.agents/mcp/context7.json`
- **Studio Script:** `./scripts/mastra-studio.sh`
- **Log:** `/tmp/mastra-studio.log`

### External Links
- [Mastra Documentation](https://mastra.ai/llms.txt)
- [Mastra GitHub](https://github.com/mastra-ai/mastra)
- [Context7 Dashboard](https://context7.com/dashboard)

---

## ✅ Checklist

### Before starting work:

- [ ] Loaded skill `/mastra`
- [ ] **Context7 MCP verified** (`npx -y @upstash/context7-mcp@latest --help`)
- [ ] **Documentation source confirmed:**
  - [ ] Context7 MCP available (preferred) → Use `resolve-library-id` + `get-library-docs`
  - [ ] OR Embedded docs available → Use `node_modules/@mastra/*/dist/docs/`
  - [ ] OR Remote docs fallback → Use `https://mastra.ai/llms.txt`
- [ ] PostgreSQL accessible (`./scripts/mastra-studio.sh status`)
- [ ] Mastra packages installed (`ls node_modules/@mastra/`)
- [ ] Mastra Studio running (`./scripts/mastra-studio.sh start`)

### When writing Mastra code:

- [ ] **ALWAYS queried documentation first:**
  ```
  Example: Creating an Agent
  1. resolve-library-id libraryName="mastra" query="mastra framework"
     → Returns: /mastra-ai/mastra
  2. query-docs libraryId="/mastra-ai/mastra" query="Agent class constructor with memory"
     → Returns: Code examples and API documentation
  3. Write code based on verified API
  ```
- [ ] Used verified API signatures (constructor params, methods, types)
- [ ] Included proper TypeScript types
- [ ] Exported in `src/mastra/index.ts`

### After making changes:

- [ ] Restarted Studio (`./scripts/mastra-studio.sh restart`)
- [ ] Verified changes at http://localhost:4111
- [ ] No type errors (if errors occur, re-check documentation)

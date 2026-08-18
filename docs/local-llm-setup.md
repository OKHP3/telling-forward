# Running a stronger local model for ingestion

Telling Forward's manuscript ingestion has three tiers (see
`docs/adr/0004-manuscript-ingestion-and-bring-your-own-ai.md`):

1. Rules-only conversion and segmentation. Always available, no AI.
2. The default free tier: GitHub Actions running Phi-4-mini-instruct,
   triggered automatically, no setup required.
3. Bring your own AI: either the MCP server (`artifacts/mcp-server/`) under
   a subscription you already have, or a local model you run yourself
   for better quality than the free default tier gives you.

This page is for the third path, specifically for people who have real
hardware and want more than a 3.8B model running on a GitHub Actions CPU
runner.

## Option A: Ollama

If you have a machine with a discrete GPU (or Apple Silicon with enough
unified memory), [Ollama](https://ollama.com) is the lowest-friction way
to run a larger model locally.

1. Install Ollama for your platform.
2. Pull a model sized to your hardware. A rough starting point:
   - 8-16 GB RAM/VRAM: `ollama pull phi4-mini` or `ollama pull llama3.2`
   - 24+ GB RAM/VRAM: `ollama pull mistral-nemo` or a quantized 13-14B model
3. Point the Telling Forward MCP server, or your own ingestion script, at
   Ollama's local API (`http://localhost:11434` by default) instead of the
   Actions tier.

Ollama itself is not an MCP host — it exposes a local HTTP API. To use it
from an MCP-capable client like Claude Desktop or Claude Code, you need an
MCP bridge in front of it. Several community bridges exist; search
"Ollama MCP server" for current, maintained options rather than relying on
a specific one named here, since this space moves quickly.

## Option B: LM Studio

[LM Studio](https://lmstudio.ai) offers a GUI for downloading and running
open-weight models locally, plus an OpenAI-compatible local API server you
can point other tools at. Reasonable choice if you'd rather browse and pick
a model visually than use the command line.

## Choosing a model

Bigger and more capable than Phi-4-mini-instruct (the default Tier-1
model) is the whole point of this path. Reasonable Western-origin, openly
licensed options as of this writing: Mistral's Ministral-8B (Apache 2.0),
IBM's Granite 4.1-8B (Apache-licensed, enterprise-governance-oriented), or
a larger Phi-4 variant if your hardware supports it. Check each model's
current license and hardware requirements before committing — this list
will go stale as new models ship.

## What doesn't change

Regardless of which local model you run, capsule output should still flow
through the same review gate as every other tier: draft GitHub Issues, a
human decides whether to promote. Nothing about running a bigger model
locally should skip that review step.

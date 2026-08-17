// Hand-written barrel — Orval's indexFiles:false prevents codegen from
// overwriting this file. We export only the Zod validators from generated/api;
// the TypeScript interface files in generated/types are NOT re-exported because
// some schema names collide with same-name Zod validator constants (e.g.
// AcceptProposalResponse, ReturnProposalBody), and the api-server — the sole
// consumer of this package — only needs the Zod validators for validation.
export * from "./generated/api";

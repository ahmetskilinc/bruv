// Browser-safe access to eve's `Client`.
//
// The public `eve/client` barrel re-exports server-only modules (under
// `eve/dist/src/internal/*` and `eve/dist/src/compiled/*`) that import
// `node:module`, so importing it into a client bundle crashes Turbopack with
// "the chunking context does not support external modules (request: node:module)".
//
// The `Client` class itself is browser-safe — `eve/react`'s `useEveAgent`
// bundles the very same code internally. So we resolve `Client` straight from
// eve's built `client.js`, bypassing the tainted barrel. The bare specifier
// below is mapped to that file by:
//   - next.config.ts  -> turbopack.resolveAlias (runtime bundling)
//   - tsconfig.json   -> compilerOptions.paths   (types)
//
// If an eve upgrade moves that file, update both mappings.
export { Client } from "eve-client-impl";

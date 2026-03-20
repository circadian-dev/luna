import { defineConfig } from 'tsdown';

export default defineConfig({
   entry: {
    index: 'src/index.ts',
    'devtools/index': 'src/devtools/index.ts',
  },
  format: 'esm',
  clean: true,
  platform: 'browser',
  dts: { resolve: true },
  external: ['react', 'react/jsx-runtime', 'react-dom', 'react-dom/client'],
  noExternal: [/.*/],

  treeshake: true,
  define: {
    // Some dependencies still reference `global` — alias it to globalThis for
    // compatibility with Deno, Bun, and edge runtimes.
    global: 'globalThis',
  },
  // Ensures Node.js built-ins are imported with the `node:` prefix for
  // compatibility with Deno and other non-Node runtimes.
  nodeProtocol: true,
});

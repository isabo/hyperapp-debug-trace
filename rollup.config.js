import { terser } from 'rollup-plugin-terser';

export default {
  input: './src/trace.js',
  output: {
    file: './dist/hyperapp-debug-trace.min.js',
    format: 'es',
    sourcemap: true,
  },
  plugins: [terser()],
};

import { pdfjs } from 'react-pdf';

// Try importing worker from node_modules
try {
  // Works in modern bundlers (Vite, CRA v5+, webpack 5)
  import('pdfjs-dist/build/pdf.worker.min.mjs')
    .then(worker => {
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    })
    .catch(() => {
      // Fallback: use static public file if ESM import fails
      pdfjs.GlobalWorkerOptions.workerSrc = `${window.location.origin}/pdf.worker.min.js`;
    });
} catch (e) {
  // Old fallback
  pdfjs.GlobalWorkerOptions.workerSrc = `${window.location.origin}/pdf.worker.min.js`;
}

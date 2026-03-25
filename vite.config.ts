import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api/books": {
        target: "https://fakeapi.extendsclass.com",
        changeOrigin: true,
        rewrite: () => "/books",
      },
      "/api/google-books": {
        target: "https://www.googleapis.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/google-books/, "/books/v1/volumes"),
      },
      "/api/book-covers": {
        target: "https://books.google.com",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/book-covers/, ""),
      },
    },
  },
});

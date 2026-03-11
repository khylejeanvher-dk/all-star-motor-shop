import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  server: {
    port: 3000
  },
  build: {
    rollupOptions: {
      input: {
        main:     resolve(__dirname, 'index.html'),
        product:  resolve(__dirname, 'product.html'),
        category: resolve(__dirname, 'category.html'),
        about:    resolve(__dirname, 'about.html'),
        contact:  resolve(__dirname, 'contact.html'),
      }
    }
  }
})
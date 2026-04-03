import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: ['__tests__/unit/**/*.test.ts'],
          globals: true,
        },
        resolve: {
          alias: { '@': path.resolve(__dirname, '.') },
        },
      },
      {
        test: {
          name: 'api',
          environment: 'node',
          include: ['__tests__/api/**/*.test.ts'],
          globals: true,
        },
        resolve: {
          alias: { '@': path.resolve(__dirname, '.') },
        },
      },
      {
        test: {
          name: 'integration',
          environment: 'node',
          include: ['__tests__/integration/**/*.test.ts'],
          globals: true,
        },
        resolve: {
          alias: { '@': path.resolve(__dirname, '.') },
        },
      },
    ],
  },
})

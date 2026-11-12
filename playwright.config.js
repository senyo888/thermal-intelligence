// SPDX-License-Identifier: GPL-3.0-only
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'./tests/browser', fullyParallel:true, workers:3, timeout:20000,
  reporter:[['list']], use:{baseURL:'http://127.0.0.1:4173',viewport:{width:1440,height:1000},trace:'retain-on-failure'},
  webServer:{command:'node scripts/preview-server.mjs',url:'http://127.0.0.1:4173',reuseExistingServer:!process.env.CI},
});

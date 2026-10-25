import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  // Local placeholder: use the console's actual ID via AIT_APP_NAME before submission.
  appName: process.env.AIT_APP_NAME || 'fossil-asmr-dev',
  brand: {
    primaryColor: '#795139',
  },
  permissions: [],
  webBundleDir: 'dist',
});

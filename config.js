export default {
  // URLs to audit
  urls: [
    'https://bamboohr.com',
    // Add more URLs here
  ],

  // Axe-core configuration
  axeConfig: {
    // Run only specific WCAG rules (focusing on most important compliance checks)
    runOnly: {
      type: 'tag',
      values: [
        // WCAG 2.1 Level A & AA (most important for compliance)
        'wcag2a',
        'wcag2aa',
        'wcag21a',
        'wcag21aa',
      ],
    },
    // Set to true to ensure consistent results between runs
    // This disables random rule order which can cause inconsistencies
    pingWaitTime: 500,
    // Increase timeout for more reliable results
    timeout: 30000,
    // Ensure the page is fully loaded
    elementRef: true,
    // Ensure consistent context for analysis
    ancestry: true,
    // Disable rules that might produce inconsistent results
    disableRules: [
      // Add any rules that consistently produce variable results
    ],
  },

  // Browser configuration
  browser: {
    headless: 'new',
    args: [
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-setuid-sandbox',
      '--no-sandbox',
    ],
    defaultViewport: { width: 1920, height: 1080 },
  },

  // Page navigation options
  navigation: {
    waitUntil: ['domcontentloaded', 'networkidle2'],
    timeout: 60000,
  },

  // Output configuration
  output: {
    directory: 'results',
    includePassingTests: false,
    includeIncompleteTests: true,
  },
};

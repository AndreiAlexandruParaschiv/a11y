# Accessibility a11y

A tool for running accessibility audits on websites using axe-core and Puppeteer, focusing on WCAG compliance.

## Features

- Run accessibility audits on multiple URLs from a configuration file
- Configure axe-core settings for consistent results between runs
- Focus on the most important WCAG compliance checks (A and AA levels)
- Generate detailed CSV reports with violation information
- Categorize violations by impact level (Critical, Serious)
- Provide a comprehensive summary in the console

## Installation

```bash
# Clone the repository
git clone https://github.com/AndreiAlexandruParaschiv/a11y.git
cd a11y

# Install dependencies
npm install
```

## Usage

### Configuration

Edit the `config.js` file to add URLs and customize the audit settings:

```javascript
export default {
  // URLs to audit
  urls: [
    'https://example.com',
    'https://another-example.com',
    // Add more URLs here
  ],

  // Axe-core configuration
  axeConfig: {
    // Run only specific WCAG rules (focusing on most important compliance checks)
    runOnly: {
      type: 'tag',
      values: [
        // WCAG 2.0 and 2.1 Level A & AA (most important for compliance)
        'wcag2a',
        'wcag2aa',
        'wcag21a',
        'wcag21aa',
      ],
    },
    // Settings to ensure consistent results
    pingWaitTime: 500,
    timeout: 30000,
    elementRef: true,
    ancestry: true,
  },

  // Browser configuration
  browser: {
    headless: 'new',
    defaultViewport: { width: 1920, height: 1080 },
  },

  // Output configuration
  output: {
    directory: 'results',
    includePassingTests: false, // Only include violations in CSV
    includeIncompleteTests: true, // Include items that need review
  },
};
```

### Running the Audit

Run the audit using the configuration file:

```bash
npm run audit
```

Or check a single URL from the command line:

```bash
npm run check -- https://example.com
```

## Understanding the Results

### Console Output

The tool provides a detailed console output with:

1. **Accessibility Check Results** for each URL:

   - List of violations with impact level, WCAG criteria, and affected elements
   - Number of passed checks
   - Items that need manual review

2. **Accessibility Audit Summary**:
   - Table showing all URLs checked
   - Number of violations found
   - Breakdown by impact category (Critical, Serious)
   - Number of items needing review

### CSV Report

A detailed CSV report is generated for each URL with the following information:

- Type (Violation or Needs Review)
- Impact level (Critical, Serious)
- Description of the issue
- Help text and URL for more information
- Rule ID
- WCAG criteria
- HTML element causing the violation
- Failure summary

Reports are saved in the `results` directory with a timestamp in the filename.

## Understanding WCAG Tags

The WCAG tags in the results (like `wcag2a`, `wcag244`, `wcag412`) refer to:

- `wcag2a` - All WCAG 2.0 Level A success criteria
- `wcag2aa` - All WCAG 2.0 Level AA success criteria
- `wcag21a` - All WCAG 2.1 Level A success criteria
- `wcag21aa` - All WCAG 2.1 Level AA success criteria

Individual criteria are referenced with more specific tags:

- `wcag244` - Success Criterion 2.4.4 (Link Purpose)
- `wcag412` - Success Criterion 4.1.2 (Name, Role, Value)

## Addressing Inconsistent Results

Axe-core can sometimes produce inconsistent results between runs due to:

1. **Dynamic Content**: Websites with dynamic content that changes between page loads
2. **Timing Issues**: Elements that appear or change based on timing
3. **Random Rule Order**: By default, axe-core may run rules in a non-deterministic order
4. **Browser State**: Different browser states can affect how elements are rendered

This tool addresses these issues by:

1. Adding consistent configuration to axe-core
2. Waiting for the page to stabilize before running tests
3. Setting a consistent environment for testing
4. Using specific WCAG rules focused on compliance

## License

This project is licensed under the MIT License.

# Accessibility a11y

A comprehensive accessibility testing tool that uses both axe-core and Pa11y to audit websites for WCAG compliance.

## Features

- Run accessibility audits on multiple URLs from a configuration file
- Use two different accessibility testing engines (axe-core and Pa11y)
- Configure settings for consistent results between runs
- Focus on the most important WCAG compliance checks (A and AA levels)
- Generate detailed CSV reports with violation information
- Categorize issues by impact level
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

### Running the Audits

#### Using axe-core

Run the audit using axe-core:

```bash
npm run axecore
```

Or check a single URL with axe-core:

```bash
npm run axecore -- https://example.com
```

#### Using Pa11y

Run the audit using Pa11y:

```bash
npm run pa11y
```

Or check a single URL with Pa11y:

```bash
npm run pa11y -- https://example.com
```

## Understanding the Results

### axe-core Results

The axe-core tool provides:

1. **Accessibility Check Results** for each URL:

   - List of violations with impact level, WCAG criteria, and affected elements
   - Number of passed checks
   - Items that need manual review

2. **Accessibility Audit Summary**:
   - Table showing all URLs checked
   - Number of violations found
   - Breakdown by impact category (Critical, Serious)
   - Number of items needing review

### Pa11y Results

The Pa11y tool provides:

1. **Accessibility Check Results** for each URL:

   - List of issues with type, code, and message
   - HTML context and selector for each issue
   - Information about which tool detected the issue (axe or HTML CodeSniffer)

2. **Accessibility Audit Summary**:
   - Table showing all URLs checked
   - Number of issues found
   - Breakdown by issue type (Errors, Warnings)

### CSV Reports

Both tools generate detailed CSV reports with timestamps in the filename. These reports include:

- **axe-core**: Violations with impact level, description, WCAG criteria, and affected elements
- **Pa11y**: Issues with type, code, message, HTML context, and selector

Reports are saved in the `results` directory.

## Why Use Both Tools?

Using both axe-core and Pa11y provides more comprehensive coverage:

1. **axe-core**: Focuses on reliable, automated testing with minimal false positives
2. **Pa11y**: Combines multiple testing engines (axe and HTML CodeSniffer) for broader coverage

By using both tools, you can catch more accessibility issues and ensure better WCAG compliance.

## Understanding WCAG Tags

The WCAG tags in the results refer to:

- `wcag2a` - All WCAG 2.0 Level A success criteria
- `wcag2aa` - All WCAG 2.0 Level AA success criteria
- `wcag21a` - All WCAG 2.1 Level A success criteria
- `wcag21aa` - All WCAG 2.1 Level AA success criteria
- `wcag22a` - All WCAG 2.2 Level A success criteria
- `wcag22aa` - All WCAG 2.2 Level AA success criteria

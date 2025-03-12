import pa11y from 'pa11y';
import chalk from 'chalk';
import { createObjectCsvWriter } from 'csv-writer';
import fs from 'fs';
import config from './config.js';

// Ensure results directory exists
function ensureDirectoryExists(directory) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

// Check accessibility for a single URL using Pa11y
async function checkAccessibilityWithPa11y(url) {
  console.log(chalk.blue(`\nChecking accessibility for ${url}...`));

  try {
    // Configure Pa11y options
    const options = {
      standard: 'WCAG2AA', // WCAG 2.1 AA
      runners: ['axe', 'htmlcs'], // Use both axe and HTML CodeSniffer
      timeout: config.axeConfig?.timeout || 30000,
      wait: 1000, // Wait for page to stabilize
      chromeLaunchConfig: {
        headless: config.browser?.headless || 'new',
        defaultViewport: config.browser?.defaultViewport || {
          width: 1920,
          height: 1080,
        },
      },
    };

    // Run Pa11y
    const results = await pa11y(url, options);

    // Count issues by type
    const errors = results.issues.filter(
      (issue) => issue.type === 'error'
    ).length;
    const warnings = results.issues.filter(
      (issue) => issue.type === 'warning'
    ).length;
    const notices = results.issues.filter(
      (issue) => issue.type === 'notice'
    ).length;

    // Display results
    console.log(chalk.green(`\nAccessibility check completed for ${url}`));
    console.log(
      `Found ${chalk.red(errors)} errors, ${chalk.yellow(
        warnings
      )} warnings, and ${chalk.blue(notices)} notices.`
    );

    // Display detailed issues
    if (results.issues.length > 0) {
      console.log(chalk.yellow('\nIssues found:'));
      results.issues.forEach((issue, index) => {
        const color =
          issue.type === 'error'
            ? chalk.red
            : issue.type === 'warning'
            ? chalk.yellow
            : chalk.blue;

        console.log(
          `\n${index + 1}. ${color(issue.type.toUpperCase())}: ${issue.message}`
        );
        console.log(`   Code: ${issue.code}`);
        console.log(`   Context: ${issue.context}`);
        console.log(`   Selector: ${issue.selector}`);
        console.log(`   Runner: ${issue.runner}`);
      });
    } else {
      console.log(chalk.green('\nNo issues found!'));
    }

    // Generate CSV report
    if (config.output?.directory) {
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const urlSlug = url.replace(/https?:\/\//, '').replace(/[^\w]/g, '-');
      const filename = `${config.output.directory}/${urlSlug}-pa11y-report-${timestamp}.csv`;

      ensureDirectoryExists(config.output.directory);

      const csvWriter = createObjectCsvWriter({
        path: filename,
        header: [
          { id: 'type', title: 'Type' },
          { id: 'code', title: 'Code' },
          { id: 'message', title: 'Message' },
          { id: 'context', title: 'Context' },
          { id: 'selector', title: 'Selector' },
          { id: 'runner', title: 'Runner' },
        ],
      });

      await csvWriter.writeRecords(results.issues);
      console.log(chalk.green(`\nCSV report saved to ${filename}`));
    }

    return {
      url,
      errors,
      warnings,
      notices,
      total: results.issues.length,
    };
  } catch (error) {
    console.error(
      chalk.red(`\nError checking accessibility for ${url}:`),
      error
    );
    return {
      url,
      errors: 0,
      warnings: 0,
      notices: 0,
      total: 0,
      error: error.message,
    };
  }
}

// Main function to run Pa11y checks
async function runPa11yChecks() {
  const urls = process.argv.length > 2 ? [process.argv[2]] : config.urls;

  if (!urls || urls.length === 0) {
    console.error(
      chalk.red(
        'No URLs specified. Please add URLs to config.js or provide a URL as a command line argument.'
      )
    );
    process.exit(1);
  }

  console.log(
    chalk.blue(
      `Starting Pa11y accessibility checks for ${urls.length} URL(s)...`
    )
  );

  const results = [];

  for (const url of urls) {
    const result = await checkAccessibilityWithPa11y(url);
    results.push(result);
  }

  // Display summary
  console.log(chalk.blue('\n=== Accessibility Audit Summary ==='));
  console.log(chalk.gray('─'.repeat(100)));
  console.log(
    chalk.yellow(
      'URL'.padEnd(40) +
        'Issues'.padEnd(12) +
        'Errors'.padEnd(12) +
        'Warnings'.padEnd(12) +
        'Notices'
    )
  );
  console.log(chalk.gray('─'.repeat(100)));

  let totalIssues = 0;
  let totalErrors = 0;
  let totalWarnings = 0;
  let totalNotices = 0;

  results.forEach((result) => {
    const url = result.url.padEnd(40).substring(0, 40);

    // Add spaces to the numbers for proper alignment
    const issuesStr =
      result.total > 0
        ? chalk.red(String(result.total).padEnd(12))
        : chalk.green(String(result.total).padEnd(12));

    const errorsStr =
      result.errors > 0
        ? chalk.red(String(result.errors).padEnd(12))
        : chalk.green(String(result.errors).padEnd(12));

    const warningsStr =
      result.warnings > 0
        ? chalk.yellow(String(result.warnings).padEnd(12))
        : chalk.green(String(result.warnings).padEnd(12));

    const noticesStr =
      result.notices > 0
        ? chalk.blue(String(result.notices))
        : chalk.green(String(result.notices));

    console.log(url + issuesStr + errorsStr + warningsStr + noticesStr);

    totalIssues += result.total;
    totalErrors += result.errors;
    totalWarnings += result.warnings;
    totalNotices += result.notices;
  });

  console.log(chalk.gray('─'.repeat(100)));

  // Add spaces to the totals for proper alignment
  const totalIssuesStr =
    totalIssues > 0
      ? chalk.red(String(totalIssues).padEnd(12))
      : chalk.green(String(totalIssues).padEnd(12));

  const totalErrorsStr =
    totalErrors > 0
      ? chalk.red(String(totalErrors).padEnd(12))
      : chalk.green(String(totalErrors).padEnd(12));

  const totalWarningsStr =
    totalWarnings > 0
      ? chalk.yellow(String(totalWarnings).padEnd(12))
      : chalk.green(String(totalWarnings).padEnd(12));

  const totalNoticesStr =
    totalNotices > 0
      ? chalk.blue(String(totalNotices))
      : chalk.green(String(totalNotices));

  console.log(
    'TOTAL'.padEnd(40) +
      totalIssuesStr +
      totalErrorsStr +
      totalWarningsStr +
      totalNoticesStr
  );

  console.log(chalk.gray('─'.repeat(100)));

  // Add a legend for the issue categories
  console.log('\n' + chalk.bold('Issue Categories:'));
  console.log(
    chalk.red('Errors') +
      ' - These are critical issues that fail WCAG compliance'
  );
  console.log(
    chalk.yellow('Warnings') +
      ' - These are potential issues that should be reviewed'
  );
  console.log(
    chalk.blue('Notices') +
      ' - These are informational items that may be worth checking'
  );

  console.log(chalk.green('\nAll Pa11y accessibility checks completed!'));

  // Exit with error code if issues found
  if (totalErrors > 0) {
    process.exit(1);
  }
}

// Run the checks
runPa11yChecks().catch((error) => {
  console.error(chalk.red('Error running Pa11y checks:'), error);
  process.exit(1);
});

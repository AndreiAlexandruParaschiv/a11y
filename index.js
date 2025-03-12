import puppeteer from 'puppeteer';
import axeCore from 'axe-core';
import chalk from 'chalk';
import { createObjectCsvWriter } from 'csv-writer';
import fs from 'fs';
import path from 'path';
import config from './config.js';

// Function to ensure directory exists
function ensureDirectoryExists(directory) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

// Function to create a timeout promise
function timeout(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Function to run axe-core with consistent settings
async function runAxeAnalysis(page) {
  // Inject axe-core
  await page.evaluate(axeCore.source);

  // Run axe with consistent configuration
  return await Promise.race([
    page.evaluate(async (axeConfig) => {
      // Set a consistent seed for randomization to ensure consistent results
      if (window.axe && window.axe.configure) {
        window.axe.configure({
          branding: {
            application: 'a11y-audit-tool',
          },
          ...axeConfig,
        });
      }

      // Wait for any animations to complete
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Run the analysis
      return await axe.run(document, axeConfig);
    }, config.axeConfig),
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error('Axe analysis timeout')),
        config.axeConfig.timeout || 60000
      )
    ),
  ]);
}

// Function to check accessibility for a single URL
async function checkAccessibility(url) {
  let browser = null;

  // Extract website name from URL
  const websiteName = new URL(url).hostname.replace(/[^a-zA-Z0-9]/g, '-');

  console.log(chalk.blue(`\nStarting accessibility check for ${url}`));

  try {
    // Launch browser with configurations from config
    browser = await puppeteer.launch(config.browser);

    const page = await browser.newPage();

    // Set timeouts and viewport
    await page.setDefaultNavigationTimeout(config.navigation.timeout);
    await page.setDefaultTimeout(config.navigation.timeout);
    await page.setViewport(config.browser.defaultViewport);

    // Enable request interception to optimize loading
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      // Skip non-essential resources
      const resourceType = request.resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
        request.abort();
      } else {
        request.continue();
      }
    });

    console.log(chalk.yellow('Navigating to page...'));

    // Navigate to URL with custom waiting strategy
    await page.goto(url, config.navigation);

    // Wait for the body to be present
    await page.waitForSelector('body', { timeout: config.navigation.timeout });

    // Wait additional time for page to stabilize (helps with consistency)
    await timeout(2000);

    console.log(chalk.yellow('Page loaded, running accessibility checks...'));

    // Run axe-core analysis with consistent settings
    const results = await runAxeAnalysis(page);

    // Categorize violations by impact level
    const violationsByCategory = {
      critical: 0,
      serious: 0,
    };

    // Count violations by category
    results.violations.forEach((violation) => {
      if (violationsByCategory.hasOwnProperty(violation.impact)) {
        violationsByCategory[violation.impact]++;
      }
    });

    // Store violation descriptions for the summary
    const violationDescriptions = results.violations.map((v) => v.help);

    // Categorize violations by WCAG criteria
    const violationsByWCAG = {};
    results.violations.forEach((violation) => {
      const wcagTags = violation.tags.filter((tag) => tag.includes('wcag'));
      wcagTags.forEach((tag) => {
        if (!violationsByWCAG[tag]) {
          violationsByWCAG[tag] = 0;
        }
        violationsByWCAG[tag]++;
      });
    });

    // Create timestamp for the filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = path.join(
      config.output.directory,
      `${websiteName}-accessibility-report-${timestamp}.csv`
    );

    // Configure CSV writer for violations
    const csvWriter = createObjectCsvWriter({
      path: filename,
      header: [
        { id: 'type', title: 'Type' },
        { id: 'impact', title: 'Impact' },
        { id: 'description', title: 'Description' },
        { id: 'help', title: 'Help Text' },
        { id: 'helpUrl', title: 'Help URL' },
        { id: 'id', title: 'Rule ID' },
        { id: 'wcag', title: 'WCAG' },
        { id: 'element', title: 'Element' },
        { id: 'failure', title: 'Failure Summary' },
      ],
    });

    // Prepare data for CSV
    const csvData = [];

    // Add violations
    results.violations.forEach((violation) => {
      const wcagTags = violation.tags.filter((tag) => tag.includes('wcag'));
      const wcagString = wcagTags.join(', ');

      violation.nodes.forEach((node) => {
        csvData.push({
          type: 'Violation',
          impact: violation.impact,
          description: violation.description,
          help: violation.help,
          helpUrl: violation.helpUrl,
          id: violation.id,
          wcag: wcagString,
          element: node.html,
          failure: node.failureSummary || '',
        });
      });
    });

    // Add incomplete checks if configured
    if (config.output.includeIncompleteTests) {
      results.incomplete.forEach((check) => {
        const wcagTags = check.tags.filter((tag) => tag.includes('wcag'));
        const wcagString = wcagTags.join(', ');

        check.nodes.forEach((node) => {
          csvData.push({
            type: 'Needs Review',
            impact: check.impact || 'unknown',
            description: check.description,
            help: check.help || '',
            helpUrl: check.helpUrl || '',
            id: check.id || '',
            wcag: wcagString,
            element: node.html,
            failure: node.failureSummary || '',
          });
        });
      });
    }

    // Write to CSV file
    await csvWriter.writeRecords(csvData);

    // Process and display results
    console.log('\n' + chalk.bold('Accessibility Check Results:'));

    if (results.violations.length === 0) {
      console.log(chalk.green('\n✓ No accessibility violations found!'));
    } else {
      console.log(
        chalk.red(
          `\n✗ Found ${results.violations.length} accessibility violations:`
        )
      );

      // Display summary of violations by category
      console.log('\n' + chalk.bold('Violations by Impact:'));
      console.log(chalk.red(`Critical: ${violationsByCategory.critical || 0}`));
      console.log(
        chalk.yellow(`Serious: ${violationsByCategory.serious || 0}`)
      );

      console.log('\n' + chalk.bold('Detailed Violations:'));
      results.violations.forEach((violation, index) => {
        // Add a separator line before each violation except the first one
        if (index > 0) {
          console.log('\n' + chalk.gray('─'.repeat(80)) + '\n');
        }

        // Color-code the impact level
        let impactColor;
        switch (violation.impact) {
          case 'critical':
            impactColor = chalk.red;
            break;
          case 'serious':
            impactColor = chalk.yellow;
            break;
          default:
            impactColor = chalk.gray;
        }

        console.log(
          chalk.yellow(`${index + 1}. ${violation.help} (${violation.id})`)
        );
        console.log(impactColor(`Impact: ${violation.impact}`));
        console.log(
          chalk.gray(
            `WCAG: ${violation.tags
              .filter((tag) => tag.includes('wcag'))
              .join(', ')}`
          )
        );
        console.log('Description:', violation.description);
        if (violation.helpUrl) {
          console.log(chalk.blue('More info:', violation.helpUrl));
        }
        console.log('\nElements affected:');

        violation.nodes.forEach((node, nodeIndex) => {
          // Add spacing between elements within the same violation
          if (nodeIndex > 0) {
            console.log('');
          }
          console.log(chalk.gray(`- ${node.html}`));
          if (node.failureSummary) {
            console.log(
              chalk.red(`  ${node.failureSummary.split('\n').join('\n  ')}`)
            );
          }
        });
      });
    }

    // Display passes
    console.log('\n' + chalk.gray('─'.repeat(80)) + '\n');
    console.log(
      chalk.green(`✓ Passed ${results.passes.length} accessibility checks`)
    );

    // Display incomplete results if any
    if (results.incomplete.length > 0) {
      console.log('\n' + chalk.gray('─'.repeat(80)) + '\n');
      console.log(
        chalk.yellow(`! ${results.incomplete.length} checks need review:`)
      );
      results.incomplete.forEach((check, index) => {
        if (index > 0) console.log('');
        console.log(`- ${check.description}`);
      });
    }

    console.log('\n' + chalk.gray('─'.repeat(80)));
    console.log(chalk.green(`\nResults have been saved to: ${filename}`));

    return {
      url,
      violations: results.violations.length,
      passes: results.passes.length,
      incomplete: results.incomplete.length,
      filename,
      violationsByCategory,
      violationsByWCAG,
      violationDescriptions,
    };
  } catch (error) {
    console.error(chalk.red(`\nError during accessibility check for ${url}:`));
    if (error.name === 'TimeoutError') {
      console.error(
        chalk.yellow('The page took too long to load. Try the following:')
      );
      console.error('1. Check your internet connection');
      console.error('2. Verify the website is accessible');
      console.error('3. Try running the check again');
      console.error(
        '4. If the issue persists, try increasing the timeout values in the config'
      );
    } else {
      console.error(error);
    }

    return {
      url,
      error: error.message,
    };
  } finally {
    // Ensure browser is always closed
    if (browser) {
      await browser.close();
    }
  }
}

// Main function to run accessibility checks on all URLs
async function runAccessibilityChecks() {
  // Create results directory if it doesn't exist
  ensureDirectoryExists(config.output.directory);

  console.log(
    chalk.blue(`Starting accessibility checks for ${config.urls.length} URLs`)
  );

  const summary = [];

  // Process each URL
  for (const url of config.urls) {
    const result = await checkAccessibility(url);
    summary.push(result);
  }

  // Display summary of all checks
  console.log('\n' + chalk.bold('Accessibility Audit Summary:'));
  console.log(chalk.gray('─'.repeat(100)));
  console.log(
    chalk.yellow(
      'URL'.padEnd(40) +
        'Status'.padEnd(12) +
        'Violations'.padEnd(12) +
        'Critical'.padEnd(12) +
        'Serious'.padEnd(12) +
        'Needs Review'
    )
  );
  console.log(chalk.gray('─'.repeat(100)));

  summary.forEach((result) => {
    if (result.error) {
      console.log(
        result.url.padEnd(40) +
          chalk.red('Error'.padEnd(12)) +
          'N/A'.padEnd(12) +
          'N/A'.padEnd(12) +
          'N/A'.padEnd(12) +
          'N/A'
      );
    } else {
      console.log(
        result.url.padEnd(40) +
          chalk.green('Success'.padEnd(12)) +
          (result.violations > 0
            ? chalk.red(String(result.violations).padEnd(12))
            : chalk.green(String(result.violations).padEnd(12))) +
          (result.violationsByCategory.critical > 0
            ? chalk.red(String(result.violationsByCategory.critical).padEnd(12))
            : chalk.green(
                String(result.violationsByCategory.critical || 0).padEnd(12)
              )) +
          (result.violationsByCategory.serious > 0
            ? chalk.yellow(
                String(result.violationsByCategory.serious).padEnd(12)
              )
            : chalk.green(
                String(result.violationsByCategory.serious || 0).padEnd(12)
              )) +
          chalk.yellow(String(result.incomplete))
      );
    }
  });

  console.log(chalk.gray('─'.repeat(100)));

  // Add a legend for the violation categories
  console.log('\n' + chalk.bold('Violation Categories:'));
  console.log(
    chalk.red('Critical') +
      ' - These issues have a severe impact on users with disabilities'
  );
  console.log(
    chalk.yellow('Serious') +
      ' - These issues have a significant impact on users with disabilities'
  );

  console.log(chalk.green('\nAll accessibility checks completed!'));
}

// Check if URLs are provided in config, otherwise use command line argument
if (process.argv.length > 2) {
  // If URL is provided as command line argument, run single check
  const url = process.argv[2];
  config.urls = [url];
  runAccessibilityChecks().then(() => process.exit(0));
} else if (config.urls && config.urls.length > 0) {
  // Run checks for all URLs in config
  runAccessibilityChecks().then(() => process.exit(0));
} else {
  console.error(
    chalk.red(
      'No URLs provided. Please add URLs to config.js or provide a URL as a command line argument.'
    )
  );
  console.log('Usage: npm run check -- https://example.com');
  process.exit(1);
}

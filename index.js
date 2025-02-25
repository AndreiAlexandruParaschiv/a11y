import puppeteer from 'puppeteer';
import axeCore from 'axe-core';
import chalk from 'chalk';
import { createObjectCsvWriter } from 'csv-writer';
import fs from 'fs';

async function checkAccessibility(url) {
    let browser = null;

    if (!url) {
        console.error(chalk.red('Please provide a URL as an argument'));
        console.log('Usage: npm run check -- https://example.com');
        process.exit(1);
    }

    // Create results directory if it doesn't exist
    if (!fs.existsSync('results')) {
        fs.mkdirSync('results');
    }

    // Extract website name from URL
    const websiteName = new URL(url).hostname.replace(/[^a-zA-Z0-9]/g, '-');

    console.log(chalk.blue(`Starting accessibility check for ${url}`));

    try {
        // Launch browser with additional configurations
        browser = await puppeteer.launch({
            headless: "new",
            args: [
                '--disable-gpu',
                '--disable-dev-shm-usage',
                '--disable-setuid-sandbox',
                '--no-sandbox',
            ]
        });

        const page = await browser.newPage();

        // Set longer timeout and larger viewport
        await page.setDefaultNavigationTimeout(60000); // 60 seconds
        await page.setDefaultTimeout(60000);
        await page.setViewport({ width: 1920, height: 1080 });

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
        await page.goto(url, {
            waitUntil: ['domcontentloaded', 'networkidle2'],
            timeout: 60000
        });

        // Wait for the body to be present
        await page.waitForSelector('body', { timeout: 60000 });

        console.log(chalk.yellow('Page loaded, running accessibility checks...'));

        // Inject and run axe-core with timeout handling
        await page.evaluate(axeCore.source);
        const results = await Promise.race([
            page.evaluate(async () => {
                return await axe.run(document, {
                    runOnly: {
                        type: 'tag',
                        values: ['wcag2a', 'wcag2aa', 'wcag2aaa', 'wcag21a', 'wcag21aa', 'wcag22aa']
                    }
                });
            }),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Axe analysis timeout')), 60000)
            )
        ]);

        // Create timestamp for the filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `results/${websiteName}-accessibility-report-${timestamp}.csv`;

        // Configure CSV writer for violations
        const csvWriter = createObjectCsvWriter({
            path: filename,
            header: [
                { id: 'type', title: 'Type' },
                { id: 'impact', title: 'Impact' },
                { id: 'description', title: 'Description' },
                { id: 'wcag', title: 'WCAG' },
                { id: 'element', title: 'Element' },
                { id: 'failure', title: 'Failure Summary' }
            ]
        });

        // Prepare data for CSV
        const csvData = [];

        // Add violations
        results.violations.forEach(violation => {
            violation.nodes.forEach(node => {
                csvData.push({
                    type: 'Violation',
                    impact: violation.impact,
                    description: violation.description,
                    wcag: violation.tags.filter(tag => tag.includes('wcag')).join(', '),
                    element: node.html,
                    failure: node.failureSummary || ''
                });
            });
        });

        // Add passes
        results.passes.forEach(pass => {
            pass.nodes.forEach(node => {
                csvData.push({
                    type: 'Pass',
                    impact: 'none',
                    description: pass.description,
                    wcag: pass.tags.filter(tag => tag.includes('wcag')).join(', '),
                    element: node.html,
                    failure: ''
                });
            });
        });

        // Add incomplete checks
        results.incomplete.forEach(check => {
            check.nodes.forEach(node => {
                csvData.push({
                    type: 'Needs Review',
                    impact: check.impact || 'unknown',
                    description: check.description,
                    wcag: check.tags.filter(tag => tag.includes('wcag')).join(', '),
                    element: node.html,
                    failure: node.failureSummary || ''
                });
            });
        });

        // Write to CSV file
        await csvWriter.writeRecords(csvData);

        // Process and display results
        console.log('\n' + chalk.bold('Accessibility Check Results:'));

        if (results.violations.length === 0) {
            console.log(chalk.green('\n✓ No accessibility violations found!'));
        } else {
            console.log(chalk.red(`\n✗ Found ${results.violations.length} accessibility violations:`));

            results.violations.forEach((violation, index) => {
                console.log(chalk.yellow(`\n${index + 1}. ${violation.help} (${violation.id})`));
                console.log(chalk.gray(`Impact: ${violation.impact}`));
                console.log(chalk.gray(`WCAG: ${violation.tags.filter(tag => tag.includes('wcag')).join(', ')}`));
                console.log('Description:', violation.description);
                console.log('Elements affected:');
                violation.nodes.forEach(node => {
                    console.log(chalk.gray(`- ${node.html}`));
                    if (node.failureSummary) {
                        console.log(chalk.red(`  ${node.failureSummary}`));
                    }
                });
            });
        }

        // Display passes
        console.log(chalk.green(`\n✓ Passed ${results.passes.length} accessibility checks`));

        // Display incomplete results if any
        if (results.incomplete.length > 0) {
            console.log(chalk.yellow(`\n! ${results.incomplete.length} checks need review:`));
            results.incomplete.forEach(check => {
                console.log(`- ${check.description}`);
            });
        }

        console.log(chalk.green(`\nResults have been saved to: ${filename}`));

    } catch (error) {
        console.error(chalk.red('\nError during accessibility check:'));
        if (error.name === 'TimeoutError') {
            console.error(chalk.yellow('The page took too long to load. Try the following:'));
            console.error('1. Check your internet connection');
            console.error('2. Verify the website is accessible');
            console.error('3. Try running the check again');
            console.error('4. If the issue persists, try increasing the timeout values in the script');
        } else {
            console.error(error);
        }
        process.exit(1);
    } finally {
        // Ensure browser is always closed
        if (browser) {
            await browser.close();
        }
        // Explicitly exit the process
        process.exit(0);
    }
}

// Get URL from command line arguments
const url = process.argv[2];
checkAccessibility(url);

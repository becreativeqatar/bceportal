#!/usr/bin/env tsx

/**
 * Quick Test Runner
 * Runs only the most important tests for quick verification
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function runQuickTests() {
  console.log('🚀 Running Quick Test Suite\n');

  const tests = [
    {
      name: 'Security Tests',
      command: 'npm run test:security',
    },
    {
      name: 'API Tests',
      command: 'npm run test:api',
    },
  ];

  let allPassed = true;

  for (const test of tests) {
    console.log(`📋 ${test.name}...`);
    try {
      await execAsync(test.command, {
        env: { ...process.env, NODE_ENV: 'test' },
      });
      console.log(`✅ ${test.name} - PASSED\n`);
    } catch (error: any) {
      // Command may exit with non-zero even if tests pass
      // Check the actual test results in output
      const output = error.stdout || '';
      const stderr = error.stderr || '';

      // Look for Jest summary line
      const testsPassed = output.match(/Tests:\s+(\d+)\s+passed/);
      const testsFailed = output.match(/(\d+)\s+failed/);
      const hasFail = output.includes('FAIL ') || stderr.includes('FAIL ');

      if (testsPassed && !testsFailed && !hasFail) {
        console.log(`✅ ${test.name} - PASSED (${testsPassed[1]} tests)\n`);
      } else {
        console.log(`❌ ${test.name} - FAILED\n`);
        console.log(output);
        if (stderr) console.log(stderr);
        allPassed = false;
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    console.log('✅ All quick tests passed!');
    console.log('Run "npm run test:coverage" for detailed coverage report.');
  } else {
    console.log('❌ Some tests failed. Run tests individually for details.');
    process.exit(1);
  }
}

runQuickTests();

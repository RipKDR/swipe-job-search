/**
 * Smoke tests for the job aggregator.
 * Run: node test.js
 *
 * Tests the utility modules without external dependencies.
 * Scrapers are tested via `node index.js --run <name>`.
 */

const { createJob, normalizeUrl, jobIdFromUrl, inferCategory, parseSalary, inferWorkType } = require('./utils/schema');
const { deduplicateJobs } = require('./utils/dedup');
const { enrichJob, SUBURB_COORDS } = require('./utils/geocode');

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.log(`  ✗ ${name}`);
    failed++;
  }
}

function assertEq(actual, expected, name) {
  const pass = actual === expected;
  if (!pass) {
    console.log(`  ✗ ${name} — expected "${expected}", got "${actual}"`);
  } else {
    console.log(`  ✓ ${name}`);
  }
  if (pass) passed++; else failed++;
}

// ── Schema Tests ──────────────────────────────────────────
console.log('\n=== Schema ===');

const job = createJob({
  source: 'seek',
  title: 'Software Engineer',
  company: 'Acme Corp',
  url: 'https://www.seek.com.au/job/123?utm_source=test&ref=home',
});

assertEq(job.source, 'seek', 'source field');
assertEq(job.title, 'Software Engineer', 'title field');
assertEq(job.company, 'Acme Corp', 'company field');
assert(job.id, 'id is generated');
assert(job.scrapedAt, 'scrapedAt is set');
assertEq(job.category, 'Other', 'category defaults to Other when not passed');
assertEq(inferCategory('Software Engineer', ''), 'IT', 'inferCategory works separately');

// ── URL Normalization ─────────────────────────────────────
console.log('\n=== URL Normalization ===');

const n1 = normalizeUrl('https://www.seek.com.au/job/123?utm_source=seek&ref=home&fbclid=abc');
assertEq(n1, 'https://www.seek.com.au/job/123', 'tracking params removed');

const n2 = normalizeUrl('HTTPS://WWW.SEEK.COM.AU/JOB/123/');
assertEq(n2, 'https://www.seek.com.au/job/123', 'lowercase + trailing slash');

const n3 = normalizeUrl('https://example.com/page#section');
assert(n3 && !n3.includes('#'), 'fragment removed');

// ── Category Inference ────────────────────────────────────
console.log('\n=== Category Inference ===');

assertEq(inferCategory('Senior Python Developer', ''), 'IT', 'developer → IT');
assertEq(inferCategory('Head Chef', ''), 'Hospitality', 'chef → Hospitality');
assertEq(inferCategory('Retail Sales Assistant', ''), 'Retail', 'retail → Retail');
assertEq(inferCategory('Office Administrator', ''), 'Admin', 'admin → Admin');
assertEq(inferCategory('Dog Walker', ''), 'Other', 'unknown → Other');

// ── Salary Parsing ────────────────────────────────────────
console.log('\n=== Salary Parsing ===');

const s1 = parseSalary('$80,000 - $100,000 per annum');
assertEq(s1.salaryMin, 80000, 'salary min');
assertEq(s1.salaryMax, 100000, 'salary max');

const s2 = parseSalary('$35/hr');
assertEq(s2.salaryMin, 35, 'hourly rate');

const s3 = parseSalary('$70k-90k');
assertEq(s3.salaryMin, 70000, 'k shorthand min');
assertEq(s3.salaryMax, 90000, 'k shorthand max');

const s4 = parseSalary('Competitive salary');
assertEq(s4.salaryMin, null, 'no salary → null');

// ── Work Type Inference ───────────────────────────────────
console.log('\n=== Work Type Inference ===');

assertEq(inferWorkType('Full Time Developer'), 'full-time', 'full-time');
assertEq(inferWorkType('Part-time Receptionist'), 'part-time', 'part-time');
assertEq(inferWorkType('Casual Retail Assistant'), 'casual', 'casual');
assertEq(inferWorkType('Contract Data Analyst'), 'contract', 'contract');
assertEq(inferWorkType('Developer'), 'unknown', 'unknown default');

// ── Deduplication ─────────────────────────────────────────
console.log('\n=== Deduplication ===');

const dedupJobs = [
  createJob({ source: 'seek', title: 'Job A', url: 'https://seek.com.au/job/1' }),
  createJob({ source: 'seek', title: 'Job A', url: 'https://seek.com.au/job/1' }), // duplicate
  createJob({ source: 'gumtree', title: 'Job B', url: 'https://gumtree.com.au/ad/2' }),
  createJob({ source: 'seek', title: 'Job C', url: 'https://seek.com.au/job/3' }),
];

(async () => {
  const unique = await deduplicateJobs(dedupJobs, { checkFirebase: false });
  assertEq(unique.length, 3, 'dedup removes exact URL duplicates');
})();

// ── Geocoding ─────────────────────────────────────────────
console.log('\n=== Geocoding ===');

assert(SUBURB_COORDS['melbourne'], 'melbourne coords exist');
assert(SUBURB_COORDS['richmond'], 'richmond coords exist');
assert(SUBURB_COORDS['st kilda'], 'st kilda coords exist');

(async () => {
  const geoJob = await enrichJob(createJob({
    source: 'test',
    title: 'Test Job',
    suburb: 'Richmond',
    postcode: '3121',
  }));
  assertEq(geoJob.latitude, -37.8130, 'richmond latitude');
  assertEq(geoJob.longitude, 144.9980, 'richmond longitude');
})();

// ── Job ID Determinism ────────────────────────────────────
console.log('\n=== Job ID ===');

const id1 = jobIdFromUrl('seek', 'https://seek.com.au/job/1');
const id2 = jobIdFromUrl('seek', 'https://seek.com.au/job/1');
const id3 = jobIdFromUrl('gumtree', 'https://seek.com.au/job/1');
assertEq(id1, id2, 'same input → same ID');
assert(id1 !== id3, 'different source → different ID');

// ── Summary ───────────────────────────────────────────────
setTimeout(() => {
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}, 1000);

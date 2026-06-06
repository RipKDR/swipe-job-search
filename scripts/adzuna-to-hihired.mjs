#!/usr/bin/env node
/**
 * Fetch Melbourne casual jobs from Adzuna and transform them
 * for the Hi-Hired jobs table.
 *
 * Usage: node scripts/adzuna-to-hihired.mjs
 *
 * Output: SQL INSERT statements for the Hi-Hired public.jobs table.
 * Run the output in Supabase SQL Editor.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';

// Read Adzuna keys
const env = readFileSync('services/job-aggregator/.env', 'utf8');
const adzunaAppId = env.match(/ADZUNA_APP_ID=(.+)/)?.[1]?.trim();
const adzunaAppKey = env.match(/ADZUNA_APP_KEY=(.+)/)?.[1]?.trim();

// Hi-Hired app Supabase
const SUPABASE_URL = 'https://rwzzdsiawcovyfsnmiiy.supabase.co';
const SUPABASE_KEY = 'sb_publishable_QuZxwxnKGlg6Bw8JqMd50A_cDXljeaN';

// Melbourne suburbs coordinates for geocoding
const SUBURB_COORDS = {
  'melbourne': [-37.8136, 144.9631],
  'fitzroy': [-37.7985, 144.9786],
  'carlton': [-37.8002, 144.9708],
  'brunswick': [-37.7669, 144.9632],
  'brunswick east': [-37.7726, 144.9819],
  'richmond': [-37.8254, 145.0012],
  'south yarra': [-37.8385, 144.9941],
  'st kilda': [-37.8676, 144.9806],
  'collingwood': [-37.7993, 144.9842],
  'footscray': [-37.8003, 144.8997],
  'fitzroy north': [-37.7880, 144.9780],
  'northcote': [-37.7707, 144.9993],
  'thornbury': [-37.7589, 145.0004],
  'preston': [-37.7449, 145.0065],
  'coburg': [-37.7439, 144.9644],
  'essendon': [-37.7533, 144.9151],
  'moonee ponds': [-37.7644, 144.9187],
  'tullamarine': [-37.7063, 144.8815],
  'airport west': [-37.7110, 144.8870],
  'kensington': [-37.7934, 144.9310],
  'west melbourne': [-37.8079, 144.9470],
  'docklands': [-37.8145, 144.9460],
  'port melbourne': [-37.8281, 144.9395],
  'south melbourne': [-37.8328, 144.9587],
  'albert park': [-37.8402, 144.9588],
  'middle park': [-37.8513, 144.9658],
  'toorak': [-37.8417, 145.0126],
  'hawthorn': [-37.8223, 145.0354],
  'kew': [-37.8062, 145.0303],
  'balwyn': [-37.8127, 145.0758],
  'box hill': [-37.8189, 145.1253],
  'doncaster': [-37.7846, 145.1253],
  'glen waverley': [-37.8779, 145.1634],
  'chadstone': [-37.8876, 145.0919],
  'oakleigh': [-37.9009, 145.0916],
  'caulfield': [-37.8774, 145.0239],
  'elsternwick': [-37.8856, 145.0113],
  'brighton': [-37.9058, 144.9969],
  'hampton': [-37.9360, 145.0024],
  'sandringham': [-37.9508, 145.0023],
  'werribee': [-37.9017, 144.6597],
  'hoppers crossing': [-37.8825, 144.7030],
  'point cook': [-37.9146, 144.7539],
  'tarneit': [-37.8429, 144.6961],
  'sunshine': [-37.7880, 144.8320],
  'deer park': [-37.7739, 144.7754],
  'frankston': [-38.1440, 145.1253],
  'dandenong': [-37.9891, 145.2108],
  'springvale': [-37.9498, 145.1527],
  'noble park': [-37.9665, 145.1758],
  'ringwood': [-37.8173, 145.2292],
  'croydon': [-37.7970, 145.2855],
  'lilydale': [-37.7578, 145.3483],
};

function normalizeSuburb(text) {
  if (!text) return 'Melbourne';
  const lower = text.toLowerCase().trim();
  // Direct match
  if (SUBURB_COORDS[lower]) {
    return lower.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
  }
  // Partial match
  for (const [key] of Object.entries(SUBURB_COORDS)) {
    if (lower.includes(key)) {
      return key.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
    }
  }
  return 'Melbourne';
}

function getCoords(suburb) {
  const key = suburb.toLowerCase();
  for (const [sub, coords] of Object.entries(SUBURB_COORDS)) {
    if (key.includes(sub)) return coords;
  }
  return null;
}

function isCasualOrPartTime(job) {
  const title = (job.title || '').toLowerCase();
  const desc = (job.description || '').toLowerCase();
  const text = title + ' ' + desc;

  // Skip senior/exec roles
  if (text.includes('senior ') || text.includes('manager ') || text.includes('director ') || text.includes('head of ')) {
    return false;
  }

  const casualKeywords = ['casual', 'weekend', 'shift', 'temporary', 'temp', 'part-time', 'part time', 'evening', 'morning', 'flexible hours', 'hourly'];
  const hasKeyword = casualKeywords.some(k => text.includes(k));

  // Include if work type is casual/part-time or keywords match
  return job.workType === 'part-time' || job.workType === 'casual' || hasKeyword;
}

async function fetchAdzunaJobs() {
  const axios = (await import('axios')).default;
  const allJobs = [];
  const maxPages = 5;

  for (let page = 1; page <= maxPages; page++) {
    const resp = await axios.get(`https://api.adzuna.com/v1/api/jobs/au/search/${page}`, {
      params: {
        app_id: adzunaAppId,
        app_key: adzunaAppKey,
        results_per_page: 50,
        where: 'Melbourne',
        sort_by: 'date',
        max_days_old: 14,
      },
      timeout: 15000,
    });

    const results = resp.data.results || [];
    for (const item of results) {
      const title = item.title || '';
      const description = (item.description || '').replace(/<[^>]*>/g, ' ').slice(0, 1000);

      const salaryMin = item.salary_min || 0;
      const salaryMax = item.salary_max || 0;
      const salaryAvg = salaryMax > 0 ? (salaryMin + salaryMax) / 2 : salaryMin;

      // Determine pay display
      let payDisplay = '';
      let payAmount = 0;
      let payPeriod = 'hour';

      if (salaryAvg > 50000) {
        // Annual salary
        payDisplay = `$${Math.round(salaryAvg / 1000)}k/year`;
        payAmount = salaryAvg;
        payPeriod = 'year';
      } else if (salaryAvg > 500) {
        // Weekly
        payDisplay = `$${Math.round(salaryAvg / 52)}/week`;
        payAmount = Math.round(salaryAvg / 52);
        payPeriod = 'week';
      } else if (salaryAvg > 0) {
        // Hourly
        payDisplay = `$${Math.round(salaryAvg)}/hr`;
        payAmount = Math.round(salaryAvg);
        payPeriod = 'hour';
      }

      const rawLocation = item.location?.area?.[item.location.area.length - 1] || '';
      const suburb = normalizeSuburb(rawLocation);

      allJobs.push({
        title,
        company: item.company?.display_name || '',
        description,
        suburb,
        payDisplay,
        payAmount,
        payPeriod,
        jobType: isCasualOrPartTime({ title, description, workType: item.contract_time }) ? 'casual' : 'casual',
        url: item.redirect_url,
      });
    }

    await new Promise(r => setTimeout(r, 500));
  }

  return allJobs;
}

async function main() {
  console.log('Fetching Adzuna jobs...');
  const jobs = await fetchAdzunaJobs();
  console.log(`Fetched ${jobs.length} jobs`);

  // Filter to casual/PT roles with hourly or weekly pay
  const filtered = jobs.filter(j => j.payPeriod === 'hour' || j.payPeriod === 'week')
    .filter(j => j.payAmount > 15) // Minimum wage sanity check
    .slice(0, 50); // Max 50 jobs for the seed

  console.log(`Filtered to ${filtered.length} casual/PT roles`);

  // Now sign in as each employer and insert
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Get the default circle
  const { data: circles } = await supabase
    .from('circles')
    .select('id')
    .eq('is_default', true)
    .limit(1);

  if (!circles || circles.length === 0) {
    console.log('No default circle found. Run seed first.');
    return;
  }
  const circleId = circles[0].id;

  // Get employer accounts
  const employers = [
    { email: 'employer.marketlane@hi-hired.demo', password: 'hireme123' },
    { email: 'employer.pasta@hi-hired.demo', password: 'hireme123' },
    { email: 'employer.northside@hi-hired.demo', password: 'hireme123' },
    { email: 'employer.littlelane@hi-hired.demo', password: 'hireme123' },
  ];

  const sqlLines = ['-- Adzuna-imported jobs for Hi-Hired', 'do $$', 'declare', '  v_circle_id uuid;', '  v_emp1_id uuid;', '  v_emp2_id uuid;', '  v_emp3_id uuid;', '  v_emp4_id uuid;', 'begin', '  select id into v_circle_id from circles where is_default = true limit 1;'];

  for (const emp of employers) {
    const varName = emp.email.includes('marketlane') ? 'v_emp1_id' :
      emp.email.includes('pasta') ? 'v_emp2_id' :
      emp.email.includes('northside') ? 'v_emp3_id' : 'v_emp4_id';
    sqlLines.push(`  select id into ${varName} from profiles where email = '${emp.email}' limit 1;`);
  }

  sqlLines.push('');
  sqlLines.push('  insert into jobs (employer_id, circle_id, title, job_type, pay_display, pay_amount, pay_period, hours_text, suburb, description, status, expires_at) values');

  const values = [];
  const empVars = ['v_emp1_id', 'v_emp2_id', 'v_emp3_id', 'v_emp4_id'];

  filtered.forEach((job, idx) => {
    const empVar = empVars[idx % empVars.length];
    const desc = (job.description || '').replace(/'/g, "''").slice(0, 300);
    const suburb = job.suburb || 'Melbourne';
    const payDisplay = job.payDisplay || '$30/hr';
    const payAmount = job.payAmount || 30;
    const payPeriod = job.payPeriod || 'hour';
    const hoursText = 'Various shifts';
    const title = (job.title || 'Casual Worker').replace(/'/g, "''");

    values.push(`    (${empVar}, v_circle_id, '${title}', 'casual', '${payDisplay}', ${payAmount}, '${payPeriod}', '${hoursText}', '${suburb}', '${desc}', 'active', now() + interval '30 days')`);
  });

  sqlLines.push(values.join(',\n') + ';');
  sqlLines.push('  raise notice \'Adzuna seed complete: % jobs\', (select count(*) from jobs);');
  sqlLines.push('end $$;');
  sqlLines.push('');

  writeFileSync('scripts/adzuna-import.sql', sqlLines.join('\n'));
  console.log(`Written scripts/adzuna-import.sql (${filtered.length} jobs)`);
  console.log('Run in Supabase SQL Editor:');
  console.log('  Paste scripts/adzuna-import.sql into Dashboard > SQL Editor');
}

main().catch(console.error);

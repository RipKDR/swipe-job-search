/**
 * Geocoding utility for Melbourne suburbs.
 * Uses a local lookup table for inner Melbourne postcodes (3000-3200),
 * falls back to Nominatim for unknown suburbs.
 */

const axios = require('axios');
const config = require('../config');
const { createLogger } = require('./logger');

const log = createLogger('geocode');

// ── Local Melbourne suburb coordinates (3000-3200) ──────────
// Covers CBD, inner north, inner east, inner south, and some western suburbs.
const SUBURB_COORDS = {
  'melbourne': { lat: -37.8136, lng: 144.9631, postcode: '3000' },
  'melbourne cbd': { lat: -37.8136, lng: 144.9631, postcode: '3000' },
  'east melbourne': { lat: -37.8130, lng: 144.9850, postcode: '3002' },
  'west melbourne': { lat: -37.8090, lng: 144.9400, postcode: '3003' },
  'north melbourne': { lat: -37.7990, lng: 144.9440, postcode: '3051' },
  'south wharf': { lat: -37.8220, lng: 144.9530, postcode: '3006' },
  'southbank': { lat: -37.8230, lng: 144.9640, postcode: '3006' },
  'docklands': { lat: -37.8160, lng: 144.9470, postcode: '3008' },
  'carlton': { lat: -37.8000, lng: 144.9670, postcode: '3053' },
  'carlton north': { lat: -37.7860, lng: 144.9690, postcode: '3054' },
  'fitzroy': { lat: -37.7990, lng: 144.9780, postcode: '3065' },
  'fitzroy north': { lat: -37.7880, lng: 144.9780, postcode: '3068' },
  'collingwood': { lat: -37.8000, lng: 144.9850, postcode: '3066' },
  'abbotsford': { lat: -37.8020, lng: 144.9930, postcode: '3067' },
  'richmond': { lat: -37.8130, lng: 144.9980, postcode: '3121' },
  'south yarra': { lat: -37.8390, lng: 144.9920, postcode: '3141' },
  'toorak': { lat: -37.8410, lng: 145.0100, postcode: '3142' },
  'hawthorn': { lat: -37.8220, lng: 145.0300, postcode: '3122' },
  'hawthorn east': { lat: -37.8260, lng: 145.0460, postcode: '3123' },
  'kew': { lat: -37.8060, lng: 145.0310, postcode: '3101' },
  'kew east': { lat: -37.8030, lng: 145.0500, postcode: '3102' },
  'preston': { lat: -37.7420, lng: 145.0060, postcode: '3072' },
  'northcote': { lat: -37.7680, lng: 144.9990, postcode: '3070' },
  'thornbury': { lat: -37.7530, lng: 145.0020, postcode: '3071' },
  'fairfield': { lat: -37.7790, lng: 145.0150, postcode: '3078' },
  'alphington': { lat: -37.7760, lng: 145.0260, postcode: '3078' },
  'clifton hill': { lat: -37.7890, lng: 144.9930, postcode: '3068' },
  'heidelberg': { lat: -37.7570, lng: 145.0600, postcode: '3084' },
  'brunswick': { lat: -37.7670, lng: 144.9600, postcode: '3056' },
  'brunswick east': { lat: -37.7610, lng: 144.9710, postcode: '3057' },
  'brunswick west': { lat: -37.7630, lng: 144.9440, postcode: '3055' },
  'coburg': { lat: -37.7440, lng: 144.9650, postcode: '3058' },
  'coburg north': { lat: -37.7330, lng: 144.9650, postcode: '3058' },
  'pascoe vale': { lat: -37.7260, lng: 144.9370, postcode: '3044' },
  'essendon': { lat: -37.7490, lng: 144.9140, postcode: '3040' },
  'moonee ponds': { lat: -37.7600, lng: 144.9230, postcode: '3039' },
  'ascot vale': { lat: -37.7750, lng: 144.9240, postcode: '3032' },
  'flemington': { lat: -37.7830, lng: 144.9260, postcode: '3031' },
  'kensington': { lat: -37.7930, lng: 144.9280, postcode: '3031' },
  'footscray': { lat: -37.8000, lng: 144.9000, postcode: '3011' },
  'seddon': { lat: -37.8060, lng: 144.8910, postcode: '3011' },
  'yarraville': { lat: -37.8130, lng: 144.8860, postcode: '3013' },
  'newport': { lat: -37.8410, lng: 144.8840, postcode: '3015' },
  'williamstown': { lat: -37.8560, lng: 144.8970, postcode: '3016' },
  'st kilda': { lat: -37.8670, lng: 144.9800, postcode: '3182' },
  'st kilda east': { lat: -37.8610, lng: 144.9930, postcode: '3183' },
  'windsor': { lat: -37.8560, lng: 144.9910, postcode: '3181' },
  'prahran': { lat: -37.8500, lng: 144.9940, postcode: '3181' },
  'armadale': { lat: -37.8550, lng: 145.0150, postcode: '3143' },
  'malvern': { lat: -37.8570, lng: 145.0270, postcode: '3144' },
  'malvern east': { lat: -37.8640, lng: 145.0410, postcode: '3145' },
  'glen iris': { lat: -37.8590, lng: 145.0520, postcode: '3146' },
  'caulfield': { lat: -37.8770, lng: 145.0250, postcode: '3162' },
  'caulfield north': { lat: -37.8680, lng: 145.0260, postcode: '3161' },
  'caulfield south': { lat: -37.8860, lng: 145.0250, postcode: '3162' },
  'carnegie': { lat: -37.8860, lng: 145.0550, postcode: '3163' },
  'moorabbin': { lat: -37.9330, lng: 145.0350, postcode: '3189' },
  'cheltenham': { lat: -37.9640, lng: 145.0530, postcode: '3192' },
  'mentone': { lat: -37.9800, lng: 145.0640, postcode: '3194' },
  'mordialloc': { lat: -38.0030, lng: 145.0850, postcode: '3195' },
  'box hill': { lat: -37.8190, lng: 145.1210, postcode: '3128' },
  'blackburn': { lat: -37.8190, lng: 145.1500, postcode: '3130' },
  'ringwood': { lat: -37.8150, lng: 145.2290, postcode: '3134' },
  'clayton': { lat: -37.9240, lng: 145.1200, postcode: '3168' },
  'oakleigh': { lat: -37.8990, lng: 145.0880, postcode: '3166' },
  'dandenong': { lat: -37.9810, lng: 145.2140, postcode: '3175' },
  'frankston': { lat: -38.1440, lng: 145.1230, postcode: '3199' },
  'werribee': { lat: -37.8990, lng: 144.6620, postcode: '3030' },
  'point cook': { lat: -37.9060, lng: 144.7460, postcode: '3030' },
  'sunshine': { lat: -37.7820, lng: 144.8330, postcode: '3020' },
  'st albans': { lat: -37.7450, lng: 144.8010, postcode: '3021' },
  'broadmeadows': { lat: -37.6830, lng: 144.9200, postcode: '3047' },
  'reservoir': { lat: -37.7170, lng: 145.0060, postcode: '3073' },
  'south morang': { lat: -37.6500, lng: 145.0860, postcode: '3752' },
  'eltham': { lat: -37.7140, lng: 145.1460, postcode: '3095' },
  'whittlesea': { lat: -37.5670, lng: 145.1170, postcode: '3757' },
  'melton': { lat: -37.6830, lng: 144.5830, postcode: '3337' },
  'ballarat': { lat: -37.5620, lng: 143.8500, postcode: '3350' },
  'bendigo': { lat: -36.7570, lng: 144.2790, postcode: '3550' },
  'geelong': { lat: -38.1500, lng: 144.3620, postcode: '3220' },
};

// Reverse map: postcode -> canonical suburb name
const POSTCODE_TO_SUBURB = {};
for (const [name, coords] of Object.entries(SUBURB_COORDS)) {
  if (!POSTCODE_TO_SUBURB[coords.postcode]) {
    POSTCODE_TO_SUBURB[coords.postcode] = name;
  }
}

/**
 * Enrich a job with geocoding data.
 * Mutates and returns the job.
 */
async function enrichJob(job) {
  const suburb = (job.suburb || '').toLowerCase().trim();
  const postcode = (job.postcode || '').trim();

  // If already geocoded (e.g. from Adzuna API), skip
  if (job.latitude && job.longitude) return job;

  // Try local lookup by suburb name
  if (suburb && SUBURB_COORDS[suburb]) {
    const coords = SUBURB_COORDS[suburb];
    job.latitude = coords.lat;
    job.longitude = coords.lng;
    if (!job.postcode) job.postcode = coords.postcode;
    return job;
  }

  // Try by postcode
  if (postcode && POSTCODE_TO_SUBURB[postcode]) {
    const suburbName = POSTCODE_TO_SUBURB[postcode];
    const coords = SUBURB_COORDS[suburbName];
    if (coords) {
      job.latitude = coords.lat;
      job.longitude = coords.lng;
      if (!job.suburb) job.suburb = suburbName;
      return job;
    }
  }

  // Fallback: Nominatim (rate-limited, max 1 req/s)
  if (suburb) {
    try {
      const coords = await geocodeNominatim(suburb, postcode);
      if (coords) {
        job.latitude = coords.lat;
        job.longitude = coords.lng;
        if (!job.postcode && coords.postcode) job.postcode = coords.postcode;
      }
    } catch (err) {
      log.debug(`Nominatim failed for "${suburb}": ${err.message}`);
    }
  }

  // Default to Melbourne CBD if no coordinates
  if (!job.latitude) {
    job.latitude = -37.8136;
    job.longitude = 144.9631;
    if (!job.suburb) job.suburb = 'melbourne';
    if (!job.postcode) job.postcode = '3000';
  }

  return job;
}

/**
 * Batch enrich multiple jobs with rate limiting.
 */
async function enrichJobs(jobs, concurrency = 2) {
  const results = [];
  for (let i = 0; i < jobs.length; i += concurrency) {
    const batch = jobs.slice(i, i + concurrency);
    const enriched = await Promise.all(batch.map(job => enrichJob(job)));
    results.push(...enriched);
    // Rate limit for Nominatim
    if (i + concurrency < jobs.length) {
      await sleep(1100);
    }
  }
  return results;
}

async function geocodeNominatim(suburb, postcode) {
  const query = postcode ? `${suburb}, ${postcode}, Victoria, Australia` : `${suburb}, Melbourne, Victoria, Australia`;

  const resp = await axios.get(config.geocode.nominatimUrl, {
    params: {
      q: query,
      format: 'json',
      limit: 1,
      countrycodes: 'au',
    },
    headers: { 'User-Agent': config.geocode.userAgent },
    timeout: 5000,
  });

  if (resp.data && resp.data.length > 0) {
    const result = resp.data[0];
    return {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      postcode: result.display_name?.match(/\b(\d{4})\b/)?.[1] || null,
    };
  }
  return null;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { enrichJob, enrichJobs, SUBURB_COORDS, POSTCODE_TO_SUBURB };

import { API_BASE_URL } from '../config';
const BASE_URL = API_BASE_URL;

const FAKE_SUPPLEMENTS = [
  {
    id: 1,
    name: 'Vitamin D3',
    brand: 'NOW Foods',
    supplement_type: 'vitamin',
    servings_per_bottle: 120,
    servings_per_day: 1,
    remaining_servings: 34,
    days_remaining: 34,
    low_stock_threshold: 7,
    amazon_link: 'https://amazon.com',
  },
  {
    id: 2,
    name: 'Omega-3 Fish Oil',
    brand: 'Nordic Naturals',
    supplement_type: 'omega',
    servings_per_bottle: 60,
    servings_per_day: 2,
    remaining_servings: 5,
    days_remaining: 2,
    low_stock_threshold: 7,
    amazon_link: 'https://amazon.com',
  },
  {
    id: 3,
    name: 'Magnesium Glycinate',
    brand: 'Thorne',
    supplement_type: 'mineral',
    servings_per_bottle: 90,
    servings_per_day: 1,
    remaining_servings: 45,
    days_remaining: 45,
    low_stock_threshold: 7,
    amazon_link: null,
  },
];

async function request(path, { headers: extraHeaders, ...rest } = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
    ...rest,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}

export async function register(email, password) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function login(email, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function getSupplements(token) {
  try {
    return await request('/supplements', {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    console.warn('Failed to fetch supplements, using fake data:', err.message);
    return FAKE_SUPPLEMENTS;
  }
}

export async function addSupplement(token, data) {
  return request('/supplements', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
}

export async function logIntake(token, supplementId, servingsTaken = 1) {
  return request('/intake_logs', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ supplement_id: supplementId, servings_taken: servingsTaken }),
  });
}

// Returns { plan: { summary, stackEvaluation, foundations, niceToHave, dietHabits, disclaimer } }
export async function getRecommendation(token) {
  return request('/recommend', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getProfile(token) {
  return request('/profile', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function saveProfile(token, data) {
  return request('/profile', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
}

export async function scanSupplement(token, imageBase64, mediaType = 'image/jpeg') {
  return request('/scan', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ image: imageBase64, mediaType }),
  });
}

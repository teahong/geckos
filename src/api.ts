import { Gecko, HistoryItem, Metric, Feeding } from './types';

// The URL for the Google Apps Script backend
const API_URL = import.meta.env.VITE_API_URL || 'https://script.google.com/macros/s/AKfycbwgNYe11qzTT4zuxf5YqhFqhF6hafUYre0u31nD7zV_Vp87QVjDyhcUZNx-Rs-fthg4/exec';
const USE_MOCK = false; // Set to true to use mock data for preview purposes

// --- Mock Data ---
let mockGeckos: Gecko[] = [
  {
    id: 'g1',
    name: '레오',
    gender: 'female',
    has_tail: true,
    birth_date: '2022-07-15T00:00:00Z',
  },
  {
    id: 'g2',
    name: '크림',
    gender: 'male',
    has_tail: false,
    birth_date: '2023-01-10T00:00:00Z',
  }
];

const now = new Date();
const d1 = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 5); // 5 days ago
const d2 = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2); // 2 days ago
const d3 = new Date(now.getTime() - 1000 * 60 * 60 * 5); // 5 hours ago

let mockHistory: Record<string, HistoryItem[]> = {
  'g1': [
    { id: 'm1', gecko_id: 'g1', type: 'metric', recorded_at: d1.toISOString(), weight: 29.5, temperature: 24, humidity: 65 },
    { id: 'f1', gecko_id: 'g1', type: 'feeding', fed_at: d1.toISOString(), feed_type: 'superfood', amount_g: 1.5, is_dusted: false, memo: '잘 먹음' },
    { id: 'm2', gecko_id: 'g1', type: 'metric', recorded_at: d2.toISOString(), weight: 30.2, temperature: 24.5, humidity: 70 },
    { id: 'f2', gecko_id: 'g1', type: 'feeding', fed_at: d2.toISOString(), feed_type: 'insect', amount_g: 2.0, is_dusted: true, memo: '귀뚜라미 3마리' },
    { id: 'm3', gecko_id: 'g1', type: 'metric', recorded_at: d3.toISOString(), weight: 31.6, temperature: 23.8, humidity: 68 },
    { id: 'f3', gecko_id: 'g1', type: 'feeding', fed_at: d3.toISOString(), feed_type: 'superfood', amount_g: 1.8, is_dusted: true, memo: '' },
  ],
  'g2': [
    { id: 'm4', gecko_id: 'g2', type: 'metric', recorded_at: d1.toISOString(), weight: 15.0, temperature: 25, humidity: 72 },
  ]
};

// --- API Functions ---
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function getGeckos(): Promise<Gecko[]> {
  if (USE_MOCK) {
    await delay(300);
    return [...mockGeckos];
  }
  try {
    const res = await fetch(`${API_URL}?action=getGeckos&t=${Date.now()}`, { redirect: 'follow' });
    const data = await res.json();
    return Array.isArray(data) ? data : (data.data || []);
  } catch (err) {
    console.error('Failed to fetch geckos:', err);
    return [];
  }
}

export async function getHistory(geckoId: string): Promise<HistoryItem[]> {
  if (USE_MOCK) {
    await delay(300);
    const history = mockHistory[geckoId] || [];
    return [...history].sort((a, b) => {
      const aTime = a.type === 'metric' ? a.recorded_at : a.fed_at;
      const bTime = b.type === 'metric' ? b.recorded_at : b.fed_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
  }
  try {
    const res = await fetch(`${API_URL}?action=getHistory&gecko_id=${geckoId}&t=${Date.now()}`, { redirect: 'follow' });
    const data = await res.json();
    return Array.isArray(data) ? data : (data.data || []);
  } catch (err) {
    console.error('Failed to fetch history:', err);
    return [];
  }
}

export async function addGecko(data: Omit<Gecko, 'id'>): Promise<Gecko> {
  if (USE_MOCK) {
    await delay(500);
    const newGecko = { ...data, id: `g${Date.now()}` };
    mockGeckos.push(newGecko);
    mockHistory[newGecko.id] = [];
    return newGecko;
  }
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'addGecko', data }),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });
    const result = await res.json();
    return result.data || result;
  } catch (err) {
    console.error('Failed to add gecko:', err);
    throw err;
  }
}

export async function addMetric(data: Omit<Metric, 'id' | 'type'>): Promise<Metric> {
  if (USE_MOCK) {
    await delay(500);
    const newMetric: Metric = { ...data, type: 'metric', id: `m${Date.now()}` };
    if (!mockHistory[data.gecko_id]) mockHistory[data.gecko_id] = [];
    mockHistory[data.gecko_id].push(newMetric);
    return newMetric;
  }
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'addMetric', data }),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });
    const result = await res.json();
    return result.data || result;
  } catch (err) {
    console.error('Failed to add metric:', err);
    throw err;
  }
}

export async function addFeeding(data: Omit<Feeding, 'id' | 'type'>): Promise<Feeding> {
  if (USE_MOCK) {
    await delay(500);
    const newFeeding: Feeding = { ...data, type: 'feeding', id: `f${Date.now()}` };
    if (!mockHistory[data.gecko_id]) mockHistory[data.gecko_id] = [];
    mockHistory[data.gecko_id].push(newFeeding);
    return newFeeding;
  }
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'addFeeding', data }),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });
    const result = await res.json();
    return result.data || result;
  } catch (err) {
    console.error('Failed to add feeding:', err);
    throw err;
  }
}

export async function deleteHistoryItem(id: string, type: 'metric' | 'feeding'): Promise<boolean> {
  if (USE_MOCK) {
    await delay(500);
    for (const geckoId in mockHistory) {
      mockHistory[geckoId] = mockHistory[geckoId].filter(h => h.id !== id);
    }
    return true;
  }
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'deleteHistoryItem', data: { id, type } }),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });
    const result = await res.json();
    return result.status === 'success';
  } catch (err) {
    console.error('Failed to delete history item:', err);
    throw err;
  }
}

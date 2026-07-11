// ── Data layer abstraction ─────────────────────────────────────────
// Requirement: swap Mock → Meta/Google/LinkedIn/Pinterest with minimal changes.
// Everything (reasoning engine, chat, reports) reads through this interface.

import { campaigns, adsetsFor, getCampaign, series30, Campaign, AdSet } from "./data";

export interface DayPoint { day: string; ctr: number; cpa: number; spend: number; revenue: number }

export interface DataSource {
  listCampaigns(): Promise<Campaign[]>;
  getCampaign(id: string): Promise<Campaign | null>;
  getAdsets(campaignId: string): Promise<AdSet[]>;
  getDailySeries(campaignId: string): Promise<DayPoint[]>;
  /** On-demand fetch for a custom range — cached after first call. */
  fetchRange(campaignId: string, from: string, to: string): Promise<{ data: DayPoint[]; cached: boolean }>;
  snapshotInfo(): { syncedAt: string; mode: string };
}

// ── Mock implementation (current prototype) ────────────────────────
class MockDataSource implements DataSource {
  private rangeCache = new Map<string, DayPoint[]>();

  async listCampaigns() { return campaigns; }
  async getCampaign(id: string) { return getCampaign(id) ?? null; }
  async getAdsets(campaignId: string) { return adsetsFor(campaignId); }
  async getDailySeries(campaignId: string) { return series30(campaignId); }

  async fetchRange(campaignId: string, from: string, to: string) {
    const key = `${campaignId}:${from}:${to}`;
    if (this.rangeCache.has(key)) return { data: this.rangeCache.get(key)!, cached: true };
    // Simulates hitting the platform API for ONLY the requested slice
    const data = series30(campaignId);
    this.rangeCache.set(key, data);
    return { data, cached: false };
  }

  snapshotInfo() { return { syncedAt: "Today 02:00", mode: "daily-snapshot" }; }
}

// ── Live adapters: implement in Checkpoint 2 — same interface ──────
class MetaDataSource implements DataSource {
  constructor(private token: string, private accountId: string) {}
  listCampaigns(): Promise<Campaign[]> { throw new Error("MetaDataSource: implement for CP2 (Graph API /campaigns)"); }
  getCampaign(): Promise<Campaign | null> { throw new Error("MetaDataSource: implement for CP2"); }
  getAdsets(): Promise<AdSet[]> { throw new Error("MetaDataSource: implement for CP2 (/adsets)"); }
  getDailySeries(): Promise<DayPoint[]> { throw new Error("MetaDataSource: implement for CP2 (/insights?time_increment=1)"); }
  fetchRange(): Promise<{ data: DayPoint[]; cached: boolean }> { throw new Error("MetaDataSource: implement for CP2"); }
  snapshotInfo() { return { syncedAt: "n/a", mode: "meta-live" }; }
}

export function getDataSource(): DataSource {
  switch (process.env.DATA_SOURCE) {
    case "meta":
      return new MetaDataSource(process.env.META_ACCESS_TOKEN ?? "", process.env.META_AD_ACCOUNT_ID ?? "");
    default:
      return new MockDataSource();
  }
}

export const dataSource = getDataSource();

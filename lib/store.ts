"use client";
import { create } from "zustand";

interface AppState {
  campaignId: string | null;
  campaignName: string | null;
  aiOpen: boolean;
  setCampaign: (id: string, name: string) => void;
  clearCampaign: () => void;
  setAiOpen: (v: boolean) => void;
}
export const useApp = create<AppState>((set) => ({
  campaignId: null, campaignName: null, aiOpen: false,
  setCampaign: (id, name) => set({ campaignId: id, campaignName: name }),
  clearCampaign: () => set({ campaignId: null, campaignName: null, aiOpen: false }),
  setAiOpen: (v) => set({ aiOpen: v }),
}));

"use client";

import Hero from "@/components/entry/Hero";
import PricingSection from "@/components/entry/PricingSection";

export default function EntryClient() {
  return (
    <main className="min-h-screen bg-[#faf9f7] dark:bg-[#111]">
      <Hero />
      <PricingSection />
    </main>
  );
}

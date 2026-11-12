import type { Metadata } from "next";
import StreakSharePage from "./share-page";

export const metadata: Metadata = {
  title: "A little consistency goes a long way · VESH",
  description: "A VESH member is building consistency, one day at a time.",
  robots: { index: false, follow: false },
};

export default async function SharedStreak({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <StreakSharePage token={token} />;
}

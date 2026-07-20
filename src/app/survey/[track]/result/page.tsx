import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ResultClient } from "@/components/result/ResultClient";
import { TRACK_METAS, getTrack, getTrackMeta, isTrackId } from "@/lib/tracks";

interface Props {
  params: Promise<{ track: string }>;
}

export function generateStaticParams() {
  return TRACK_METAS.map((meta) => ({ track: meta.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { track } = await params;
  if (!isTrackId(track)) return {};
  return { title: `${getTrackMeta(track).name} 추천 결과` };
}

export default async function ResultPage({ params }: Props) {
  const { track } = await params;
  if (!isTrackId(track)) notFound();
  return <ResultClient track={getTrack(track)} meta={getTrackMeta(track)} />;
}

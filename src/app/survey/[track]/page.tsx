import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SurveyClient } from "@/components/survey/SurveyClient";
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
  return { title: `${getTrackMeta(track).name} 설문` };
}

export default async function SurveyPage({ params }: Props) {
  const { track } = await params;
  if (!isTrackId(track)) notFound();
  return <SurveyClient track={getTrack(track)} meta={getTrackMeta(track)} />;
}

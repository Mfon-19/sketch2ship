import { RoadmapPageContent } from "@/components/roadmap/RoadmapPageContent";

export default async function RoadmapPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RoadmapPageContent projectId={id} />;
}

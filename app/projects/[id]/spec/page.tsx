import { SpecPageContent } from "@/components/spec/SpecPageContent";

export default async function SpecPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SpecPageContent projectId={id} />;
}

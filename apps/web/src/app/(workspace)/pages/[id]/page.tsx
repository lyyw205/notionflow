import { PageEditorClient } from "./page-client";
import { auth } from "@/lib/auth";

interface PageEditorProps {
  params: { id: string };
}

async function getPage(id: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  try {
    const res = await fetch(`${baseUrl}/api/pages/${id}`, {
      cache: "no-store",
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fetch may fail during SSR
  }
  return null;
}

export default async function PageEditor({ params }: PageEditorProps) {
  const page = await getPage(params.id);
  const session = await auth();
  const userId = session?.user?.id;

  return (
    <PageEditorClient
      pageId={params.id}
      userId={userId}
      initialTitle={page?.title ?? "Untitled"}
      initialContent={page?.content ?? "[]"}
      initialSummary={page?.summary ?? ""}
      initialTags={page?.tags ?? []}
      initialCategory={page?.category ?? null}
      initialProject={page?.project ?? null}
      initialMilestone={page?.milestone ?? null}
    />
  );
}

import { ProjectDetailClient } from "./project-detail-client";

interface ProjectDetailProps {
  params: { id: string };
}

async function getProject(id: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  try {
    const res = await fetch(`${baseUrl}/api/projects/${id}`, {
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

export default async function ProjectDetail({ params }: ProjectDetailProps) {
  const project = await getProject(params.id);

  return (
    <ProjectDetailClient
      projectId={params.id}
      initialProject={project}
    />
  );
}

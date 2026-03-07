import { redirect } from "next/navigation";

export default function StudioPage({
  params,
}: {
  params: { mode: "image" | "video" };
}) {
  redirect(`/studio/${params.mode}`);
}

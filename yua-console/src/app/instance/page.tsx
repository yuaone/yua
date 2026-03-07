import InstanceClient from "./instance.client";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <InstanceClient id={id} />;
}

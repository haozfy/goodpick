import { redirect } from "next/navigation";

export default function ShortRedirectPage({
  params,
}: {
  params: { id: string };
}) {
  redirect(`/scan-result?id=${encodeURIComponent(params.id)}`);
}
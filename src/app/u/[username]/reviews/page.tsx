import { redirect } from "next/navigation";

export default async function UserReviewsRedirect({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  redirect(`/u/${username}`);
}

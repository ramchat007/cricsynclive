import { redirect } from "next/navigation";

export default async function TournamentHubRoot({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;

  // Immediately bounce the user to the Teams sub-page
  redirect(`/t/${tournamentId}/teams`);
}

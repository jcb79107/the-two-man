export interface CompletedMatchFeedTitleInput {
  primaryTeamName: string;
  secondaryTeamName: string;
  scoreLine: string;
  isTie: boolean;
}

export function formatCompletedMatchFeedTitle(input: CompletedMatchFeedTitleInput) {
  const resultVerb = input.isTie ? "tied" : "def.";

  return `${input.primaryTeamName} ${resultVerb} ${input.secondaryTeamName} ${input.scoreLine}`;
}

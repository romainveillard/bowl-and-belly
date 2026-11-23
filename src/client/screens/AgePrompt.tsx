import { useState } from "react";
import { useAgePrompt } from "../lib/weights.js";
import { TargetPromptDialog } from "./TargetPromptDialog.js";

/** Asks once, when a pet has reached an age that changes its suggested target. */
export function AgePrompt({ petId, petName }: { petId: number; petName: string }) {
  const { data: prompt } = useAgePrompt(petId);
  const [closed, setClosed] = useState(false);

  if (!prompt || closed) {
    return null;
  }
  return (
    <TargetPromptDialog
      petId={petId}
      petName={petName}
      prompt={prompt}
      onClose={() => setClosed(true)}
    />
  );
}

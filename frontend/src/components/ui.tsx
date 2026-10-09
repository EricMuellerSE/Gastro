export const Pill = ({
  children,
  art = "",
}: {
  children: React.ReactNode;
  art?: "" | "ok" | "warn";
}) => <span className={`pill ${art}`}>{children}</span>;

/** Löschen mit zweistufiger Bestätigung (wie in der Vorlage). */
export function LoeschKnopf({ bestaetigt, onClick }: { bestaetigt: boolean; onClick: () => void }) {
  return (
    <button className={bestaetigt ? "b gefahr" : "b"} onClick={onClick}>
      {bestaetigt ? "Löschen bestätigen" : "Löschen"}
    </button>
  );
}

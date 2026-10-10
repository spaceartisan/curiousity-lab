export function Icon({
  name,
  small = false,
}: {
  name: string;
  small?: boolean;
}) {
  const paths: Record<string, string> = {
    lab: "M8 3h8M10 3v7L4 20q-1 2 2 2h12q3 0 2-2l-6-10V3M7 16h10",
    numbers: "M4 4h16v16H4zM4 9h16M4 15h16M9 4v16M15 4v16",
    words: "M4 5h16M4 12h11M4 19h16M19 9v6",
    music:
      "M9 18V5l11-2v13M9 5l11-2M9 18c0 4-6 4-6 1s6-4 6-1M20 16c0 4-6 4-6 1s6-4 6-1",
    creations: "m12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z",
    settings:
      "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2",
    back: "m14 5-7 7 7 7",
    companion:
      "M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M2 22v-4q0-5 6-5t6 5v4M17 6a3 3 0 0 1 0 6M17 14q5 0 5 5v3",
    insights: "M4 3v18h17M8 16v-4M13 16V8M18 16V5",
  };
  return (
    <svg
      className={small ? "icon small" : "icon"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.lab} />
    </svg>
  );
}

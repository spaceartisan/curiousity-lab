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
    words: "M2 5q5-2 10 1q5-3 10-1v14q-5-2-10 1q-5-3-10-1zM12 6v14",
    music:
      "M9 18V5l11-2v13M9 5l11-2M9 18c0 4-6 4-6 1s6-4 6-1M20 16c0 4-6 4-6 1s6-4 6-1",
    creations: "m12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z",
    settings:
      "M3 6h5M12 6h9M10 4v4M3 12h11M18 12h3M16 10v4M3 18h3M10 18h11M8 16v4",
    sun: "M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4",
    moon: "M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z",
    search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14M21 21l-5-5",
    arrow: "M5 12h14M13 6l6 6-6 6",
    gift: "M3 9h18v4H3zM5 13v8h14v-8M12 9v12M12 9S9 3 7 5s3 4 5 4M12 9s3-6 5-4-3 4-5 4",
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

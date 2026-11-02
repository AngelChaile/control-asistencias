const paths = {
  home: "m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  calendar: "M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z",
  chart: "M4 3v18h17M8 16v-5m5 5V7m5 9v-3",
  user: "M20 21v-2a6 6 0 0 0-6-6h-4a6 6 0 0 0-6 6v2M16 5a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  qr: "M3 3h6v6H3Zm12 0h6v6h-6ZM3 15h6v6H3Zm12 0h2v2h-2Zm6 0v3h-3v3h3M12 3v3m0 6h3m-3 6v3m6-9h3M3 12h3",
  search: "m21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z",
  clipboard: "M9 5H6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3M9 2h6v5H9Zm-1 10h8m-8 5h5",
  available: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm3 5 2 2 4-4",
  vacation: "M3 12a9 9 0 0 1 18 0H3Zm9-9v16a3 3 0 0 0 6 0M8 12c0-5 2-9 4-9s4 4 4 9",
  check: "m5 12 4 4L19 6",
  send: "m22 2-7 20-4-9-9-4 20-7ZM22 2 11 13",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4",
  sun: "M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42m0-14.14-1.42 1.42m-11.3 11.3-1.42 1.42M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  moon: "M20.9 13a9 9 0 0 1-9.9-9.9A9 9 0 1 0 20.9 13Z",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5M21 12H9",
  menu: "M4 6h16M4 12h16M4 18h16",
  close: "m6 6 12 12M6 18 18 6",
  chevron: "m6 9 6 6 6-6",
  building: "M3 21h18M5 21V3h14v18M9 7h1m4 0h1m-6 4h1m4 0h1m-6 4h1m4 0h1M10 21v-3h4v3",
  refresh: "M20 7v5h-5M4 17v-5h5M6.1 6a8 8 0 0 1 13.1 2L20 12M4 12l.8 4A8 8 0 0 0 17.9 18",
  entry: "M9 3h10v18H9m-6-9h11m-4-4 4 4-4 4",
  exit: "M15 3H5v18h10m6-9H10m7-4 4 4-4 4",
  clock: "M12 8v4l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z",
};

export default function AppIcon({ name, size = 20, className = "", ...props }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`shrink-0 ${className}`} {...props}>
    <path d={paths[name] || paths.clipboard} />
  </svg>;
}

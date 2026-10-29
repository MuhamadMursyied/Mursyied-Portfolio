// The "My world" map on the home page: I stand in the middle, and each building around me
// is one part of what I do. Clicking a building opens the tab where that part lives.

export type District = {
  id: string;
  name: string;
  icon: string;
  shape: "lab" | "tower" | "antenna" | "workshop" | "studio" | "academy";
  angle: number; // position around me, in degrees on the ground (135 = left, 315 = right)
  href: string; // relative to the site root
};

export const districts: District[] = [
  { id: "robotics", name: "Robotics Lab", icon: "ugv", shape: "lab", angle: 315, href: "work/?tag=Robotics" },
  { id: "career", name: "Career HQ", icon: "factory", shape: "tower", angle: 195, href: "about/#experience" },
  { id: "iot", name: "IoT Tower", icon: "iot", shape: "antenna", angle: 255, href: "work/?tag=IoT" },
  { id: "electronics", name: "Electronics Workshop", icon: "chip", shape: "workshop", angle: 75, href: "work/?tag=Embedded" },
  { id: "software", name: "Software Studio", icon: "terminal", shape: "studio", angle: 15, href: "skills/" },
  { id: "academy", name: "Academy", icon: "book", shape: "academy", angle: 135, href: "about/#studies" },
];

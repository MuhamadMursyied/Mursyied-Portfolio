// "My journey": one stop per step of my career, oldest first. Each stop has a 3D scene
// on the Journey page (src/scripts/journey3d.ts, keyed by `scene`) and a card with the facts.
// `projects` are slugs in src/content/projects.

export type Stop = {
  id: string;
  scene: "matrik" | "umpsa" | "dreamedge" | "guthrie" | "mimos" | "next" | "future";
  years: string;
  title: string;
  org: string;
  place: string;
  icon: string;
  summary: string;
  did: string[];
  projects: string[];
};

export const journey: Stop[] = [
  {
    id: "matrik",
    scene: "matrik",
    years: "2019 – 2020",
    title: "Where it started",
    org: "Kolej Matrikulasi Kejuruteraan Kedah",
    place: "Kedah",
    icon: "book",
    summary: "Science major in the technical stream: the maths and physics that everything after this is built on.",
    did: ["Science major, technical stream", "Chose engineering as the next step"],
    projects: [],
  },
  {
    id: "umpsa",
    scene: "umpsa",
    years: "2020 – 2025",
    title: "Learning to build robots",
    org: "UMPSA · Bachelor of Mechatronic Engineering (Hons)",
    place: "Pahang · with Hochschule Karlsruhe (HKA), Germany",
    icon: "chip",
    summary: "Mechanics, electronics and code in one degree, in a collaboration programme with HKA in Germany. CGPA 3.44.",
    did: [
      "Built two Robocon robots: one that shoots and one that catches",
      "Led a six-month team building a lawn mower that cuts by itself",
      "IoT: a live outdoor sensor box and two Wi-Fi elevators",
      "Final-year project with MIMOS: hearing machine faults in vibration and alerting online",
    ],
    projects: ["ump-robocon", "automated-lawn-mower", "outdoor-iot-monitoring", "iot-elevator", "vibration-monitoring-iot", "robot-simulation-ros2"],
  },
  {
    id: "dreamedge",
    scene: "dreamedge",
    years: "Aug 2023 – Feb 2024",
    title: "First time in industry",
    org: "DreamEDGE · Intern, Electrical & System Department",
    place: "Cyberjaya, Selangor",
    icon: "factory",
    summary: "Designed electronic components to project specifications and reported progress to clients.",
    did: ["Electronic component design to client specifications", "Progress reports to clients", "Certified CATIA mechanical designer (MARii)"],
    projects: ["catia-certification"],
  },
  {
    id: "guthrie",
    scene: "guthrie",
    years: "Jul 2025 – Apr 2026",
    title: "Robots on palm estates",
    org: "SD Guthrie · Robotics Engineer, Group Digital – Robotics",
    place: "Carey Island, Selangor",
    icon: "ugv",
    summary: "Fitted sensors, tested radio links and drove field trials for robots that work on palm estates.",
    did: [
      "a driverless fertiliser spreader. Tested its long-range radio and drove it in field trials",
      "Husky UGV: designed and 3D-printed the sensor and camera mounts",
      "Trained an AI model to find and count palm crowns in images",
    ],
    projects: ["fertiliser-spreader", "husky-ugv", "yolo-palm-crown"],
  },
  {
    id: "mimos",
    scene: "mimos",
    years: "Apr 2026 – now",
    title: "Making robots drive themselves",
    org: "MIMOS Berhad · Robotics Software Engineer",
    place: "Robotics & Autonomous System · Kuala Lumpur",
    icon: "route",
    summary: "I look after the navigation software of a self-driving outdoor robot: where it is, what's in its way and how it runs a full mission.",
    did: [
      "RTK-GNSS localisation, so the robot knows exactly where it is",
      "MPPI path following, so it drives its route smoothly",
      "Grass-aware perception: drives through tall grass, still stops for trees",
      "A tablet app to start a whole field mission and stop it with one tap",
    ],
    projects: ["hunter-se-outdoor-navigation", "vegetation-aware-perception", "tablet-ground-control"],
  },
  {
    id: "next",
    scene: "next",
    years: "Next",
    title: "From UGVs to AMRs and automation",
    org: "Where I'm heading",
    place: "AMRs · industrial automation · robot arms",
    icon: "factory",
    summary: "The same navigation stack I run on outdoor UGVs, brought indoors: mobile robots that move material by themselves, next to robot arms on automated lines.",
    did: [
      "AMRs: autonomous mobile robots moving material in factories and warehouses",
      "Industrial automation: robot arms and self-running production lines",
      "ROS 2, perception and navigation carried over from the field to the factory",
    ],
    projects: [],
  },
  {
    id: "future",
    scene: "future",
    years: "Future",
    title: "Autonomous cars and the robotics industry",
    org: "Where I'm heading",
    place: "Autonomous driving · the robotics industry",
    icon: "route",
    summary: "The biggest outdoor robot is a car. Next comes localisation, perception and planning at road speed, and growing with the robotics industry from one robot to fleets and products.",
    did: [
      "Autonomous driving: localisation, perception and planning on real roads",
      "Sensor fusion of LiDAR, cameras and RTK-GNSS, the same building blocks I use today",
      "The robotics industry: from one robot in a field to fleets and products",
    ],
    projects: [],
  },
];

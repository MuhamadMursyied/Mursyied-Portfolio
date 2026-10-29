// The "My world" map on the home page: I stand in the middle, and each building around me
// is one part of what I do. Everything inside a building comes from profile.ts and the
// project files, so this list only says what goes where.

export type District = {
  id: string;
  name: string;
  icon: string;
  tagline: string;
  shape: "lab" | "tower" | "antenna" | "workshop" | "studio" | "academy";
  angle: number; // position around me, in degrees on the ground (135 = left, 315 = right)
  experience?: string[]; // company names from profile.ts
  projects?: string[]; // project file names
  studies?: boolean;
  certifications?: boolean;
  competencies?: boolean;
  skills?: string[]; // skill names from profile.ts
  workTag?: string; // Work page filter
};

export const districts: District[] = [
  {
    id: "robotics",
    name: "Robotics Lab",
    icon: "ugv",
    tagline: "Autonomous ground robots, from simulation to the field.",
    shape: "lab",
    angle: 315,
    experience: ["MIMOS Berhad", "SD Guthrie"],
    projects: ["hunter-se-outdoor-navigation", "robot-mission-automation", "robot-simulation-ros2", "ump-robocon"],
    skills: ["ROS 2 (Jazzy)", "Nav2", "Sensor fusion (EKF)", "GNSS navigation", "SLAM", "Gazebo", "RViz", "URDF", "LiDAR", "Cameras"],
    workTag: "Robotics",
  },
  {
    id: "career",
    name: "Career HQ",
    icon: "factory",
    tagline: "Where I have worked and what I bring to a team.",
    shape: "tower",
    angle: 195,
    experience: ["MIMOS Berhad", "SD Guthrie", "DreamEDGE"],
    competencies: true,
  },
  {
    id: "iot",
    name: "IoT Tower",
    icon: "iot",
    tagline: "Connected sensors, live data and condition monitoring.",
    shape: "antenna",
    angle: 255,
    projects: ["vibration-monitoring-iot", "iot-elevator", "outdoor-iot-monitoring"],
    skills: ["LabVIEW", "C++", "CAN bus"],
    workTag: "IoT",
  },
  {
    id: "electronics",
    name: "Electronics Workshop",
    icon: "chip",
    tagline: "Circuits, embedded systems and the hardware on my robots.",
    shape: "workshop",
    angle: 75,
    experience: ["DreamEDGE"],
    projects: ["fpga-piggy-bank", "automated-lawn-mower"],
    skills: ["C", "Verilog", "NVIDIA Jetson AGX Orin", "GNSS/INS", "IMU", "CAN bus"],
  },
  {
    id: "software",
    name: "Software Studio",
    icon: "terminal",
    tagline: "The code and apps around the robots.",
    shape: "studio",
    angle: 15,
    projects: ["robot-mission-automation"],
    skills: ["Python", "C++", "Bash", "FastAPI", "React", "WebSocket", "Linux (Ubuntu)", "Git"],
  },
  {
    id: "academy",
    name: "Academy",
    icon: "book",
    tagline: "Where I studied, and the certificates I keep adding.",
    shape: "academy",
    angle: 135,
    studies: true,
    certifications: true,
    skills: ["CATIA V5", "Fusion 360", "MATLAB", "PLC"],
  },
];

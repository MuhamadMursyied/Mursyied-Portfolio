// Everything about me that is not a project. Projects live in src/content/projects.

export const person = {
  name: "Muhamad Mursyied",
  firstName: "Mursyied",
  role: "Robotics Software Engineer",
  headline: "Making autonomous robots work in the real world",
  subline:
    "I'm Mursyied, a robotics software engineer at MIMOS. I take autonomous ground robots from simulation to field deployment with ROS 2, Nav2 and NVIDIA Jetson.",
  status: "Robotics Software Engineer at MIMOS",
  location: "Rawang, Selangor, Malaysia",
  timeZone: "Asia/Kuala_Lumpur",
  email: "muhamadmursyied@gmail.com",
  avatar: "images/avatar.webp",
  languages: ["English (advanced)", "Bahasa Malaysia (native)", "German (intermediate)"],
};

export const socials = [
  { label: "GitHub", url: "https://github.com/MuhamadMursyied", icon: "github" },
  { label: "Email", url: `mailto:${person.email}`, icon: "mail" },
];

// Paragraphs for the About page. **bold** is supported.
export const intro = [
  "I'm a robotics software engineer who makes **autonomous ground robots work reliably in real outdoor conditions**. I take robot software from simulation to field deployment, solve problems under tight test schedules, and work with cross-functional teams to deliver complete robot systems.",
  "At **MIMOS Berhad** I look after the navigation system of the Hunter SE robot, fusing GNSS, IMU and wheel odometry for accurate positioning, and I build the software that runs whole field missions from a single command. Before that I did UGV R&D for plantation applications at **SD Guthrie**.",
  "I graduated in Mechatronic Engineering with Honours from **Universiti Malaysia Pahang Al-Sultan Abdullah (UMPSA)**, in a collaboration programme with Hochschule Karlsruhe (HKA), Germany, so my background covers the whole stack: mechanical design, electronics, embedded systems and software.",
];

// Shown as chips on the About page.
export const competencies = [
  "Autonomous navigation",
  "System integration",
  "Field testing and validation",
  "Problem solving",
  "Cross-functional teamwork",
  "Technical documentation",
];

// Where I'm heading: shown on the home page.
export const focus = [
  { stage: "Now", title: "Unmanned Ground Vehicles", text: "Outdoor autonomy with ROS 2, Nav2, EKF sensor fusion and GNSS, from Gazebo to field deployment.", icon: "ugv" },
  { stage: "Next", title: "Unmanned Aerial Vehicles", text: "Flight controller integration with PX4, ArduPilot and MAVROS, and aerial mapping.", icon: "drone" },
  { stage: "Future", title: "Unmanned Surface Vehicles", text: "Marine autonomy, GNSS/RTK guidance and field robotics in harsh conditions.", icon: "boat" },
];

export const experience = [
  {
    company: "MIMOS Berhad",
    role: "Robotics Software Engineer",
    place: "Kuala Lumpur",
    period: "Present",
    current: true,
    points: [
      "Enabled autonomous outdoor operation of the Hunter SE robot: managed its navigation system and fused GPS, motion sensors and wheel data for accurate positioning, taking each change from simulation to field deployment.",
      "Automated end-to-end robot missions: software that runs a 58-point field coverage route from a single command, plus a tablet control app for operators to monitor, drive and manage missions.",
    ],
    tags: ["ROS 2", "Nav2", "EKF", "GNSS", "Gazebo", "NVIDIA Jetson", "FastAPI", "React"],
  },
  {
    company: "SD Guthrie",
    role: "Robotics Engineer",
    place: "Carey Island, Selangor",
    period: "From Jul 2025",
    points: [
      "R&D on UGV development for plantation applications.",
      "Integrated sensors, controllers and communication modules into the machine and verified operation during field testing.",
    ],
    tags: ["UGV", "Sensor integration", "Field testing"],
  },
  {
    company: "DreamEDGE",
    role: "Intern, Electrical & System Department",
    place: "Cyberjaya, Selangor",
    period: "Aug 2023 – Feb 2024",
    points: [
      "Designed electronic components to meet project specifications.",
      "Coordinated with clients on project progress and reporting.",
    ],
    tags: ["Electronics design"],
  },
];

export const studies = [
  {
    school: "Universiti Malaysia Pahang Al-Sultan Abdullah (UMPSA)",
    qualification: "Bachelor of Mechatronic Engineering with Honours",
    period: "2020 – 2025",
    notes: [
      "CGPA 3.44",
      "Collaboration programme with Hochschule Karlsruhe (HKA), Germany",
      "Facilitator, IEM UMPSS × UMPBOT Back to Basic Robotics Workshop (2022)",
    ],
  },
  {
    school: "Kolej Matrikulasi Kejuruteraan Kedah",
    qualification: "Science Major, Technical Stream",
    period: "2019 – 2020",
    notes: [],
  },
];

export const certifications = [
  { name: "Goethe-Zertifikat B1 (German)", issuer: "Goethe-Institut" },
  { name: "CATIA V5 Specialist – Mechanical Designer" },
  { name: "PLC programming (LD, ST, FBD) with IndraWorks Engineering", issuer: "Bosch Rexroth", year: "2024" },
  { name: "Visual Components workshop: machine layout and productivity analysis", year: "2022" },
  { name: "Mechatronics WorldSkills training: automated system on a FESTO station", year: "2022" },
];

// icon: a simple-icons slug (see src/components/Icon.astro) or one of the built-in names.
export const skills = [
  {
    group: "Robotics",
    items: [
      { name: "ROS 2 (Jazzy)", icon: "ros" },
      { name: "Nav2", icon: "route" },
      { name: "Sensor fusion (EKF)", icon: "fusion" },
      { name: "GNSS navigation", icon: "satellite" },
      { name: "SLAM", icon: "radar" },
      { name: "Gazebo", icon: "cube" },
      { name: "RViz", icon: "eye" },
      { name: "URDF", icon: "ugv" },
    ],
  },
  {
    group: "Hardware",
    items: [
      { name: "LiDAR", icon: "radar" },
      { name: "Cameras", icon: "camera" },
      { name: "GNSS/INS", icon: "satellite" },
      { name: "IMU", icon: "gauge" },
      { name: "CAN bus", icon: "iot" },
      { name: "NVIDIA Jetson AGX Orin", icon: "nvidia" },
    ],
  },
  {
    group: "Programming",
    items: [
      { name: "Python", icon: "python" },
      { name: "C++", icon: "cplusplus" },
      { name: "C", icon: "c" },
      { name: "Bash", icon: "gnubash" },
      { name: "Verilog", icon: "chip" },
    ],
  },
  {
    group: "Web & tools",
    items: [
      { name: "FastAPI", icon: "fastapi" },
      { name: "React", icon: "react" },
      { name: "WebSocket", icon: "socketdotio" },
      { name: "Linux (Ubuntu)", icon: "ubuntu" },
      { name: "Git", icon: "git" },
    ],
  },
  {
    group: "Engineering software",
    items: [
      { name: "CATIA V5", icon: "dassaultsystemes" },
      { name: "Fusion 360", icon: "autodesk" },
      { name: "MATLAB", icon: "chart" },
      { name: "LabVIEW", icon: "labview" },
      { name: "PLC", icon: "plc" },
    ],
  },
];

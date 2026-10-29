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
  "At **MIMOS Berhad** I look after the navigation system of the Hunter SE robot, fusing GNSS, IMU and wheel odometry for accurate positioning, and I build the software that runs whole field missions from a single command. Before that, at **SD Guthrie**, I worked on plantation UGVs: hardware integration on a Husky, the comms and LoRa-controlled Autobin for an autonomous fertiliser-spreading system, and a modular redesign of the Timmy UGV.",
  "Outside work I keep learning: training **YOLOv11** to count palm crowns and getting a **Livox Mid-360 LiDAR** running on ROS 2 for localization and sensor fusion.",
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
      "Bring up sensor drivers when new hardware arrives, and debug problems down to the real cause instead of patching them.",
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
      "Husky development UGV: installed and integrated new hardware, made mechanical modifications and 3D-printed mounts for sensors and accessories, and set up cameras for teleoperation.",
      "ROC & Autobin: autonomous UGV for fertiliser spreading (target 100 hectares a week). Range-tested a TVWS comms system, improved signal stability, piloted the UGV in the field and built LoRa control for the Autobin from the Remote Operating Center.",
      "Timmy: redesigning a UGV with an integrated PCB into a modular platform for easy hardware swaps, learning and testing.",
    ],
    tags: ["UGV", "Husky", "LoRa", "TVWS", "3D printing", "Field testing"],
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
      "Facilitator, IEM Club Engineering Treasure Hunt (about 150 participants)",
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
      { name: "YOLOv11", icon: "ultralytics" },
      { name: "Roboflow", icon: "roboflow" },
    ],
  },
  {
    group: "Hardware",
    items: [
      { name: "Livox Mid-360 LiDAR", icon: "radar" },
      { name: "Arduino", icon: "arduino" },
      { name: "LoRa", icon: "iot" },
      { name: "TVWS comms", icon: "satellite" },
      { name: "NI-DAQ", icon: "gauge" },
      { name: "FPGA DE10", icon: "chip" },
      { name: "3D printing", icon: "creality" },
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
      { name: "Qt Creator", icon: "qt" },
      { name: "VS Code", icon: "terminal" },
      { name: "Code::Blocks", icon: "terminal" },
      { name: "Google Colab", icon: "googlecolab" },
      { name: "ThingsBoard", icon: "chart" },
      { name: "Microsoft 365", icon: "doc" },
    ],
  },
  {
    group: "Engineering software",
    items: [
      { name: "CATIA V5", icon: "dassaultsystemes" },
      { name: "Fusion 360", icon: "autodesk" },
      { name: "MATLAB", icon: "chart" },
      { name: "LabVIEW", icon: "labview" },
      { name: "SolidWorks", icon: "dassaultsystemes" },
      { name: "AutoCAD", icon: "autocad" },
      { name: "Ansys", icon: "ansys" },
      { name: "Quartus Prime", icon: "intel" },
      { name: "Fritzing", icon: "chip" },
      { name: "Visual Components", icon: "factory" },
      { name: "IndraWorks (ctrlX)", icon: "plc" },
      { name: "FPWIN Pro 7", icon: "plc" },
    ],
  },
];

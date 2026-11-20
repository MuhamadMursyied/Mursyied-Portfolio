// Everything about me that is not a project. Projects live in src/content/projects.

export const person = {
  name: "Muhamad Mursyied",
  firstName: "Mursyied",
  role: "Robotics Software Engineer",
  headline: "I make outdoor ground robots drive themselves",
  subline:
    "On farms and open land, where GPS is off by metres, grass looks like a wall and the ground is never flat. I write the software that tells the robot where it is, what's in its way and where to go next, and I test it in the field.",
  status: "Robotics software engineer · ROS 2 navigation for UGVs",
  location: "Rawang, Selangor, Malaysia",
  timeZone: "Asia/Kuala_Lumpur",
  email: "muhamadmursyied@gmail.com",
  avatar: "images/avatar.webp",
  languages: ["English (advanced)", "Bahasa Malaysia (native)", "German (Goethe B1)"],
};

export const socials = [
  { label: "GitHub", url: "https://github.com/MuhamadMursyied", icon: "github" },
  { label: "Email", url: `mailto:${person.email}`, icon: "mail" },
];

// Paragraphs for the About page. **bold** is supported.
export const intro = [
  "I trained as a **mechatronic engineer**, and my core is **robotics software**: **ROS 2 navigation**, **computer vision**, **IoT** and **AI**, from simulation to the real robot. I can also design parts in CAD, 3D-print them and wire the electronics.",
  "Today I write navigation software for outdoor robots at **MIMOS**. I test in simulation first, then in the field, and I like finding the real cause of a problem instead of patching it.",
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
    place: "Robotics & Autonomous System · Kuala Lumpur",
    period: "Apr 2026 – Present",
    current: true,
    summary: "I look after the navigation software of a self-driving outdoor robot: where it is, what's in its way and how it runs a full mission.",
    projects: ["hunter-se-outdoor-navigation", "vegetation-aware-perception", "tablet-ground-control"],
  },
  {
    company: "SD Guthrie",
    role: "Robotics Engineer, Group Digital – Robotics",
    place: "Carey Island, Selangor",
    period: "Jul 2025 – Apr 2026",
    summary: "Fitted sensors, tested radio links and drove field trials for robots that work on palm estates.",
    projects: ["roc-autobin", "husky-ugv"],
  },
  {
    company: "DreamEDGE",
    role: "Intern, Electrical & System Department",
    place: "Cyberjaya, Selangor",
    period: "Aug 2023 – Feb 2024",
    summary: "Designed electronic components to project specifications and reported progress to clients.",
    projects: ["catia-certification"],
  },
];

// "Currently working on" on the About page.
export const currently = [
  "A proposal for a robot that carries harvested palm fruit over soft peat ground, reusing my navigation and follow-me work.",
  "Learning how the robot's navigation software works inside, starting with the part that steers it along a route.",
];

export const studies = [
  {
    school: "Universiti Malaysia Pahang Al-Sultan Abdullah (UMPSA)",
    qualification: "Bachelor of Mechatronic Engineering with Honours",
    period: "2020 – 2025",
    notes: [
      "CGPA 3.44",
      "Collaboration programme with Hochschule Karlsruhe (HKA), Germany",
    ],
  },
  {
    school: "Kolej Matrikulasi Kejuruteraan Kedah",
    qualification: "Science Major, Technical Stream",
    period: "2019 – 2020",
    notes: [],
  },
];

// icon: a simple-icons slug (see src/components/Icon.astro) or one of the built-in names.
export const skills = [
  {
    group: "Robotics",
    items: [
      { name: "ROS 2 (Jazzy)", icon: "ros" },
      { name: "Nav2", icon: "route" },
      { name: "MPPI controller", icon: "route" },
      { name: "Sensor fusion (EKF)", icon: "fusion" },
      { name: "GNSS navigation", icon: "satellite" },
      { name: "SLAM", icon: "radar" },
      { name: "Gazebo", icon: "cube" },
      { name: "RViz", icon: "eye" },
      { name: "URDF", icon: "ugv" },
      { name: "YOLOv11", icon: "ultralytics" },
      { name: "DeepLabV3", icon: "eye" },
      { name: "PCL", icon: "radar" },
      { name: "OpenCV", icon: "opencv" },
      { name: "ONNX", icon: "onnx" },
      { name: "Roboflow", icon: "roboflow" },
    ],
  },
  {
    group: "Hardware",
    items: [
      { name: "Livox Mid-360 LiDAR", icon: "radar" },
      { name: "Ouster OS0-64 LiDAR", icon: "radar" },
      { name: "RoboSense E1 LiDAR", icon: "radar" },
      { name: "OAK camera", icon: "camera" },
      { name: "Fixposition RTK-GNSS", icon: "satellite" },
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
      { name: "Flask", icon: "flask" },
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
    ],
  },
];

import { About, Blog, Gallery, Home, Newsletter, Person, Skills, Social, Work } from "@/types";
import { Line, Row, Text } from "@once-ui-system/core";

const person: Person = {
  firstName: "Mursyied",
  lastName: "",
  name: "Muhamad Mursyied",
  role: "Mechatronics Engineer",
  avatar: "/images/avatar.webp",
  email: "muhamadmursyied@gmail.com",
  location: "Asia/Kuala_Lumpur", // Expecting the IANA time zone identifier, e.g., 'Europe/Vienna'
  languages: ["English", "Bahasa Malaysia", "German (B1)"], // optional: Leave the array empty if you don't want to display languages
  locale: "en", // BCP 47 language tag for the HTML lang attribute, e.g., 'en', 'ja', 'zh-TW'
};

const newsletter: Newsletter = {
  display: false,
  title: <>Subscribe to {person.firstName}'s Newsletter</>,
  description: <>Notes on robotics, ROS 2 and building things</>,
};

const social: Social = [
  // Links are automatically displayed.
  // Import new icons in /once-ui/icons.ts
  // Set essentials: true for links you want to show on the about page
  {
    name: "GitHub",
    icon: "github",
    link: "https://github.com/MuhamadMursyied",
    essential: true,
  },
  {
    name: "Email",
    icon: "email",
    link: `mailto:${person.email}`,
    essential: true,
  },
];

const home: Home = {
  path: "/",
  image: "/images/og/home.jpg",
  label: "Home",
  title: `${person.name} · Robotics Engineer`,
  description: "Mechatronics engineer building software for unmanned ground vehicles with ROS 2.",
  headline: <>Building robots that move on their own</>,
  featured: {
    display: true,
    title: (
      <Row gap="12" vertical="center">
        <strong className="ml-4">ROS 2</strong>{" "}
        <Line background="brand-alpha-strong" vert height="20" />
        <Text marginRight="4" onBackground="brand-medium">
          Robot simulation
        </Text>
      </Row>
    ),
    href: "/work/robot-simulation-ros2",
  },
  subline: (
    <>
      I'm {person.firstName}, a mechatronics engineer doing R&D on{" "}
      <Text as="span" size="xl" weight="strong">
        unmanned ground vehicles
      </Text>{" "}
      at SD Guthrie, <br /> working with ROS 2 from simulation through to real hardware.
    </>
  ),
};

// Skills shown as icon chips on the home page and grouped on the about page.
const skills: Skills = [
  {
    title: "Robotics & automation",
    description: (
      <>Robot software and simulation with ROS 2, plus industrial automation and PLCs.</>
    ),
    tags: [
      { name: "ROS 2", icon: "ros" },
      { name: "RViz", icon: "radar" },
      { name: "Gazebo", icon: "cube" },
      { name: "PLC (LD, ST, FBD)", icon: "plc" },
      { name: "Bosch Rexroth IndraWorks", icon: "bosch" },
      { name: "FESTO automation", icon: "factory" },
      { name: "IoT systems", icon: "iot" },
    ],
  },
  {
    title: "Programming",
    description: <>From robot nodes to firmware and hardware description.</>,
    tags: [
      { name: "C++", icon: "cplusplus" },
      { name: "C", icon: "c" },
      { name: "Python", icon: "python" },
      { name: "Verilog", icon: "chip" },
      { name: "HTML", icon: "html" },
    ],
  },
  {
    title: "Engineering software",
    description: <>Mechanical design, analysis and simulation tools.</>,
    tags: [
      { name: "CATIA V5", icon: "dassault" },
      { name: "Fusion 360", icon: "autodesk" },
      { name: "MATLAB", icon: "chart" },
      { name: "LabVIEW", icon: "wave" },
      { name: "Intel Quartus II", icon: "intel" },
      { name: "Qt Creator", icon: "qt" },
      { name: "Visual Components", icon: "cube" },
      { name: "Microsoft Office", icon: "document" },
    ],
  },
  {
    title: "Hardware & platforms",
    description: <>The machines my code runs on.</>,
    tags: [
      { name: "Ubuntu Linux", icon: "ubuntu" },
      { name: "NVIDIA Jetson", icon: "nvidia" },
      { name: "Intel NUC", icon: "intel" },
      { name: "Arduino", icon: "arduino" },
      { name: "FPGA (DE10)", icon: "chip" },
    ],
  },
];

const about: About = {
  path: "/about",
  label: "About",
  title: `About – ${person.name}`,
  description: `Meet ${person.name}, ${person.role} from Selangor, Malaysia`,
  tableOfContent: {
    display: true,
    subItems: false,
  },
  avatar: {
    display: true,
  },
  calendar: {
    display: false,
    link: "",
  },
  intro: {
    display: true,
    title: "Introduction",
    description: (
      <>
        <p>
          I'm a curious, hands-on mechatronics engineer from Rawang, Selangor, who enjoys exploring{" "}
          <strong>robotics, automation and sustainable technology</strong>, and turning ideas into
          practical solutions.
        </p>
        <p>
          I graduated in Mechatronic Engineering with Honours from{" "}
          <strong>Universiti Malaysia Pahang Al-Sultan Abdullah (UMPSA)</strong>, in a collaboration
          programme with Hochschule Karlsruhe (HKA), Germany. Since July 2025 I have been a Protégé
          in <strong>Group Digital – Robotics at SD Guthrie</strong>, doing R&D on unmanned ground
          vehicle (UGV) development, including communication signal analysis and testing for the ROC
          system.
        </p>
        <p>
          My background spans the whole mechatronics stack: robot simulation with ROS 2, RViz and
          Gazebo, embedded and IoT systems, FPGA design in Verilog, PLC programming and mechanical
          design in CATIA and Fusion 360. Next, I want to take what I've learned on the ground into
          the air and onto the water, with <strong>UAVs</strong> and <strong>USVs</strong>.
        </p>
      </>
    ),
  },
  work: {
    display: true, // set to false to hide this section
    title: "Work Experience",
    experiences: [
      {
        company: "SD Guthrie",
        timeframe: "Jul 2025 - Present",
        role: "Protégé, Group Digital – Robotics · Carey Island, Selangor",
        achievements: [
          <>R&D on unmanned ground vehicle (UGV) development with ROS 2.</>,
          <>Communication signal analysis and testing for the ROC system.</>,
        ],
        images: [],
      },
      {
        company: "DreamEDGE",
        timeframe: "Aug 2023 - Feb 2024",
        role: "Intern, Electrical & System Department · Cyberjaya, Selangor",
        achievements: [
          <>Designed electronic components to meet project specifications.</>,
          <>
            Worked with clients to gather project progress updates and kept reporting on schedule.
          </>,
        ],
        images: [],
      },
      {
        company: "Ensu Lifesciences",
        timeframe: "Jun 2020 - Aug 2020",
        role: "Filling and Packaging Operator · Rawang, Selangor",
        achievements: [
          <>Sorted products and carried out quality checks as part of a production team.</>,
          <>Inspected, analysed and troubleshot product issues.</>,
        ],
        images: [],
      },
    ],
  },
  studies: {
    display: true, // set to false to hide this section
    title: "Studies",
    institutions: [
      {
        name: "Universiti Malaysia Pahang Al-Sultan Abdullah (UMPSA)",
        description: (
          <>
            Bachelor of Mechatronic Engineering with Honours, 2020 – 2025, CGPA 3.44. Collaboration
            programme with Hochschule Karlsruhe (HKA), Germany. Facilitator at the IEM UMPSS ×
            UMPBOT Back to Basic Robotics Workshop (2022).
          </>
        ),
      },
      {
        name: "Kolej Matrikulasi Kejuruteraan Kedah",
        description: <>Science Major, Technical Stream, 2019 – 2020.</>,
      },
    ],
  },
  certifications: {
    display: true, // set to false to hide this section
    title: "Certifications",
    items: [
      { name: "Goethe-Zertifikat B1 (German)", issuer: "Goethe-Institut" },
      { name: "CATIA V5 Specialist – Mechanical Designer" },
      {
        name: "PLC programming (LD, ST, FBD) with IndraWorks Engineering",
        issuer: "Bosch Rexroth",
        date: "2024",
      },
      {
        name: "Visual Components workshop: machine layout and productivity analysis",
        date: "2022",
      },
      {
        name: "Mechatronics WorldSkills training: automated system on a FESTO station",
        date: "2022",
      },
    ],
  },
  technical: {
    display: true, // set to false to hide this section
    title: "Technical skills",
    skills: skills,
  },
};

const blog: Blog = {
  path: "/blog",
  label: "Blog",
  title: "Writing about robotics and engineering",
  description: `Read what ${person.name} has been up to recently`,
  // Create new blog posts by adding a new .mdx file to app/blog/posts
  // All posts will be listed on the /blog route
};

const work: Work = {
  path: "/work",
  label: "Work",
  title: `Projects – ${person.name}`,
  description: `Robotics, embedded and software projects by ${person.name}`,
  // Create new project pages by adding a new .mdx file to app/blog/posts
  // All projects will be listed on the /home and /work routes
};

const gallery: Gallery = {
  path: "/gallery",
  label: "Gallery",
  title: `Photo gallery – ${person.name}`,
  description: `A photo collection by ${person.name}`,
  // Add your own photos to public/images/gallery and list them here,
  // then turn on "/gallery" in once-ui.config.ts
  images: [],
};

export { person, social, newsletter, home, about, skills, blog, work, gallery };

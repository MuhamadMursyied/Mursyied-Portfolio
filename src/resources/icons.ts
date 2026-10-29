import { IconType } from "react-icons";

import {
  HiArrowUpRight,
  HiOutlineLink,
  HiArrowTopRightOnSquare,
  HiEnvelope,
  HiCalendarDays,
  HiArrowRight,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineDocument,
  HiOutlineGlobeAsiaAustralia,
  HiOutlineRocketLaunch,
} from "react-icons/hi2";

import {
  PiHouseDuotone,
  PiUserCircleDuotone,
  PiGridFourDuotone,
  PiBookBookmarkDuotone,
  PiImageDuotone,
} from "react-icons/pi";

import {
  SiJavascript,
  SiNextdotjs,
  SiFigma,
  SiSupabase,
  SiRos,
  SiCplusplus,
  SiC,
  SiPython,
  SiHtml5,
  SiUbuntu,
  SiNvidia,
  SiArduino,
  SiIntel,
  SiQt,
  SiAutodesk,
  SiDassaultsystemes,
  SiBosch,
} from "react-icons/si";

import {
  TbRadar,
  TbCube3dSphere,
  TbCpu,
  TbBuildingFactory2,
  TbTopologyStar3,
  TbWaveSine,
  TbChartLine,
  TbBinaryTree,
  TbCertificate,
} from "react-icons/tb";

import {
  FaDiscord,
  FaGithub,
  FaLinkedin,
  FaX,
  FaThreads,
  FaInstagram,
  FaXTwitter,
  FaFacebook,
  FaPinterest,
  FaWhatsapp,
  FaReddit,
  FaTelegram,
} from "react-icons/fa6";

export const iconLibrary = {
  arrowUpRight: HiArrowUpRight,
  arrowRight: HiArrowRight,
  email: HiEnvelope,
  globe: HiOutlineGlobeAsiaAustralia,
  person: PiUserCircleDuotone,
  grid: PiGridFourDuotone,
  book: PiBookBookmarkDuotone,
  openLink: HiOutlineLink,
  calendar: HiCalendarDays,
  home: PiHouseDuotone,
  gallery: PiImageDuotone,
  discord: FaDiscord,
  eye: HiOutlineEye,
  eyeOff: HiOutlineEyeSlash,
  github: FaGithub,
  linkedin: FaLinkedin,
  x: FaX,
  twitter: FaXTwitter,
  threads: FaThreads,
  arrowUpRightFromSquare: HiArrowTopRightOnSquare,
  document: HiOutlineDocument,
  rocket: HiOutlineRocketLaunch,
  javascript: SiJavascript,
  nextjs: SiNextdotjs,
  supabase: SiSupabase,
  figma: SiFigma,
  facebook: FaFacebook,
  pinterest: FaPinterest,
  whatsapp: FaWhatsapp,
  reddit: FaReddit,
  telegram: FaTelegram,
  instagram: FaInstagram,
  ros: SiRos,
  cplusplus: SiCplusplus,
  c: SiC,
  python: SiPython,
  html: SiHtml5,
  ubuntu: SiUbuntu,
  nvidia: SiNvidia,
  arduino: SiArduino,
  intel: SiIntel,
  qt: SiQt,
  autodesk: SiAutodesk,
  dassault: SiDassaultsystemes,
  bosch: SiBosch,
  radar: TbRadar,
  cube: TbCube3dSphere,
  chip: TbCpu,
  factory: TbBuildingFactory2,
  iot: TbTopologyStar3,
  wave: TbWaveSine,
  chart: TbChartLine,
  plc: TbBinaryTree,
  certificate: TbCertificate,
} satisfies Record<string, IconType>;

export type IconLibrary = typeof iconLibrary;
export type IconName = keyof IconLibrary;

// Registers the names above with Once UI, so `<Icon name>` and every `icon`
// prop accept them and a typo is a type error.
declare module "@once-ui-system/core" {
  interface IconLibraryOverrides extends Record<IconName, true> {}
}

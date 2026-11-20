---
title: "Autonomous navigation for the Hunter SE"
date: "2026"
org: "MIMOS Berhad"
summary: "I make a robot drive itself outdoors. I fixed two things: it now knows exactly where it is, and it drives its route smoothly."
tags: ["ROS 2", "Nav2", "MPPI", "GNSS", "Robotics"]
featured: true
videos:
  - src: "videos/hunter-se-outdoor-navigation-real.mp4"
    caption: "Real robot field test · Nav2 + RTK-GNSS · edited for length"
video: "videos/hunter-se-outdoor-navigation.mp4"
images:
  - "images/projects/hunter-se-outdoor-navigation-1.jpg"
  - "images/projects/hunter-se-outdoor-navigation-2.jpg"
  - "images/projects/hunter-se-outdoor-navigation-3.jpg"
  - "images/projects/hunter-se-outdoor-navigation-4.jpg"
  - "images/projects/hunter-se-outdoor-navigation-5.jpg"
  - "images/projects/hunter-se-outdoor-navigation-6.jpg"
  - "images/projects/hunter-se-outdoor-navigation-7.jpg"
  - "images/projects/hunter-se-outdoor-navigation-8.jpg"
  - "images/projects/hunter-se-outdoor-navigation-9.jpg"
  - "images/projects/hunter-se-outdoor-navigation-10.jpg"
---

The **Hunter SE** is a robot car that drives itself outdoors. I look after its navigation software: the part that works out where the robot is and how it gets to the next point. I try every change in a computer simulation first, then on the real robot in the field. The first video below is the real robot; the second is the simulation.

## Problem 1: the robot got lost

Normal GPS jumps around by a few metres, so the robot slowly drifted off its path. I switched it to a much more accurate GPS that also uses a camera and motion sensors to keep track of position.

## Problem 2: the driving was jerky

The robot steers like a car, and on rough ground it kept stopping and wobbling. I replaced the path-following software with a smoother one, so it now drives along the route steadily.

**Stack:** ROS 2 Jazzy, Nav2, MPPI controller, robot_localization, Fixposition RTK-GNSS, Gazebo, NVIDIA Jetson AGX Orin

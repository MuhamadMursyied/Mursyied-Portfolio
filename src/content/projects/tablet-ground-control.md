---
title: "Tablet ground control station"
date: "2026"
org: "MIMOS Berhad"
summary: "Before, running the robot needed a laptop and typed commands. Now an operator starts a full field mission from a tablet, and can take over or stop it with one tap."
tags: ["ROS 2", "Nav2", "Flask", "JavaScript", "Robotics"]
employer: true
credits: "Satellite map imagery © Google and its imagery providers."
featured: true
videos:
  - src: "videos/tablet-ground-control-real.mp4"
    caption: "Real robot field test · edited to 1 min"
video: "videos/tablet-ground-control.mp4"
images:
  - "images/projects/tablet-ground-control-1.jpg"
---

Running the robot used to mean a laptop and typed commands, one destination at a time. Operators in the field needed something simpler.

## What I did

- **One-button missions:** the operator picks a mission and the robot drives the whole route by itself, for example **58 points** sweeping back and forth across a field.
- **A tablet app** that shows the map and the robot's camera side by side, has **two on-screen joysticks** to drive by hand, a switch between manual and automatic, and an **emergency stop button that is always on screen**.

## Result

One screen to start a mission, watch it, drive the robot and stop it on site. The first video is the app running the real Hunter SE: tapping a point on the satellite map, watching it drive there, starting the robot software, and checking its health. The second is the full walkthrough in simulation.

**Stack:** ROS 2, Nav2, Python, Flask, JavaScript, rosbridge (WebSocket), web_video_server

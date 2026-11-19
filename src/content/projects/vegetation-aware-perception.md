---
title: "Teaching the robot that grass isn't a wall"
date: "2026"
org: "MIMOS Berhad"
summary: "The robot thought tall grass was a wall and refused to drive through it. Now it drives through grass but still stops for trees."
tags: ["ROS 2", "Nav2", "LiDAR", "Computer vision", "Robotics"]
featured: true
video: "videos/vegetation-aware-perception.mp4"
images:
  - "images/projects/vegetation-aware-perception-1.jpg"
---

The robot uses a laser scanner to see what's around it. To that scanner, **tall grass looks like a solid wall**, so the robot stopped or drove around grass it could easily have gone through.

## What I did

- Added a **camera check**: if the camera sees the obstacle is grass, the robot is allowed to drive through it.
- For palm plantations, taught the robot to tell apart **grass, palm trunks and fallen branches**, using the laser's height readings, the colours in the camera image and an AI model that labels each part of the picture.

## Result

The robot now drives smoothly over grass and road, and still stops for trunks and real obstacles.

**Stack:** RoboSense E1, Ouster OS0-64, OAK camera, PCL, OpenCV, DeepLabV3, ONNX, Nav2

---
title: "CV Builder"
date: "2026-10"
summary: "A browser tool that turns your details into an ATS-friendly CV for the Malaysian job market, with three career tiers and ten themes."
draft: true # hidden until murs wants it shared
tags: ["Web app","JavaScript","Tools"]
links:
  - label: "Live demo"
    url: "https://muhamadmursyied.github.io/cv-builder/"
  - label: "Source code"
    url: "https://github.com/MuhamadMursyied/cv-builder"
images:
  - "images/projects/cv-builder-editor.webp"
  - "images/projects/cv-builder-ats-check.webp"
---

## Overview

Pick your career level, choose one of ten themes and download a CV that applicant tracking systems can read. Everything runs in the browser, so no data leaves your machine.

## Key features

- **Three career tiers** (student, mid-career, senior), each with its own section order and guidance.
- **Ten ATS-safe themes**, exported to text-based PDF, Word (.docx) and plain text.
- **ATS score with fixes**, plus a job-ad keyword match.
- **Malaysian conventions built in**: +60 phone numbers, CGPA and MUET, PDPA reminders.

## How it's built

Plain HTML, CSS and JavaScript. The Word file is written by hand with no libraries, and one layout engine drives both the live preview and the PDF.

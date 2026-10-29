---
title: "Kedai POS"
date: "2026-10"
summary: "A complete point-of-sale system for small Malaysian shops that runs in the browser and works offline, with SST, cash rounding and receipts."
draft: true # hidden until murs wants it shared
tags: ["Web app","JavaScript","PWA"]
links:
  - label: "Live demo"
    url: "https://muhamadmursyied.github.io/pos-system/"
  - label: "Source code"
    url: "https://github.com/MuhamadMursyied/pos-system"
images:
  - "images/projects/pos-checkout.webp"
  - "images/projects/pos-receipt.webp"
  - "images/projects/pos-reports.webp"
  - "images/projects/pos-mobile-dark.webp"
---

## Overview

A full point-of-sale app for a small shop, installable as a PWA and usable offline.

## Key features

- **Checkout** with barcode scanning, discounts, held sales and keyboard shortcuts.
- **Payments**: cash, card, DuitNow QR and e-wallet, split payments and 5 sen cash rounding.
- **Malaysian SST** (tax-inclusive or exclusive), 80 mm receipts, full or partial refunds.
- **Back office**: shifts with a cash-drawer count, inventory, customers, staff roles and reports.
- Light and dark modes on desktop, tablet and phone.

## How it's built

Plain HTML, CSS and JavaScript with data kept in the browser. Money maths is covered by unit tests.

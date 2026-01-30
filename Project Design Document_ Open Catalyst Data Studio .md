# **Project Design Document: Open Catalyst Data Studio (OCDS)**

**Version:** 0.1 (Draft) **Date:** January 27, 2026 **Author:** Kyler Burnett

## **1\. Executive Summary**

The **Open Catalyst Data Studio (OCDS)** is a proposed open-source, local-first software suite designed to unlock, normalize, and visualize telemetry data from the Garmin Catalyst driving performance optimizer. The project aims to provide a free, privacy-focused alternative to proprietary walled gardens (Garmin Connect) and unstable legacy software (AiM Race Studio 3), granting users full ownership of their track data in standard open formats.

## **2\. Problem Statement**

* **Data Lock-in:** Garmin Catalyst data is encrypted and locked within the device or the Garmin Cloud ecosystem. Export options are limited or require "hacky" workarounds.  
* **Software Instability:** The industry-standard analysis tool, AiM Race Studio 3, is Windows-only, resource-heavy, and prone to freezing/crashing during data import.  
* **Privacy Concerns:** Existing third-party tools (like Exotherm) are often web-based, requiring users to upload sensitive location and performance data to external servers.  
* **Limited Visualization:** Users lack a lightweight, modern interface to view basic metrics like G-Sum, friction circles, and sector deltas without significant friction.

## **3\. Project Goals & Philosophy**

* **Local-First:** All data processing happens on the user's machine. No cloud uploads required.  
* **Open Formats:** Primary goal is to liberate data into **CSV**, **JSON**, and **VBO** (Racelogic) formats.  
* **Modern UX:** A responsive, crash-free interface using modern web technologies.  
* **Extensibility:** A plugin-friendly architecture allowing the community to write custom analysis scripts (e.g., "Tire Wear Estimator").

## **4\. Technical Architecture**

### **4.1. Technology Stack**

We will utilize a **TypeScript/Electron** stack. This allows for a single codebase that serves both the CLI and the GUI, ensures cross-platform compatibility (macOS/Windows/Linux), and leverages the vast ecosystem of JavaScript visualization libraries.

* **Runtime:** Node.js (Electron for GUI)  
* **Language:** TypeScript  
* **Database:** SQLite (embedded) for caching session data locally.  
* **Frontend Framework:** React (for component modularity).  
* **Visualization:** Recharts (for telemetry graphs) \+ Leaflet (for track maps).

### **4.2. Application Components**

The project will be split into two distinct modules:

#### **A. The Core (CLI / Library)**

A headless Node.js module responsible for the "ETL" (Extract, Transform, Load) process.

* **Input:** Reads raw /Garmin/SupportLogs backups (zip/tar.gz) or directly from the mounted SD card.  
* **Parser:** Decodes the internal SQLite databases or binary blobs used by Garmin.  
* **Normalizer:** Cleans 10Hz GPS data, aligns timestamps, and smooths accelerometer noise.  
* **Output:** Generates clean .csv or .json files.

#### **B. The Frontend (GUI)**

An Electron shell that wraps the Core library.

* **Dashboard:** Session list with summary stats (Best Lap, Optimal Lap, Date).  
* **Analysis View:** Interactive graphs for Speed, Delta, and G-Force.  
* **Export Manager:** One-click export to VBO (for Race Studio users) or CSV.

## **5\. Feature Specification**

### **Phase 1: The "Jailbreak" (CLI MVP)**

* **Auto-Detection:** Automatically detect a connected Garmin Catalyst via USB.  
* **Extraction:** Script to locate and unzip SupportLogs.  
* **Conversion:** Parse the primary telemetry table and output a \[Session\_Name\].csv containing:  
  * Timestamp (UTC)  
  * Latitude, Longitude, Altitude  
  * Speed (GPS calculated)  
  * Accel\_X, Accel\_Y, Accel\_Z

### **Phase 2: The "Viewer" (GUI MVP)**

* **Session Browser:** A clean, dark-mode UI to browse track days.  
* **The "Phony" Detector (G-Sum Visualizer):** A dedicated view for the Friction Circle.  
  * *Feature:* Plots Lat G vs. Long G.  
  * *Metric:* Calculates "G-Sum" (Vector sum of Gs) to show how much of the tire's potential is being used.  
* **Track Map:** A generated line map of the driven path with heat-mapping for speed.

### **Phase 3: Advanced Telemetry (The Race Studio Killer)**

* **Ghost Laps:** Overlay two laps (e.g., "Personal Best" vs. "Last Lap") to see time delta.  
* **Sector Analysis:** Automatic detection of cornering phases (Braking, Turn-in, Apex, Exit).  
* **Video Sync (Stretch Goal):** Syncing the Garmin .mp4 video files with the data timeline.

## **6\. Data Structure & Derived Metrics**

### **6.1. The Garmin Schema (Hypothetical)**

*Based on preliminary research of SupportLogs.* We expect to find a SQLite DB with a table resembling track\_data.

* **Challenge:** Timestamps may be in proprietary "Garmin Time" (seconds since 1989\) requiring conversion.  
* **Challenge:** GPS sample rate might vary; interpolation will be required to ensure a steady 10Hz or 20Hz for smooth graphing.

### **6.2. Calculated Fields (The "Value Add")**

The raw data is just points. OCDS will compute:

* **Corner\_Radius:** Derived from speed and lateral G (r \= v^2 / a).  
* **Braking\_Efficiency:** Analyzing longitudinal G decay rates.  
* **Coast\_Factor:** Identifying moments where Throttle is 0 and Brake is 0 (the "Intermediate Driver" bad habit).

## **7\. Development Roadmap**

* **Week 1-2:** Research & Reverse Engineering. Manually inspect SupportLogs SQLite structure. Write basic Python/Node script to dump tables.  
* **Week 3-4:** Build CLI Exporter. Verify CSV output against known lap times.  
* **Week 5-8:** Electron Boilerplate & UI Design. Implement basic Chart.js rendering.  
* **Week 9+:** Open Source Release (GitHub).

## **8\. User Stories (Examples)**

* *"As a user, I want to drag and drop my Garmin folder into the app and see my laps immediately without waiting for a cloud upload."*  
* *"As a developer, I want to write a script that highlights every corner where my minimum speed dropped below 45mph."*  
* *"As a data nerd, I want to export my lap to CSV so I can do pivot tables in Excel."*

### **End of Document**
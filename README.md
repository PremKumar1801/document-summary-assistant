# Document Summary Assistant

<!-- Before publishing, verify all details in this README against the official project documentation. -->

## Overview

**Document Summary Assistant** is a lightweight, client-side web application that allows users to upload text-based documents and receive a concise summary directly in the browser.

The project solves the problem of needing quick, readable summaries without relying on external services, backend servers, or paid APIs. All processing happens locally in the user's browser, which also helps keep potentially sensitive document content private.

It is intended for:

- Students reviewing notes or articles
- Professionals scanning reports or long emails
- Anyone who needs a fast summary of a text document without leaving the browser

The main purpose of the application is to provide an easy-to-use document summarization tool with a clean interface and no installation requirements.

---

## Features

- **Document upload**  
  Users can select a text-based document from their device using a standard file picker.

- **Drag-and-drop support**  
  Documents can be dragged directly into the browser window for faster input.

- **Client-side text extraction**  
  The application reads document content using the browser File API. No file is uploaded to any server.

- **Automatic text cleaning and normalization**  
  Extracted text is prepared for summarization by removing unnecessary whitespace and normalizing the content for sentence processing.

- **Summarization logic**  
  A rule-based summarization algorithm processes the extracted text and selects the most relevant sentences.

- **Summary display**  
  The generated summary is shown in a dedicated result section.

- **Loading, success, and error states**  
  The UI provides feedback while a document is being processed and displays clear messages if no valid document is selected or if an error occurs.

---

## How It Works

1. **User interaction/input**  
   The user opens the application in a web browser and selects or drags a text document into the upload area.

2. **Document processing**  
   JavaScript reads the selected file using the browser File API.

3. **Text extraction/processing**  
   The raw text is extracted from the file, cleaned, and split into sentences for analysis.

4. **Summarization**  
   The summarization logic scores the sentences based on the implemented algorithm and selects the most relevant ones to form a summary.

5. **Display of results**  
   The summary is displayed in the result section, along with any additional document information or status messages.

---

## Technologies Used

| Technology | Purpose |
| ---------- | ------- |
| HTML5 | Provides the application structure, upload area, buttons, and result containers |
| CSS3 | Handles layout, responsive design, visual styling, and UI states |
| JavaScript (ES6) | Implements file reading, text processing, summarization logic, and DOM updates |
| Browser File API | Reads user-selected documents directly in the browser |
| DOM API | Dynamically updates the interface during loading, success, and error states |

---

## Project Structure

```text
Document-Summary-Assistant/
├── index.html
├── style.css
├── script.js
└── README.md

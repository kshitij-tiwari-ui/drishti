> **Hackathon Submission:** The latest version of Drishti is available on the `main` branch. Please use this branch for evaluation. The `backup-stable` branch is maintained only as a backup.

# 👁️ Drishti – Screen Companion for Low Vision

**Making digital information more accessible, understandable, and inclusive.**

Drishti is an accessibility-focused web application designed to help people with low vision and individuals facing language barriers understand visual digital content.

Users can upload images, posters, menus, timetables, and screenshots. Drishti extracts the text, translates it into their preferred language, and reads the translated content aloud.

## ✨ Features

- **Image Upload:** Upload images in PNG, JPG, and WEBP formats.
- **OCR (Optical Character Recognition):** Extract text from images using Tesseract.js.
- **Multilingual Translation:** Translate extracted text into 130+ supported languages.
- **Text-to-Speech:** Listen to translated content using browser speech synthesis.
- **Automatic Reading:** Automatically read translated text aloud after processing.
- **High Contrast Mode:** Switch to a high-contrast interface for improved readability.
- **Text Magnification:** Increase or decrease text size according to your preference.
- **Multiple Input Methods:** Upload images, drag and drop files, or paste screenshots using Ctrl+V.
- **Basic and Advanced Modes:** A simple interface for everyday use and additional controls for advanced users.
- **Translation Options:** Choose between a free translation engine and Google Cloud Translation API.

## 🛠️ Tech Stack

- HTML5
- CSS3
- JavaScript
- Tesseract.js – OCR
- MyMemory Translation API
- Google Cloud Translation API
- Web Speech API – Text-to-Speech

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/kshitij-tiwari-ui/drishti.git
```

### 2. Navigate to the project directory

```bash
cd drishti
```

### 3. Run the application

If using the standalone HTML version, open `index.html` in a modern web browser.

If using the Flask-backed version, install the project dependencies and run:

```bash
python app.py
```

Open the local URL displayed in your terminal.

## 📖 How to Use

1. Open Drishti in your browser.
2. Upload an image, drag and drop it, or paste a screenshot.
3. Select your preferred target language.
4. Wait for the OCR and translation process to finish.
5. Read the translated text or select **Listen** to hear it aloud.
6. Use the viewing aids to adjust text size and contrast.

## 🎯 Project Objective

Drishti aims to make everyday digital information more accessible to people with low vision and individuals who face language barriers.

It focuses on assisting users in understanding visual digital content without attempting to replace a complete screen reader.

## 🔮 Future Scope

- AI-powered image and layout descriptions.
- Better recognition of complex documents and tables.
- Improved multilingual OCR support.
- More natural and accessible voice options.
- Enhanced keyboard navigation and screen-reader compatibility.
- Support for charts, diagrams, and complex visual interfaces.

IIT Jodhpur

## 📄 License

This project is currently available for demonstration and development purposes. Licensing terms can be added as the project evolves.

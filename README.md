# Chenyan-WP2

Uploading exemplary lectures (videos + transcripts + slides)
Creating transcript with Whisper
Implementing offline LLM instead of OpenAI API 
Creating User study view: 
o 5 lectures (enabling them weekly-set timer) -5 buttons -> 5 separate sub pages or dropdown menu 
o Storing 5 videos with transcripts and slides 
o Integrated Kick-Off questionnaire (before the lectures)-test infinite grated questionnaire or Qualtrics would be more robust 
o Integrated questionnaire before and after the video: students can only start lecture watching if they finished the pre-questionnaire
o Upload possibility of the downloaded chat history (requirement) 
o Log saving: chat history, settings, timestamps, uploaded images -first version is implemented
![Uploading image.png…]()




# SelfPacedStudy – Self-Paced Learning System

This is a self-directed learning platform that offers video lecture playback, AI-assisted Q&A, and learning progress management. The system is composed of a frontend UI and backend services, supporting local video uploads, automatic subtitle generation, AI-based Q&A, and timed unlocking of lecture content.

## System Requirements

- Node.js (v16+)
- npm or yarn
- Ollama (for local LLM support)
- Tesseract (for OCR-based image text recognition)

## Prerequisites

1. Install [Ollama](https://ollama.ai/download)
2. Download the required AI models:
   ```
   ollama pull llama2
   ollama pull nomic-embed-text
   ```
3. Install [Tesseract](https://github.com/tesseract-ocr/tesseract):
   - macOS: `brew install tesseract`
   - Linux: `apt-get install tesseract-ocr`
   - Windows: Install from the [official installer](https://github.com/UB-Mannheim/tesseract/wiki)

## Installation Steps

1. Clone the repository

2. Install backend dependencies:
   ```
   cd SelfPacedStudy-backend
   npm install
   npm install tesseract.js
   ```

3. Install frontend dependencies:
   ```
   cd SelfPacedStudy-ui
   npm install
   ```

## Running the System

1. Start the backend service:
   ```
   cd SelfPacedStudy-backend
   npm run dev
   ```
   The service will run at http://localhost:3000

2. Start the frontend application:
   ```
   cd SelfPacedStudy-ui
   npm run dev
   ```
   The app will run at http://localhost:3001

Note: If the default ports are occupied, the system will attempt to use alternative ports automatically. Check the console output for the actual ports in use.

## Key Features

### User Learning Interface
- Video playback and learning
- Local video upload and processing
- Slide upload and presentation
- View and export chat history

### AI-Assisted Features
- Q&A system based on video content
- Slide content retrieval and Q&A
- OCR image recognition (via screenshots or uploaded images)
- Local large language model support

### Learning Progress Management
- Lecture content unlocked in stages
- Pre- and post-lecture surveys
- Learning history tracking

## System Architecture

- **Frontend**: React application built with Next.js
- **Backend**: Express.js server providing API support
- **AI Models**: Locally hosted LLMs via Ollama
- **Data Storage**: File system (for videos and Q&A history)

## FAQ

### Service Startup Error
If you see an "address already in use" error, it means the port is occupied. Possible solutions:
1. Use a different port by modifying the `.env` file
2. Stop the process using the port and try again
3. For macOS/Linux: run `lsof -i :3000` to locate and kill the process using the port

### OCR Function Not Working
Ensure Tesseract is properly installed and accessible in the system PATH.

### AI Model Not Responding
1. Confirm that Ollama is running: `ollama serve`
2. Verify that the required models are installed: `ollama list`
3. Check backend connection logs for troubleshooting

### Video Processing Issues
If you encounter issues when uploading videos, please ensure:
1. The video format is common (e.g., MP4, WebM)
2. The file size does not exceed system limits
3. There is enough available disk space

## Developer Information

- Backend API Port: 3000  
- Frontend App Port: 3001  
- Lecture Timer: Checks every 15 seconds in test mode, every hour in normal mode

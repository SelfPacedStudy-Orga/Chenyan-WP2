# AI-Powered Real-Time Support Tool for Self-Paced Studying

## Overview

This application serves as the backbone for the SelfPacedStudy platform, offering real-time assistance and support to learners engaged in self-paced study through pre-recorded online lecture videos and accompanying slides. Our AI-powered support tool, the Lecture Learning Model (LLM), acts as a chatbot, responding to user queries based on the lecture video and slides provided. The LLM uses the lecture video and slides transcripts as context to provide more accurate answers to your questions.

The backend application is designed to handle API requests, manage memory and serve data to the frontend. This project is specifically tailored to work with GPT-4-Vision, enabling image upload functionality.

We could introduce context and memory into the models with the useful approach of [Langchain](https://js.langchain.com/docs/get_started/introduction) where the corpus of text is preprocessed by breaking it down into chunks or summaries, embedding them in a vector space, and searching for similar chunks when a question is asked.

_Developed for the Project Week at TUM._

## Getting Started

### Prerequisites

- Node.js
- npm
- GPT-4-Vision API key

### Installation

1. Clone the repository: `git clone https://github.com/SelfPacedStudy-Orga/SelfPacedStudy-backend.git`
2. Navigate to the project directory: `cd SelfPacedStudy-backend`
3. Install the dependencies: `npm install`

### Configuration

Copy the `.env.example` file and rename it to `.env`. Fill in the necessary environment variables.

## Running the Application

To start the server in development mode, run: `npm run dev`

## Project Structure

The main codebase is located in the `/src` directory. Here's a brief overview of each subdirectory:

- `/src/controllers`: This directory contains all the controller files. Controllers handle the business logic of the application.

- `/src/routes`: This directory contains all the route definitions for the Express application. Routes define the endpoints of the application.

- `/src/services`: This directory contains all the service files. Services are used for external APIs, processing data, handling complex functionalities etc.

- `/src/utils`: This directory contains utility files. These are helper functions or classes that are used across multiple files in the application.

## API Endpoints

- **Chat Endpoint (`/chats`)**: Manages incoming and outgoing chat messages.
- **Transcript Endpoint (`/transcript`)**: Initializes the context for the LLM by handling transcripts of video and slides.

## Contributing

If you want to contribute to this project, please create a new branch, make your changes, and create a pull request.

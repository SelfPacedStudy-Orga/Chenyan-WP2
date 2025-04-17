# AI-Powered Real-Time Support Tool for Self-Paced Studying

## Overview

This application serves as the user interface for the SelfPacedStudy platform, offering real-time assistance and support
to
learners engaged in self-paced study through pre-recorded online lecture videos and accompanying slides. Our AI-powered
support tool, the Lecture Learning Model (LLM), acts as a chatbot, responding to user queries based on the lecture video
and slides provided. The LLM uses the lecture video and slides transcripts as context to provide more accurate answers
to your questions.
The SelfPacedStudy is designed to be simple and easy to use, so a user would not have any distractions when studying
via. this platform.
Developed for the Project Week at TUM.

## Getting Started

### Prerequisites

- npm

### Installation

This is a [Next.js](https://nextjs.org/) project bootstrapped
with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

1. Clone the repository: `git clone https://github.com/SelfPacedStudy-Orga/SelfPacedStudy-ui.git`
2. Navigate to the project directory: `cd SelfPacedStudy-ui`
3. Install the dependencies: `npm install`

### Configuration

Copy the `.env.example` file and rename it to `.env`. Fill in the necessary environment variables.

## Running the Application

To start the server in development mode, run: `npm run dev`

## Project Structure

The main codebase is located in the `/src` directory. Here’s a brief overview of each subdirectory:

- `/src/app`: This directory contains all the main app.tsx file that `next` uses to render the components.
  For `react-native` users, this is similar to a `pages` file.
- `/src/components`: This directory contains all the React components. 
- `/src/theme`: This directory contains the theme of the app.
- `/src/utils`: This directory contains the util functions. 

## Contributing

If you want to contribute to this project, please create a new branch, make your changes, and create a pull request.
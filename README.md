# HealthForAll

There are many people in the US that don't understand English all that well or at all, and when they go to the hospital they are given documents, but because it's in english it gets hard for them to understand what the documents say.

This is a running project that will help people that don't understand english be able to read their health documents to then give them a summary of their documents in their desired language.

## Setup

1. Install dependencies:
   npm install

2. Create a `.env` file in the root directory with your API keys:
   cp .env.example .env

Then edit `.env` and add your API keys:

- `LLAMAPARSE_API_KEY` - Your LlamaParse API key
- `GEMINI_API_KEY` - Your Google Gemini API key

3. Start both servers (recommended):
   npm start

This will start both the backend server (port 3001) and frontend (port 5173) simultaneously.

**OR** run them separately in two terminals:

Terminal 1 - Backend:
npm run server

Terminal 2 - Frontend:
npm run dev

## Security

**IMPORTANT**: The `.env` file contains your API keys and is gitignored. Never commit this file to version control. The `.env.example` file is a template that can be safely committed.

## How It Works

1. User uploads a health document (PDF, DOC, DOCX, or TXT)
2. User selects a target language
3. Document is parsed using LlamaParse API
4. Parsed content is summarized in the selected language using Google Gemini
5. Summary is displayed to the user

## Troubleshooting

### "Load fail" or Connection Errors

If you're getting a "load fail" error:

1. **Make sure the backend server is running:**
   npm run server

   You should see: `Server running on http://localhost:3001`

2. **Check if the server is accessible:**
   Open your browser and go to: `http://localhost:3001/api/health`
   You should see a JSON response with `status: "ok"`

3. **Verify your `.env` file exists and has the correct API keys:**
   cat .env

   Make sure both `LLAMAPARSE_API_KEY` and `GEMINI_API_KEY` are set

4. **Check the server console for errors:**
   The server will show detailed error messages if something goes wrong with the API calls

5. **For text files (.txt):**
   The app will read them directly without using LlamaParse, which is faster and more reliable

### Common Issues

- **Server not running**: Make sure you run `npm run server` in a separate terminal
- **Port already in use**: If port 3001 is busy, change `PORT` in `server.js`
- **API key errors**: Check that your API keys are correct in the `.env` file
- **File too large**: Maximum file size is 50MB

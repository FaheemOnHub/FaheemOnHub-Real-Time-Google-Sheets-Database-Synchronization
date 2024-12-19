import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { google } from "googleapis";
import express from "express";
import open from "open";
import bodyParser from "body-parser";
import client from "./db/db.js";
import {
  getSheetData,
  sortSheetById,
  syncDatabaseToSheet,
  syncSheetToDatabase,
  deleteStudentFromDatabase,
  deleteFromSheet,
  getAllValuesFromSheet,
  updateDatabaseWithSheetValues,
} from "./controllers/googleSheetService.js";
import studentRoutes from "./routes/studentRoutes.js";
import { listenTrigger } from "./db/dbListener.js";

const app = express();
app.use(bodyParser.json());
app.use(express.json());

const PORT = 3000;
startServer();

//here we are generating the token for auth
const tokenPath = join(process.cwd(), "token.json");
const credentialsPath = join(process.cwd(), "credentials.json");
const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
export let oauth2Client;

//basic testing route
app.get("/", (req, res) => {
  res.send("Google Sheets Sync App");
});
//database crud-->
app.use("/students", studentRoutes);
// Load credentials and authorize the client
async function loadCredentials() {
  try {
    const content = await readFile(credentialsPath);
    await authorize(JSON.parse(content));
  } catch (err) {
    console.error("Error loading client secret file:", err);
  }
}

// Function to authorize the client
async function authorize(credentials) {
  const { client_secret, client_id, redirect_uris } = credentials.web;
  oauth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  try {
    const token = await readFile(tokenPath);
    oauth2Client.setCredentials(JSON.parse(token));
    // startServer();
  } catch (err) {
    // If token doesn't exist, get a new one
    await getAccessToken(oauth2Client);
  }
}

// Get and store new token if needed
async function getAccessToken(oauth2Client) {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });

  console.log("Authorize this app by visiting this URL:", authUrl);
  await open(authUrl);

  app.get("/oauth2callback", async (req, res) => {
    console.log("get is working");
    const code = req.query.code;
    if (!code) {
      return res.status(400).send("Authorization code not provided.");
    }

    try {
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      // Store the token to disk
      await writeFile(tokenPath, JSON.stringify(tokens));
      console.log("Token stored to", tokenPath);

      res.send("Authentication successful! You can close this tab.");
      // Start the server after successful authentication
      //   startServer();
    } catch (err) {
      console.error("Error retrieving access token:", err);
      res.status(500).send("Authentication failed.");
    }
  });
}
// database trigger , which gets triggered whenever a change happens in db , so to reflect the same in google sheets
listenTrigger();

// main Express server
async function startServer() {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
  await client.connect();
  console.log("Connected to PostgreSQL");
}

app.post("/sync/sheet-to-db", async (req, res) => {
  console.log("I am triggered");
  const { id, name, major } = req.body;

  if (!id) {
    return res.status(400).send("ID is required.");
  }
  const spreadsheetId = "1192ni7C1mCa8n8UxY-J70PcoipCBmBqE0vI-t1ua7aE";
  try {
    await syncSheetToDatabase(oauth2Client, spreadsheetId, id, name, major);
    res.status(200).send("Data synced from Google Sheets to Database.");
  } catch (error) {
    res.status(500).send("Error syncing data: " + error.message);
  }
});

app.post("/sync/db-to-sheet", async (req, res) => {
  const { id } = req.body;
  const spreadsheetId = "1192ni7C1mCa8n8UxY-J70PcoipCBmBqE0vI-t1ua7aE";
  try {
    await syncDatabaseToSheet(oauth2Client, spreadsheetId, id);
    sortSheetById(oauth2Client);
    res.status(200).send("Data synced from Database to Google Sheets.");
  } catch (error) {
    res.status(500).send("Error syncing data: " + error.message);
  }
});
app.post("/sync/sheet-to-db-delete", async (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).send("ID is required.");
  }
  try {
    await deleteStudentFromDatabase(id);
    res.status(200).send("Data deleted from Database.");
  } catch (error) {
    res.status(500).send("Error deleting data: " + error.message);
  }
});
app.post("/sync/db-to-sheet-delete", async (req, res) => {
  const { id } = req.body;
  const spreadsheetId = "1192ni7C1mCa8n8UxY-J70PcoipCBmBqE0vI-t1ua7aE";
  try {
    await deleteFromSheet(oauth2Client, spreadsheetId, id);
    res.status(200).send("Data deleted from Google Sheets.");
  } catch (error) {
    res
      .status(500)
      .send("Error deleting data from Google Sheets: " + error.message);
  }
});

app.post("/sync/delete-from-db", async (req, res) => {
  try {
    const sheetValues = await getAllValuesFromSheet(oauth2Client);
    await updateDatabaseWithSheetValues(sheetValues);
    res.status(200).send("Database updated based on sheet values.");
  } catch (error) {
    console.error("Error in delete-from-db:", error);
    res.status(500).send("An error occurred while updating the database.");
  }
});

loadCredentials();

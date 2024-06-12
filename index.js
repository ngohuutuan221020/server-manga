const express = require("express");
const cors = require("cors");
const fs = require("fs").promises;
const path = require("path");
const process = require("process");
const { authenticate } = require("@google-cloud/local-auth");
const { google } = require("googleapis");

const SCOPES = ["https://www.googleapis.com/auth/drive.metadata.readonly"];
const TOKEN_PATH = path.join(process.cwd(), "token.json");
const CREDENTIALS_PATH = path.join(process.cwd(), "credentials.json");

const data = [];

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file compatible with GoogleAuth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: "authorized_user",
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to call APIs.
 *
 */
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

/**
 * Lists the names and IDs of up to 10 files.
 * @param {OAuth2Client} authClient An authorized OAuth2 client.
 */
async function listFiles(authClient) {
  const drive = google.drive({ version: "v3", auth: authClient });
  const res = await drive.files.list({
    fields: "nextPageToken, files(*)",
    q: `('1FJUeENVAUTkUcwVNv2NQQmMupmPCb3mj' in parents) and (mimeType contains 'image/' or mimeType contains 'video/')`,
  });

  const files = res.data.files;

  if (files.length === 0) {
    console.log("No files found.");
    return;
  }

  console.log("Files:");
  files.map((file) => {
    data.push({
      id: file.id,
      name: file.name,
      webViewLink: file.webViewLink,
      videoMediaMetadata: file.videoMediaMetadata,
    });
    console.log(`${file.name} (${file.id})`);
  });
  console.log(data);
}
authorize().then(listFiles).catch(console.error);

const app = express();

app.use(cors());
app.get("/", (req, res) => res.send("Express on Vercel"));

app.get("/api", (req, res) => {
  res.json({
    success: true,
    dataAPI: data,
    message: "Get id, name, webViewLink, videoMediaMetadata ",
  });
});

app.listen(3001, () => console.log("Server ready on port 3000."));

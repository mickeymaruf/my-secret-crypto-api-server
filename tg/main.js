const { TelegramClient } = require("telegram");
const { getWebAppData } = require("./utils");
const { StringSession } = require("telegram/sessions");
require("dotenv").config();

const apiId = +process.env.API_ID;
const apiHash = process.env.API_HASH;

const loginUser = async (stringSession) => {
  const client = new TelegramClient(
    new StringSession(stringSession),
    apiId,
    apiHash,
    {
      connectionRetries: 5,
    }
  );

  try {
    // Connect the client
    await client.connect();

    // Check if the session is already valid
    if (!client.session.authKey) {
      console.log("Session not valid, starting login process.");
      return null;
    }

    const webAppData = await getWebAppData(client);
    return webAppData;
  } catch (error) {
    if (error.code === 420) {
      // FloodWaitError
      console.error(
        `FloodWaitError: A wait of ${error.seconds} seconds is required.`
      );
      // await new Promise((resolve) => setTimeout(resolve, error.seconds * 1000)); // Wait for the specified time
      await new Promise((resolve) => setTimeout(resolve, 10 * 1000)); // Wait for the specified time
      return loginUser(stringSession); // Retry login after the wait
    }

    console.error("An error occurred during login:", error);
    throw error; // Rethrow the error for handling in the Express endpoint
  } finally {
    await client.disconnect(); // Always disconnect
    await client.destroy(); // destroy for TIMEOUT log in console
  }
};

module.exports = loginUser;

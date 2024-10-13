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

const loginMultipleUsers = async (userPhoneNumbers) => {
  const client = new TelegramClient(new StringSession(), apiId, apiHash, {
    connectionRetries: 5,
  });

  try {
    await client.connect();

    // Fetch data for all users in parallel
    const results = await Promise.all(
      userPhoneNumbers.map(async (phoneNumber) => {
        const stringSession = getSession(phoneNumber);
        const userClient = new TelegramClient(stringSession, apiId, apiHash, {
          connectionRetries: 5,
        });

        try {
          // Start the login process if session isn't valid
          if (!userClient.session.authKey) {
            await userClient.start({
              phoneNumber: () => phoneNumber,
              password: getPassword,
              phoneCode: getPhoneCode,
              onError: (err) => console.error("Login error:", err),
            });
            saveUserSession(phoneNumber, userClient.session.save());
          }

          // Fetch WebAppData for the user
          return await getWebAppData(userClient);
        } catch (err) {
          console.error(`Error for ${phoneNumber}:`, err);
          throw err; // Continue for other users even if one fails
        } finally {
          await userClient.disconnect(); // Always disconnect after each user's operation
        }
      })
    );

    return results; // Return all users' webAppData
  } catch (error) {
    console.error("Error occurred during login process:", error);
    throw error;
  } finally {
    await client.disconnect(); // Close the Telegram client connection
  }
};

module.exports = loginUser;

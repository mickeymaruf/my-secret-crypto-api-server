const { TelegramClient } = require("telegram");
const {
  getPhoneNumber,
  getPassword,
  getPhoneCode,
  closeInput,
} = require("./inputHandler");
const { StringSession } = require("telegram/sessions");
require("dotenv").config();

const apiId = +process.env.API_ID;
const apiHash = process.env.API_HASH;

(async () => {
  console.log("Creating a new session...");

  const phoneNumber = await getPhoneNumber();
  const stringSession = new StringSession(""); // Start with an empty session string

  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: () => phoneNumber,
    password: getPassword,
    phoneCode: getPhoneCode,
    onError: (err) => console.log(err),
  });

  console.log("New session created:", client.session.save()); // Print new session to the terminal

  await client.disconnect();
  closeInput();
})();

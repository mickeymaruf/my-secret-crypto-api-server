const { TelegramClient } = require("telegram");
const { getSession, saveUserSession } = require("./sessions");
const {
  getPhoneNumber,
  getPassword,
  getPhoneCode,
  closeInput,
} = require("./inputHandler");
require("dotenv").config();

const apiId = +process.env.API_ID;
const apiHash = process.env.API_HASH;

(async () => {
  console.log("Loading interactive example...");

  const phoneNumber = await getPhoneNumber();
  const stringSession = getSession(phoneNumber);

  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: () => phoneNumber,
    password: getPassword,
    phoneCode: getPhoneCode,
    onError: (err) => console.log(err),
  });

  console.log("You should now be connected.");

  // Save the new or updated session
  saveUserSession(phoneNumber, client.session.save());

  await client.disconnect();
  closeInput();
})();

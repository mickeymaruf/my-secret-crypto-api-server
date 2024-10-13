const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function getPhoneNumber() {
  return new Promise((resolve) =>
    rl.question("Please enter your number: ", resolve)
  );
}

async function getPassword() {
  return new Promise((resolve) =>
    rl.question("Please enter your password: ", resolve)
  );
}

async function getPhoneCode() {
  return new Promise((resolve) =>
    rl.question("Please enter the code you received: ", resolve)
  );
}

function closeInput() {
  rl.close();
}

module.exports = {
  getPhoneNumber,
  getPassword,
  getPhoneCode,
  closeInput,
};

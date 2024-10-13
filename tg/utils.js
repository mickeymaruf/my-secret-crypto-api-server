const { Api } = require("telegram/tl");

async function getWebAppData(client) {
  const notcoin = await client.getEntity("notpixel");

  const msg = await client.invoke(
    new Api.messages.RequestWebView({
      peer: notcoin,
      bot: notcoin,
      platform: "android",
      url: "https://notpx.app/",
    })
  );

  // Parsing WebApp Data from URL
  let webappdataGlobal = msg.url
    .split("https://notpx.app/#tgWebAppData=")[1]
    .replace("%3D", "=")
    .split("&tgWebAppVersion=")[0]
    .replace("%26", "&");

  const decodedData = decodeURIComponent(webappdataGlobal);
  const userData = decodedData.split("&user=")[1].split("&auth")[0];
  webappdataGlobal = decodedData.replace(userData, userData);
  return webappdataGlobal;
}

module.exports = {
  getWebAppData,
};

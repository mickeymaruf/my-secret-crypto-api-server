const express = require("express");
const router = express.Router();
const { default: axios } = require("axios");
const loginUser = require("../../tg/main");
const client = require("../../db/mongodb");

function getRandomPixelData() {
  const colors = ["#FFFFFF", "#000000", "#00CC78", "#BE0039"];
  const randomPixel =
    Math.floor(Math.random() * (990 - 100 + 1) + 100) * 1000 +
    Math.floor(Math.random() * (990 - 100 + 1) + 100);
  const data = {
    pixelId: randomPixel,
    newColor: colors[Math.floor(Math.random() * colors.length)],
  };

  return data;
}

const claimMining = async (webAppData) => {
  try {
    const { data } = await axios("https://notpx.app/api/v1/mining/claim", {
      headers: {
        Authorization: `initData ${webAppData}`,
      },
    });

    return data;
  } catch (error) {
    console.log(error.response?.data);
  }
};

const getStatus = async (webAppData) => {
  try {
    const { data } = await axios("https://notpx.app/api/v1/mining/status", {
      headers: {
        Authorization: `initData ${webAppData}`,
      },
    });

    return data;
  } catch (error) {
    console.log(error.response?.data);
    throw new Error("Fetching status failed");
  }
};

const handlePaint = async (webAppData, payload) => {
  try {
    const { data } = await axios.post(
      "https://notpx.app/api/v1/repaint/start",
      // getRandomPixelData(),
      payload,
      {
        headers: {
          Authorization: `initData ${webAppData}`,
        },
      }
    );

    return data;
  } catch (error) {
    console.log(error.response?.data);
    throw new Error("Painting failed");
  }
};

// database
const db = client.db("blum");
const usersCollection = db.collection("users");

router.get("/paint", async (req, res) => {
  try {
    const stringSession = process.env.mickeymaruf;
    const webAppData = await loginUser(stringSession);

    if (!webAppData) return res.status(401).send({ error: "No key found!" });

    // claim
    let claimed = 0;
    const claim = await claimMining(webAppData);

    if (claim?.claimed) {
      claimed = claim?.claimed;
    }

    const status = await getStatus(webAppData);
    const userBalance = Math.floor(status?.userBalance);

    if (status?.charges) {
      for (let i = 1; i <= status?.charges; i++) {
        await handlePaint(webAppData, {
          pixelId: 933347,
          newColor: "#3690EA",
        });
      }
    }

    res.send({
      success: `${status?.charges || 0} paints painted!`,
      balance: userBalance,
      claimed,
    });
  } catch (error) {
    res.send({ error: error.response?.data });
  }
});

router.get("/paint/all", async (req, res) => {
  try {
    const usersData = await usersCollection
      .find()
      .project({ query: 0 })
      .toArray();
    const users = usersData.slice(1, -3);

    const results = await Promise.allSettled(
      users.map(async (user) => {
        const sessionString = process.env[user.username];

        if (!sessionString) {
          return {
            user: user.username,
            error: "User session not found.",
          };
        }

        try {
          const webAppData = await loginUser(sessionString);

          // Claim
          let claimed = 0;
          const claim = await claimMining(webAppData);
          if (claim?.claimed) claimed = claim?.claimed;

          const status = await getStatus(webAppData);
          const userBalance = Math.floor(status?.userBalance);

          if (status?.charges) {
            for (let i = 1; i <= status?.charges; i++) {
              await handlePaint(webAppData, {
                pixelId: 590949,
                newColor: "#000000",
              });
            }
          }

          return {
            user: user.username,
            success: `${status?.charges || 0} paints painted!`,
            balance: userBalance,
            claimed,
          };
        } catch (error) {
          return {
            user: user.username,
            error: error.message,
          };
        }
      })
    );

    // Separate successful and failed results
    const successfulResults = results.filter(
      (result) => result.status === "fulfilled" && !result.value.error
    );
    const failedResults = results.filter(
      (result) => result.status === "fulfilled" && result.value.error
    );

    // Send back the summary of operations
    res.send({
      message: "Processed users",
      successfulResults,
      failedResults,
    });
  } catch (error) {
    res.send({ error: error.response?.data });
  }
});

module.exports = router;

const express = require("express");
const router = express.Router();

// database connection
const client = require("../../db/mongodb");
const { default: axios } = require("axios");
const tomarketUsersCollection = client.db("blum").collection("tomarket-users");

const claimFarm = async (user) => {
  try {
    const { data: claimedData } = await axios.post(
      "https://api-web.tomarket.ai/tomarket-game/v1/farm/claim",
      { game_id: user.game_id },
      { headers: { Authorization: user.token } }
    );
    return claimedData;
  } catch (error) {
    console.log(error);
    throw new Error("Claiming farm failed");
  }
};

const startFarm = async (user) => {
  try {
    const { data: startedData } = await axios.post(
      "https://api-web.tomarket.ai/tomarket-game/v1/farm/start",
      { game_id: user.game_id },
      { headers: { Authorization: user.token } }
    );
    return startedData;
  } catch (error) {
    throw new Error("Starting farm failed");
  }
};

const getUserBalance = async (user) => {
  try {
    const { data: balance } = await axios.post(
      "https://api-web.tomarket.ai/tomarket-game/v1/user/balance",
      {},
      { headers: { Authorization: user.token } }
    );
    return balance;
  } catch (error) {
    throw new Error("Fetching balance failed");
  }
};

router.get("/users", async (req, res) => {
  const result = await tomarketUsersCollection
    .find()
    .project({ query: 0 })
    .sort({ createdAt: -1 })
    .toArray();

  const users = result.map((user) => {
    const secretTaskExpired =
      !user.secretTaskClaimedAt ||
      new Date() - new Date(user.secretTaskClaimedAt) > 24 * 60 * 60 * 1000;

    return {
      ...user,
      secretTaskExpired,
    };
  });

  res.send(users);
});

router.post("/users", async (req, res) => {
  const { username, query, game_id, token } = req.body;

  if (!username)
    return res.status(404).send({ message: "must provide username!" });

  const result = await tomarketUsersCollection.insertOne({
    username,
    token,
    query,
    game_id,
  });

  res.send(result);
});

router.put("/users", async (req, res) => {
  const { username, query, game_id, token } = req.body;

  if (!username)
    return res.status(404).send({ message: "must provide username!" });

  const result = await tomarketUsersCollection.updateOne(
    { username },
    {
      $set: { username, token, query, game_id },
    }
  );

  res.send(result);
});

router.post("/balance", async (req, res) => {
  try {
    const { data } = await axios.post(
      "https://api-web.tomarket.ai/tomarket-game/v1/user/balance",
      {
        game_id: "53b22103-c7ff-413d-bc63-20f6fb806a07",
      },
      {
        headers: {
          Authorization: req.headers.authorization,
        },
      }
    );

    res.send(data);
  } catch (error) {
    console.log(error);
    res.send(error);
  }
});

router.get("/start/all", async (req, res) => {
  try {
    const users = await tomarketUsersCollection.find().toArray();

    const results = await Promise.allSettled(
      users.map(async (user) => {
        try {
          const { data: prevBalance } = await getUserBalance(user);
          const hasFarmingEnded =
            !prevBalance?.farming ||
            prevBalance.farming.end_at < prevBalance.timestamp;

          if (!hasFarmingEnded) {
            return { user: user.username, error: "Farming hasen't ended yet!" };
          }

          const claimedData = await claimFarm(user);

          if (claimedData?.status === 401) return { user, error: claimedData };

          const startedData = await startFarm(user);

          // Get the balance and update the game_id
          const balance = await getUserBalance(user);

          const gameId = balance?.data?.farming?.game_id;
          if (gameId) {
            await tomarketUsersCollection.updateOne(
              { username: user.username },
              { $set: { game_id: gameId } }
            );
          }

          return {
            user: user.username,
            balance: {
              balance: balance.data.available_balance,
              farming: balance?.data?.farming ? true : false,
            },
          };
        } catch (error) {
          return { user: user.username, error: error.message };
        }
      })
    );

    // Filter out successful and failed results
    const successfulResults = results.filter(
      (result) => result.status === "fulfilled" && !result.value.error
    );
    const failedResults = results.filter(
      (result) => result.status === "fulfilled" && result.value.error
    );

    res.send({
      message: "Processed users",
      successfulResults,
      failedResults,
    });
  } catch (error) {
    res
      .status(500)
      .send({ message: "An error occurred", error: error.message });
  }
});

router.post("/start", async (req, res) => {
  const { username } = req.body;

  const user = await tomarketUsersCollection.findOne({ username });

  try {
    const claimedData = await claimFarm(user);

    if (claimedData?.status === 401) {
      return res.send(claimedData);
    }

    const startedData = await startFarm(user);

    // Get the balance and update the game_id
    const balance = await getUserBalance(user);

    const gameId = balance?.data?.farming?.game_id;

    if (gameId) {
      const result = await tomarketUsersCollection.updateOne(
        {
          username,
        },
        {
          $set: {
            game_id: gameId,
          },
        }
      );
    }

    res.send(balance);
  } catch (error) {
    res.send(error);
  }
});

router.post("/secret_reward", async (req, res) => {
  try {
    const { data } = await axios.post(
      "https://api-web.tomarket.ai/tomarket-game/v1/tasks/hidden",
      {},
      {
        headers: {
          Authorization: req.headers.authorization,
        },
      }
    );

    const taskId = data?.data?.[0]?.taskId;
    const score = data?.data?.[0]?.score;

    if (!taskId) return res.send({ message: "TaskId not found!" });

    const { data: data2 } = await axios.post(
      "https://api-web.tomarket.ai/tomarket-game/v1/tasks/claim",
      {
        task_id: taskId,
      },
      {
        headers: {
          Authorization: req.headers.authorization,
        },
      }
    );

    const secretTaskClaimedAt = new Date();

    tomarketUsersCollection.updateOne(
      { token: req.headers.authorization },
      {
        $set: {
          secretTaskClaimedAt,
        },
      }
    );

    res.send({ ...data2, score, secretTaskClaimedAt });
  } catch (error) {
    res.send(error);
  }
});

router.post("/claim_task", async (req, res) => {
  try {
    const { data } = await axios.post(
      "https://api-web.tomarket.ai/tomarket-game/v1/tasks/claim",
      {
        task_id: req.body.task_id,
      },
      {
        headers: {
          Authorization: req.headers.authorization,
        },
      }
    );

    res.send({ ...data, score: 5000 });
  } catch (error) {
    res.send(error);
  }
});

module.exports = router;

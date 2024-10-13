const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;
const { ObjectId } = require("mongodb");
const { default: axios } = require("axios");

// middlewares
app.use(cors());
app.use(express.json());

// mongodb
const client = require("./db/mongodb");

const tomarketRoute = require("./routes/tomarket");
const notpxRoute = require("./routes/notpx");

async function run() {
  try {
    const db = client.db("blum");
    const usersCollection = db.collection("users");
    const majorUsersCollection = db.collection("major-users");
    const majorCollection = db.collection("major");
    const memefiUsersCollection = db.collection("memefi-users");

    // Departments
    app.use("/tomarket", tomarketRoute);
    app.use("/notpx", notpxRoute);

    // blum
    app.get("/users", async (req, res) => {
      const users = await usersCollection
        .find()
        .project({ query: 0 })
        .sort({ createdAt: -1 })
        .toArray();

      res.send(users);
    });

    app.post("/revalidate_token", async (req, res) => {
      if (!req.body.user)
        return res.status(404).send({ message: "User is required!" });

      const user = await usersCollection.findOne({ username: req.body.user });

      if (!user) return res.status(404).send({ message: "User not found!" });

      try {
        const { data: tokenResult } = await axios.post(
          "https://user-domain.blum.codes/api/v1/auth/refresh",
          {
            refresh: user.token,
          }
        );

        if (tokenResult?.access) {
          usersCollection.updateOne(
            { username: user.username },
            {
              $set: {
                token: tokenResult?.access,
              },
            }
          );

          console.log("AUTHORIZED_TYPE: TOKEN");

          return res.send({ token: tokenResult?.access });
        }
      } catch (error) {
        console.error(error?.response?.status, error?.response?.data);

        if (!user.query)
          return res.status(404).send({ message: "User Query not found!" });

        const { data: fullTokenData } = await axios.post(
          "https://user-domain.blum.codes/api/v1/auth/provider/PROVIDER_TELEGRAM_MINI_APP",
          {
            query: user.query,
            referralToken: "DbKeBssXV8",
          }
        );

        if (fullTokenData.token?.access) {
          usersCollection.updateOne(
            { username: user.username },
            {
              $set: {
                token: fullTokenData.token?.access,
              },
            }
          );

          console.log("AUTHORIZED_TYPE: QUERY_USER");

          return res.send({ token: fullTokenData.token?.access });
        }
      }
    });

    // major
    app.get("/major/puzzle", async (req, res) => {
      const result = await majorCollection.findOne({
        _id: new ObjectId("66fd4b380629b35198e78f5a"),
      });

      res.send(result);
    });
    app.put("/major/puzzle", async (req, res) => {
      const { choice_1, choice_2, choice_3, choice_4 } = req.body;

      const result = await majorCollection.updateOne(
        { _id: new ObjectId("66fd4b380629b35198e78f5a") },
        {
          $set: {
            choice_1,
            choice_2,
            choice_3,
            choice_4,
          },
        }
      );

      res.send(result);
    });
    app.get("/major/users", async (req, res) => {
      const result = await majorUsersCollection
        .find()
        .project({ query: 0 })
        .sort({ createdAt: -1 })
        .toArray();

      res.send(result);
    });
    app.post("/major/users", async (req, res) => {
      const { username, query, token, id } = req.body;

      if (!username)
        return res.status(404).send({ message: "must provide username!" });

      const result = await majorUsersCollection.insertOne({
        username,
        token,
        query,
        id,
      });

      res.send(result);
    });
    app.put("/major/users", async (req, res) => {
      const { username, query, token, id } = req.body;

      if (!username)
        return res.status(404).send({ message: "must provide username!" });

      const result = await majorUsersCollection.updateOne(
        { username },
        {
          $set: { username, token, query, id },
        }
      );

      res.send(result);
    });
    app.post("/major/authenticate", async (req, res) => {
      const user = await majorUsersCollection.findOne({
        username: req.body.username,
      });

      if (!user) return res.status(404).send({ message: "User not found!" });

      if (!user.query)
        return res
          .status(404)
          .send({ username: user.username, message: "User Query not found!" });

      const { data } = await axios.post("https://major.bot/api/auth/tg/", {
        init_data: user.query,
      });

      if (data?.access_token) {
        majorUsersCollection.updateOne(
          { username: user.username },
          {
            $set: {
              token: data?.access_token,
            },
          }
        );

        return res.send({ token: data?.access_token });
      }
    });

    // memefi
    app.get("/memefi/users", async (req, res) => {
      const result = await memefiUsersCollection
        .find()
        .project({ query: 0 })
        .sort({ createdAt: -1 })
        .toArray();

      res.send(result);
    });
    app.post("/memefi/users", async (req, res) => {
      const { username, token } = req.body;

      if (!username)
        return res.status(404).send({ message: "must provide username!" });

      const result = await memefiUsersCollection.insertOne({
        username,
        token,
      });

      res.send(result);
    });
    app.put("/memefi/users", async (req, res) => {
      const { username, token } = req.body;

      if (!username)
        return res.status(404).send({ message: "must provide username!" });

      const result = await memefiUsersCollection.updateOne(
        { username },
        {
          $set: { username, token },
        }
      );

      res.send(result);
    });
  } finally {
    //
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send({
    status: "success",
    message: "Blum api app is running...🥳",
  });
});

app.listen(port, () => {
  console.log(`Blum api app running on port ${port}`);
});

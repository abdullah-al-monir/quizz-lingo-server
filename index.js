const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
const app = express();
const port = process.env.PORT || 7000;
const mongoURI = process.env.MONGO_URI;

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Invalid token" });
    }

    req.user = user;
    next();
  });
};

app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
const client = new MongoClient(mongoURI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
const userCollection = client.db("quizzLingo").collection("users");
const quizzCollection = client.db("quizzLingo").collection("quizes");
async function run() {
  try {
    await client.connect();
    app.post("/users", async (req, res) => {
      try {
        const { username, email, photoURL, password } = req.body;

        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await userCollection.insertOne({
          username,
          email,
          photoURL,
          password: hashedPassword,
          score: 0,
        });
        res.send(result);
        // res.json({ message: "User registered successfully" });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });
    app.get("/users", async (req, res) => {
      let query = {};
      const userEmail = req.query.email;
      if (userEmail) {
        query.email = userEmail;
      }
      const result = await userCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/quizzes", async (req, res) => {
      const result = await quizzCollection.find().toArray();
      res.send(result);
    });

    app.post("/signIn", async (req, res) => {
      try {
        const { email, password } = req.body;

        const user = await userCollection.findOne({ email });

        if (user && (await bcrypt.compare(password, user.password))) {
          const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET);
          res.json({ token });
        } else {
          res.status(401).json({ message: "Invalid credentials" });
        }
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    app.post("/logout", verifyToken, (req, res) => {
      const token = req.headers.authorization;
      tokenBlacklist.add(token);

      res.json({ message: "Logout successful" });
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Quizz Lingo is running");
});

app.listen(port, () => {
  console.log("Server is running on port", port);
});

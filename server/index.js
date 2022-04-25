const keys = require("./keys");

// Express App Setup
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

// SCHEMA celeho procesu:                                  /--> RedisDB <-> Worker
// Net Formular -> SUBMIT -> REACT app -> Express Server -|
//                                                         \--> PostgresDB

// Vytvori Novou Express Aplikaciu = Objekt, ktory prijima a odpoveda na requesty z REACT servru/aplikacie.
const app = express();      

// CROS - Cross Origin Resource Sharing - Umozni vziat request z jednej domeny (v tomto pripade REACT Servru/Aplikacii)
// a spusti ju na uplne inej Domene/Porte (v tonmto pripade n a Express API Servru/Aplikacii) je Hostovana
app.use(cors());       

// Parsuje prichadzajuce requesty z REACT servr/app a pretvori ich na JSON hodnoty, s ktorymi pracuje Express API app
app.use(bodyParser.json()); //

// Postgres Client Setup
const { Pool } = require("pg");      // Potrebujeme POOL modul z PG kniznice
const pgClient = new Pool({          // Nad tymto POOL objektom vytvorime PG Klienta
  user: keys.pgUser,
  host: keys.pgHost,
  database: keys.pgDatabase,
  password: keys.pgPassword,
  port: keys.pgPort,
});

pgClient.on("connect", (client) => {
  client
    .query("CREATE TABLE IF NOT EXISTS values (number INT)")
    .catch((err) => console.error(err));
});

// REDIS Client Setup
const redis = require("redis");
const redisClient = redis.createClient(keys.redisPort, keys.redisHost, {
  retry_strategy: () => 1000,
});

// Podla dokumentacie - Redis potrebuje duplicitnu Connection, kvoli listeneru ...
const redisPublisher = redisClient.duplicate();

// Expres route handlers

app.get("/", (req, res) => {
  res.send("Ahoj");
});

// Najprv sa vyberie z Postgresu, ktore indexy sa uz pouzily
app.get("/values/all", async (req, res) => {
  const values = await pgClient.query("SELECT * FROM values");

  res.send(values.rows);
});

// V Redise sa hlada uz vypocitana hodnota, ked sa nenajde, vypocita ju Worker
app.get("/values/current", async (req, res) => {
  redisClient.hgetall("values", (err, values) => {
    res.send(values);
  });
});

// End Point
app.post("/values", async (req, res) => {
  const index = req.body.index;

  if (parseInt(index) > 40) {
    return res.status(422).send("Index moc vysoky");
  }

  redisClient.hset("values", index, 'Zatim nic nezadano');
  redisPublisher.publish("insert", index);
  pgClient.query("INSERT INTO values(number) VALUES($1)", [index]);

  res.send({ working: true });
});

app.listen(5000, err => {
  console.log("Nasloucham");
});


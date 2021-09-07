const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const path = require("path");


const databasePath = path.join(__dirname, "covidcases.db");

const app = express();

app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });
    app.listen(3005, () => {
      console.log("Server Running at http://localhost:3005/");
    });
  } catch (error) {
    Response.send(`DB Error: ${error.message}`);
  }
};

initializeDbAndServer();

const validatePassword = (password) => {
  return password.length > 5;
};



function authenticateToken(request, response, next) {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
}

app.post("/login/", async (req, res) => {
  const {username, password} = req.body;
  const dbUserQuery = `SELECT * FROM user_details WHERE username = '${username}';`;
  const dbUser = await database.get(dbUserQuery);
  if (dbUser === undefined) {
    res.send("Invalid User");
  } else {
    const verifyPassword = await bcrypt.compare(password, dbUser.password);
    if(verifyPassword === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      res.send(`Login Success!!   authentication token: ${jwtToken}`);
    } else {
      res.send("Invalid Password");
    }
  }
})

app.post("/register/", async (request, response) => {
  const { username, name, password } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectUserQuery = `SELECT * FROM user_details WHERE username = '${username}';`;
  const databaseUser = await database.get(selectUserQuery);

  if (databaseUser === undefined) {
    const createUserQuery = `
     INSERT INTO
      user_details (username, name, password)
     VALUES
      (
       '${username}',
       '${name}',
       '${hashedPassword}' 
      );`;
    if (validatePassword(password)) {
      await database.run(createUserQuery);
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});


app.get("/users/", async (req, res) => {
  const getUserQuery = `
    SELECT * FROM user_details;
  `;
  const users = await database.all(getUserQuery);
  res.send(users);
})



app.get("/dailycases/", authenticateToken, async (request, response) => {
  const getDailyCasesQuery = `
    SELECT
      *
    FROM
      coviddata;`;
  const dailyCasesList = await database.all(getDailyCasesQuery);
  response.send(dailyCasesList)
});

app.get("/totalcases/", authenticateToken, async (request, response) => {
  const getTotalCasesQuery = `
    SELECT SUM(reported) AS Total_Reported, SUM(active) AS Total_active, SUM(cured) AS Total_cured, SUM(deaths) AS Total_deaths
    FROM
      coviddata;`;
  const totalCasesList = await database.all(getTotalCasesQuery);
  response.send(totalCasesList);  
})

app.get("/totalactive/", authenticateToken, async (request, response) => {
  const getTotalActiveCasesQuery  =`
   SELECT SUM(active) AS active_cases FROM coviddata;`;
  const totalActiveCases = await database.all(getTotalActiveCasesQuery);
  response.send(totalActiveCases); 
})

app.get("/totaldeaths/", authenticateToken, async (request, response) => {
  const getTotalDeathCasesQuery  =`
   SELECT SUM(deaths) AS death_cases FROM coviddata;`;
  const totalDeathCases = await database.all(getTotalDeathCasesQuery);
  response.send(totalDeathCases); 
})


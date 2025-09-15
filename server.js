// server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";

// Charger les variables d'environnement depuis .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json());

// --- BASE DE DONNÉES EN MÉMOIRE (ATTENTION: données non persistantes !) ---
const usersData = {
  "user123": {
    userId: "user123",
    username: "JoueurX",
    profile: { bio: "J'adore les jeux TurboWarp!", avatarUrl: "https://example.com/avatar/joueurx.png", customStatus: "En pleine partie !" },
    scoreFields: { mainScore: 12345, level: 10, coins: 500, bestTime: 60.5 }
  },
  "user456": {
    userId: "user456",
    username: "BetaTester",
    profile: { bio: "Je teste tous les bugs !", avatarUrl: "https://example.com/avatar/betatester.png", customStatus: "Bientôt un nouveau record..." },
    scoreFields: { mainScore: 9876, level: 8, coins: 300, bestTime: 75.2 }
  },
  "user789": {
    userId: "user789",
    username: "TheWinner",
    profile: { bio: "Toujours au top du classement.", avatarUrl: "https://example.com/avatar/thewinner.png", customStatus: "En route pour la gloire !" },
    scoreFields: { mainScore: 15000, level: 12, coins: 700, bestTime: 55.0 }
  }
};

// --- ENDPOINTS EXISTANTS ET MODIFIÉS ---

// MODIFICATION ICI : L'URL racine renvoie maintenant le JSON de version (comme demandé implicitement)
app.get("/", (req, res) => {
  console.log("--> Requête GET sur / (racine)"); // LOG
  res.json({
    version: process.env.VERSION || "inconnu",
    url: process.env.PROJECT_URL || null,
    message: "Bienvenue sur le serveur Render de Dino !" // Message supplémentaire si tu veux
  });
});

// Endpoint principal : version + lien (maintenu pour compatibilité si besoin)
app.get("/version.json", (req, res) => {
  console.log("--> Requête GET sur /version.json"); // LOG
  res.json({
    version: process.env.VERSION || "inconnu",
    url: process.env.PROJECT_URL || null
  });
});


// --- NOUVEAUX ENDPOINTS POUR LES BLOCS TURBOWARP ---

// 1. GET /api/leaderboard
app.get("/api/leaderboard", (req, res) => {
  console.log("--> Requête GET sur /api/leaderboard"); // LOG
  const leaderboard = Object.values(usersData)
    .sort((a, b) => (b.scoreFields.mainScore || 0) - (a.scoreFields.mainScore || 0));
  res.json(leaderboard);
});

// 2. GET /api/users/:userId
app.get("/api/users/:userId", (req, res) => {
  const { userId } = req.params;
  console.log(`--> Requête GET sur /api/users/${userId}`); // LOG
  if (usersData[userId]) {
    res.status(200).json(usersData[userId]);
  } else {
    res.status(404).send("Utilisateur non trouvé.");
  }
});

// 3. POST /api/users
app.post("/api/users", (req, res) => {
  const { userId, username } = req.body;
  console.log(`--> Requête POST sur /api/users avec ID: ${userId}, Pseudo: ${username}`); // LOG pour l'arrivée de la requête

  if (!userId || !username) {
    console.warn(`[API /users] Erreur 400: ID ou pseudo manquant. Body: ${JSON.stringify(req.body)}`); // LOG d'erreur
    return res.status(400).send("ID utilisateur et pseudo sont requis.");
  }
  if (usersData[userId]) {
    console.warn(`[API /users] Erreur 409: Utilisateur ${userId} existe déjà.`); // LOG d'erreur
    return res.status(409).send("Un utilisateur avec cet ID existe déjà.");
  }

  usersData[userId] = {
    userId: userId,
    username: username,
    profile: {
      bio: "",
      avatarUrl: "",
      customStatus: ""
    },
    scoreFields: {
      mainScore: 0,
      level: 0
    }
  };
  console.log(`[API /users] Utilisateur '${username}' (ID: ${userId}) créé avec succès.`); // LOG de succès
  res.status(201).json({ message: `Utilisateur '${username}' (ID: ${userId}) ajouté avec succès.`, user: usersData[userId] });
});

// 4. GET /api/users/:userId/scores
app.get("/api/users/:userId/scores", (req, res) => {
  const { userId } = req.params;
  console.log(`--> Requête GET sur /api/users/${userId}/scores`); // LOG
  if (usersData[userId] && usersData[userId].scoreFields) {
    res.status(200).json(usersData[userId].scoreFields);
  } else if (usersData[userId]) {
    res.status(200).json({});
  } else {
    res.status(404).send("Utilisateur non trouvé.");
  }
});

// 5. GET /api/users/:userId/scores/:fieldName
app.get("/api/users/:userId/scores/:fieldName", (req, res) => {
  const { userId, fieldName } = req.params;
  console.log(`--> Requête GET sur /api/users/${userId}/scores/${fieldName}`); // LOG
  if (usersData[userId] && usersData[userId].scoreFields && usersData[userId].scoreFields.hasOwnProperty(fieldName)) {
    res.status(200).json(usersData[userId].scoreFields[fieldName]);
  } else {
    res.status(404).send(`Champ de score '${fieldName}' non trouvé pour l'utilisateur '${userId}'.`);
  }
});

// 6. POST /api/users/:userId/scores
app.post("/api/users/:userId/scores", (req, res) => {
  const { userId } = req.params;
  const { field, value } = req.body;
  console.log(`--> Requête POST sur /api/users/${userId}/scores pour ${field}: ${value}`); // LOG

  if (!usersData[userId]) {
    return res.status(404).send("Utilisateur non trouvé.");
  }
  if (!field || typeof value === "undefined") {
    return res.status(400).send("Champ ou valeur manquante dans la requête.");
  }

  if (!usersData[userId].scoreFields) {
    usersData[userId].scoreFields = {};
  }
  usersData[userId].scoreFields[field] = value;
  res.status(200).send(`Donnée de score '${field}' de l'utilisateur '${userId}' mise à jour à '${value}'.`);
});

// 7. POST /api/users/:userId/rename-score-field
app.post("/api/users/:userId/rename-score-field", (req, res) => {
  const { userId } = req.params;
  const { oldField, newField } = req.body;
  console.log(`--> Requête POST sur /api/users/${userId}/rename-score-field pour ${oldField} -> ${newField}`); // LOG

  if (!usersData[userId]) {
    return res.status(404).send("Utilisateur non trouvé.");
  }
  if (!oldField || !newField) {
    return res.status(400).send("Ancien ou nouveau nom de champ manquant.");
  }
  if (!usersData[userId].scoreFields || !usersData[userId].scoreFields.hasOwnProperty(oldField)) {
    return res.status(404).send(`Ancien champ de score '${oldField}' non trouvé pour l'utilisateur '${userId}'.`);
  }

  usersData[userId].scoreFields[newField] = usersData[userId].scoreFields[oldField];
  delete usersData[userId].scoreFields[oldField];
  res.status(200).send(`Champ de score '${oldField}' de l'utilisateur '${userId}' renommé en '${newField}'.`);
});


// Lancer le serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
});

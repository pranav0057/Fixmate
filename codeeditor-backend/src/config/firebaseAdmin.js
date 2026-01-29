import admin from "firebase-admin";
import serviceAccount from "../../firebase-credentials.json" with { type: "json" };
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export default admin;
// import admin from "firebase-admin";
// import fs from "fs";

// const serviceAccount = JSON.parse(
//   fs.readFileSync("/etc/secrets/firebase-credentials.json", "utf8")
// );

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
// });

// export default admin;
import client from "./db.js";
import { sortSheetById } from "../controllers/googleSheetService.js";
export async function listenTrigger() {
  try {
    await client.query("LISTEN student_change");

    client.on("notification", async (msg) => {
      console.log("Notification received with payload:", msg);
      const message = msg.payload.split(" ");
      const operation = message[0]; // Either 'Inserted', 'Updated', or 'Deleted'
      const studentId = message[3]; // The student ID
      console.log(studentId);
      if (operation === "Deleted") {
        // Handle row deletion in Google Sheets
        const response = await fetch(
          "http://localhost:3000/sync/db-to-sheet-delete",
          {
            method: "post",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: studentId }),
          }
        );

        if (!response.ok) {
          console.log("Unable to sync deletion from DB to Sheet");
        }
      } else if (operation === "Inserted" || operation === "Updated") {
        // Handle row insertion or update in Google Sheets

        const response = await fetch("http://localhost:3000/sync/db-to-sheet", {
          method: "post",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: studentId }),
        });
        if (!response.ok) {
          console.log("Unable to sync data from DB to Sheet");
        }
      }
    });
  } catch (error) {
    console.error("Error setting up PostgreSQL listener:", error);
  }
}

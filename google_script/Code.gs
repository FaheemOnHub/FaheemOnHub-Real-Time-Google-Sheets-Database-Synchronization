var lastEditTime = 0;
var syncInProgress = false;
function atEdit(e) {
  var currentTime = new Date().getTime();
  var timeDifference = currentTime - lastEditTime;
  lastEditTime = currentTime;
  if (timeDifference < 500) {
    return; // Skip this edit if it happened too soon after the last one
  }
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var range = e.range;
  var rowData = sheet
    .getRange(range.getRow(), 1, 1, sheet.getLastColumn())
    .getValues()[0];

  if (
    rowData.every(function (cell) {
      return cell === "";
    })
  ) {
    // This means the row was deleted
    const url = "https://30da-136-233-9-101.ngrok-free.app/sync/delete-from-db";

    const options = {
      method: "POST",
      contentType: "application/json",
      payload: JSON.stringify({}),
    };

    UrlFetchApp.fetch(url, options);
    Logger.log(`Delete req sent`);
  } else {
    // Get the changed data
    var row = range.getRow();
    var id = sheet.getRange(row, 1).getValue(); // Assuming the ID is in column A (1)
    var name = sheet.getRange(row, 2).getValue(); // Assuming the Name is in column B (2)
    var major = sheet.getRange(row, 3).getValue();

    Logger.log(`ID: ${id}, Name: ${name}, Major: ${major}`); // Log the values

    // Skip request if any required field is null or empty
    if (!id || !name || !major) {
      Logger.log("One or more fields are empty, aborting request.");
      return;
    }
    var url = "https://30da-136-233-9-101.ngrok-free.app/sync/sheet-to-db";

    var payload = {
      id: id,
      name: name,
      major: major,
    };

    var options = {
      method: "post",
      headers: {
        "ngrok-skip-browser-warning": "true", // Correct header value as a string
      },
      payload: JSON.stringify(payload),
      contentType: "application/json",
    };

    // var options = {
    //   method: "get",  // You can change this to "post" if needed
    //   headers: {
    //     "ngrok-skip-browser-warning": "true" // Correct header value as a string
    //   },
    // };

    try {
      var response = UrlFetchApp.fetch(url, options);
      Logger.log("Response: " + response.getContentText()); // Log the response
    } catch (error) {
      Logger.log("Error: " + error); // Log any errors
    }
  }
}

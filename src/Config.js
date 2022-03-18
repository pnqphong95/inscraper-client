// Constants
const _ = LodashGS.load();

// Global variables
var containerFile;
var containerFileId;
var configurationTable;

// Helper functions
const Config = {
  openContainerFile: function() {
    if (!containerFile) {
      if (containerFileId) {
        containerFile = SpreadsheetApp.openById(containerFileId);
      } else {
        containerFile = SpreadsheetApp.getActiveSpreadsheet();
      }
      console.log(`Re-open Container [${containerFile.getName()}] in new session.`);
    }
    return containerFile;
  }
}

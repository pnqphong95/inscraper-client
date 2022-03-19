// Constants
const _ = LodashGS.load();

// Global variables
var containerFile;
var configurationTable;

// Helper functions
const Configurer = {
  openContainerFile: function() {
    if (!containerFile) {
      const containerFileId = this.property('containerFileId');
      if (containerFileId) {
        containerFile = SpreadsheetApp.openById(containerFileId);
      } else {
        containerFile = SpreadsheetApp.getActiveSpreadsheet();
      }
      console.log(`Re-open Container [${containerFile.getName()}] in new session.`);
    }
    return containerFile;
  },
  property: function(key, val) {
    const properties = PropertiesService.getUserProperties();
    if (!val) {
      return properties.getProperty(key);
    }
    properties.setProperty(key, val);
  }
}

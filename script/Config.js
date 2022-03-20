// Constants
const _ = LodashGS.load();

// Global variables
var instancePool = {};
var services = {};
var settings = { 
  containerFile: undefined, 
  externalConfigs: undefined,
  appFolders: undefined
};

// Helper functions
const Configurer = {
  openContainerFile: function() {
    if (!settings.containerFile) {
      const containerFileId = this.getProp('containerFileId');
      if (containerFileId) {
        settings.containerFile = SpreadsheetApp.openById(containerFileId);
      } else {
        settings.containerFile = SpreadsheetApp.getActiveSpreadsheet();
      }
      if (!settings.containerFile) {
        throw new ConfigurationException('This script must be bounded by a Master Sheet. ' 
          + 'Or you have to provide your own Master Sheet ID as parameter when initialize.');
      }
      console.log(`Opening master sheet [${settings.containerFile.getName()}] in new session..`);
    }
    return settings.containerFile;
  },
  setProp: function(key, val) {
    const properties = PropertiesService.getUserProperties();
    if (!val) {
      properties.deleteProperty(key);
    } else {
      console.log(`Set ${key}=${val}`);
      properties.setProperty(key, val);
    }
  },
  getProp: function(key) {
    const properties = PropertiesService.getUserProperties();
    const propVal = properties.getProperty(key);
    return propVal;
  },
  initInstance: function(beanClass, instanceInitializerCallback) {
    if (!instancePool[beanClass]) {
      instancePool[beanClass] = instanceInitializerCallback();
      console.log(`Configure global instance [${beanClass}]`);
    }
    return instancePool[beanClass];
  }
}

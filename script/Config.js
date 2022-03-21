// Constants
const _ = LodashGS.load();

// Global variables
var instancePool = {};
var services = {};
var settings = { 
  containerFile: undefined, 
  externalConfigs: undefined,
  appFolders: undefined,
  sessionAuth: undefined
};

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
      console.log(`Opening master sheet [${settings.containerFile.getName()}] ...DONE`);
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
    }
    return instancePool[beanClass];
  },
  sessionAuth: function(retrieveSessionAuthCallback) {
    if (!settings.sessionAuth) {
      if (services.authService) {
        settings.sessionAuth = services.authService.getUnusedRecentAuth();
      } else {
        settings.sessionAuth = retrieveSessionAuthCallback();
      }
      console.log(`Configure authentication [${settings.sessionAuth['Username']}] ...DONE`);
    }
    return settings.sessionAuth;
  }
}

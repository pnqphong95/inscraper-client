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
var defaultSettings = {
  externalConfigs: {
    EXECUTION_TIMEOUT: 300000
  }
}

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
      Logger.log(`Opening master sheet [${settings.containerFile.getName()}] ...DONE`);
    }
    return settings.containerFile;
  },
  
  setProp: function(key, val) {
    const properties = PropertiesService.getUserProperties();
    if (!val) {
      properties.deleteProperty(key);
    } else {
      Logger.log(`Set ${key}=${val}`);
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
      Logger.log(`Configure authentication [${settings.sessionAuth.Username}] ...DONE`);
    }
    return settings.sessionAuth;
  },

  constructTimeout: function(timout) {
    const configuredTimeout = settings.externalConfigs.EXECUTION_TIMEOUT;
    const defaultTimeout = defaultSettings.externalConfigs.EXECUTION_TIMEOUT;
    const value = new Date(new Date().getTime() + Number(timout || configuredTimeout || defaultTimeout));
    Logger.log(`[Timer] Timeout at ` + value.toISOString());
    return value;
  },

  documentProps: function() {
    const containerFileId = this.getProp('containerFileId');
    if (containerFileId) { 
      return {
        scope: 'Script', containerFileId, 
        props: PropertiesService.getScriptProperties() 
      };
    }
    return { 
      scope: 'Document', containerFileId: this.openContainerFile().getId(), 
      props: PropertiesService.getDocumentProperties() 
    };
  },

  funcLock: function() {
    const scriptProps = PropertiesService.getScriptProperties();
    return {
      scriptProps,
      
      lock: function(funcNames) {
        const funcNameProps = {};
        funcNames.forEach(funcName => {
          funcNameProps[`FunctionLocked:${funcName}`] = true;
        });
        this.scriptProps.setProperties(funcNameProps);
        Logger.log(`[Locker] ${funcNames} is locked.`);
      },
      
      unlock: function(funcNames) {
        const success = [];
        funcNames.forEach(funcName => {
          this.scriptProps.deleteProperty(`FunctionLocked:${funcName}`);
          success.push(funcName);
        });
        Logger.log(`[Locker] ${funcNames} is unlocked.`);
      },
      
      isLocked: function(funcName) {
        return this.scriptProps.getProperty(`FunctionLocked:${funcName}`) ? true : false;
      },

      anyFuncLocked: function() {
        return this.scriptProps.getKeys().find(key => key.startsWith('FunctionLocked:')) ? true : false;
      },

      onFuncLocked(funcName, callback) {
        if (!this.isLocked(funcName)) {
          try {
            this.lock([funcName]);
            return callback();
          } finally {
            this.unlock([funcName]);
          }
        } else {
          Logger.log(`Can't trigger ${funcName}. Running instance ${funcName} is not finished yet.`);
        }
      }
    }
  },

  makeAnotherTrigger: function(funcName, minutes) {
    // Delete all other trigger "daemonDownloadMedia"
    var triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
      if (funcName === triggers[i].getHandlerFunction()) {
        ScriptApp.deleteTrigger(triggers[i]);
      }
    }
    // Create new trigger in next mins
    const trigger = ScriptApp.newTrigger(funcName).timeBased().after(minutes * 60 * 1000).create();
    Logger.log(`[${funcName}-${trigger.getUniqueId()}] Start in next ${minutes} mins.`);
  }

}

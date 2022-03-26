function initialize(options) {
  // Container must be passed to initializer first
  if (options) {
    Configurer.setProp('containerFileId', options.containerId);
  }
  try {
    
    // With container id, it loads other configs in container file
    // settings.externalConfigs must be set in order to continue other steps.
    services.externalConfigService = ExternalConfigService.instance();
    services.appDefaultInitializer = AppDefaultInitializer.instance();
    services.modelDirectoryService = ModelDirectoryService.instance();
    services.authService = AuthService.instance();
    services.modelScrapingService = ModelScrapingService.instance();
    services.mediaScrapingService = MediaScrapingService.instance();
    services.mediaDownloadingService = MediaDownloadingService.instance();

    settings.externalConfigs = services.externalConfigService.validateExternalConfigs();
    settings.appFolders = services.appDefaultInitializer.validateAppWorkspace();
    
    Configurer.sessionAuth();
        
  } catch (e) {
    Logger.log(`Failed to initialize Inscraper client!`); throw e;
  }
}

function downloadInBackground_() {
  initialize();
  const result = Configurer.funcLock().onFuncLocked("downloadInBackground_", 
    () => services.mediaDownloadingService.download());
  if (result && result.remainCount() > 0) {
    // Delete all other trigger "downloadInBackground_"
    var triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
      if ("downloadInBackground_" === triggers[i].getHandlerFunction()) {
        ScriptApp.deleteTrigger(triggers[i]);
      }
    }
    // Create new trigger in next 2 mins
    const trigger = ScriptApp.newTrigger("downloadInBackground_").timeBased().after(2 * 60 * 1000).create();
    Logger.log(`Function downloadInBackground_ [${trigger.getUniqueId()}] start in next 2 mins`);
  }
}
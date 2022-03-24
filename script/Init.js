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
    services.mediaDownloadingService = MediaDownloadingService.instance();

    settings.externalConfigs = services.externalConfigService.validateExternalConfigs();
    settings.appFolders = services.appDefaultInitializer.validateAppWorkspace();
    
    Configurer.sessionAuth();
        
  } catch (e) {
    Logger.log(`Failed to initialize Inscraper client!`); throw e;
  }
}
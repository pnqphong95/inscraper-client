function initialize({ containerId }) {
  // Container must be passed to initializer first
  Configurer.setProp('containerFileId', containerId);
  try {
    
    // With container id, it loads other configs in container file
    // settings.externalConfigs must be set in order to continue other steps.
    services.externalConfigService = ExternalConfigService.instance();
    services.appDefaultInitializer = AppDefaultInitializer.instance();
    services.modelDirectoryService = ModelDirectoryService.instance();

    settings.externalConfigs = services.externalConfigService.validateExternalConfigs();
    settings.appFolders = services.appDefaultInitializer.validateAppWorkspace();
    services.modelDirectoryService.setupModelDirectory();
        
    // Other initializing steps
    services.authService = AuthService.instance();

  } catch (e) {
    console.error(`Failed to initialize Inscraper client!`); throw e;
  }
}
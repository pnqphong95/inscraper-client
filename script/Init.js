function initialize({ containerId }) {
  // Container must be passed to initializer first
  Configurer.setProp('containerFileId', containerId);
  try {
    
    // With container id, it loads other configs in container file
    // settings.externalConfigs must be set in order to continue other steps.
    settings.externalConfigs = ExternalConfigService.instance().validateExternalConfigs();
        
    // Other initializing steps
    services.authService = AuthService.instance();

  } catch (e) {
    console.error(`Failed to initialize Inscraper client!`); throw e;
  }
}
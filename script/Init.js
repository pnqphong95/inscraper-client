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

function download5_() {
  initialize(); 
  services.mediaDownloadingService.download(5);
}

function download10_() {
  initialize();
  services.mediaDownloadingService.download(10);
}

function download_() {
  initialize();
  services.mediaDownloadingService.download();
}

function setupNewModels_() {
  initialize();
  services.modelDirectoryService.setupModelsDirectory();
}

function scanAllModels_() {
  initialize();
  services.modelDirectoryService.setupModelsDirectory(true);
}

function onOpen() {
  var menu = [
    {name: "⬇ 5-models download", functionName: "download5_"},
    {name: "⬇ 10-models download", functionName: "download10_"},
    {name: "⬇ All-models download", functionName: "download_"}, null,
    {name: "🛠 Setup new models", functionName: "setupNewModels_"},
    {name: "🛠 Re-scan models", functionName: "scanAllModels_"}, null,
    {name: "☎️ Help & Support",functionName: "help_"}
  ];  
  SpreadsheetApp.getActiveSpreadsheet().addMenu("Inscraper", menu);
}
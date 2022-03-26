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
    services.mediaFileService = MediaFileService.instance();

    settings.externalConfigs = services.externalConfigService.validateExternalConfigs();
    settings.appFolders = services.appDefaultInitializer.validateAppWorkspace();
    
    Configurer.sessionAuth();
        
  } catch (e) {
    Logger.log(`Failed to initialize Inscraper client!`); throw e;
  }
}

function daemonScrapeModel() {
  initialize();
  const result = Configurer.funcLock().onFuncLocked("daemonScrapeModel", 
    () => services.modelScrapingService.scrapeNotUpdateRecentModels());
  if (result && result.remainCount() > 0) {
    const modelNames = result.remainItems.map(model => model.Username);
    Logger.log(`${result.remainCount()} remaining models not scrape success! ${modelNames}`);
    // Create new trigger in next 3 mins
    Configurer.makeAnotherTrigger("daemonScrapeModel", 3);
  }
}

function daemonScrapeMediaSource() {
  initialize();
  const result = Configurer.funcLock().onFuncLocked("daemonScrapeMediaSource", 
    () => services.mediaScrapingService.scrapeNotUpdateRecentModels());
  if (result && result.remainCount() > 0) {
    const modelNames = result.remainItems.map(model => model.Username);
    Logger.log(`${result.remainCount()} remaining models not scrape source success! ${modelNames}`);
    // Create new trigger in next 3 mins
    Configurer.makeAnotherTrigger("daemonScrapeMediaSource", 3);
  }
}

function daemonDownloadMedia() {
  initialize();
  const result = Configurer.funcLock().onFuncLocked("daemonDownloadMedia", 
    () => services.mediaDownloadingService.download());
  if (result && result.remainCount() > 0) {
    const modelNames = result.remainItems.map(model => model.Username);
    Logger.log(`${result.remainCount()} remaining models not download success! ${modelNames}`);
    // Create new trigger in next 3 mins
    Configurer.makeAnotherTrigger("daemonDownloadMedia", 3);
  }
}

function daemonScanPhotoFolders() {
  initialize();
  const result = Configurer.funcLock().onFuncLocked("daemonScanPhotoFolders", 
    () => services.mediaFileService.scanPhotoFolders());
  if (result && result.remainCount() > 0) {
    // Create new trigger in next 3 mins
    Configurer.makeAnotherTrigger("daemonScanPhotoFolders", 3);
  }
}
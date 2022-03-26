function onDialogDisplay(callback, modal) {
  if (modal && modal.modalStart) {
    SpreadsheetApp.getUi().showModalDialog(HtmlService
      .createHtmlOutput(modal.modalStart.html ? modal.modalStart.html : '')
      .setWidth(900), modal.modalStart.title ? modal.modalStart.title : 'Process started...'
    );
  }
  callback();
  SpreadsheetApp.getUi().showModalDialog(HtmlService
    .createHtmlOutput(Logger.getLog().replace(/(?:\r\n|\r|\n)/g, '<br>'))
    .setWidth(900), 'Process finished!'
  );
}

function scrape_() {
  const modalStart = { html: 'Wait a few minutes to scrape new model medias!' };
  onDialogDisplay(() => {
    initialize();
    services.modelScrapingService.scrapeNotUpdateRecentModels();
  }, { modalStart });
}

function scrapeMediaSource_() {
  const modalStart = { html: 'Wait a few minutes to scrape medias source!' };
  onDialogDisplay(() => {
    initialize();
    services.mediaScrapingService.scrapeNotUpdateRecentModels();
  }, { modalStart });
}

function download_() {
  const modalStart = { html: 'Wait a few minutes to get media download!' };
  onDialogDisplay(() => downloadInBackground_(), { modalStart });
}

function setupNewModels_() {
  const modalStart = { html: 'Wait a few minutes to setup new models!' };
  onDialogDisplay(() => {
    initialize();
    services.modelDirectoryService.setupModelsDirectory();
  }, { modalStart });
}

function scanAllModels_() {
  const modalStart = { html: 'Wait a few minutes to scan all models!' };
  onDialogDisplay(() => {
    initialize();
    services.modelDirectoryService.setupModelsDirectory(true);
  }, { modalStart });
}

function cleanup_() {
  onDialogDisplay(() => {
    PropertiesService.getDocumentProperties().deleteAllProperties();
    PropertiesService.getScriptProperties().deleteAllProperties();
  });
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('InscraperClient')
    .addItem("🌔 Scrape model", "scrape_")
    .addItem("🌕 Scrape source", "scrapeMediaSource_")
    .addItem("📦 Download", "download_")
    .addItem("📝 Setup new models", "setupNewModels_")
    .addItem("🗑 Cleanup", "cleanup_")
    .addSeparator()
    .addItem("🔍 Re-scan models", "scanAllModels_")
    .addToUi();
}
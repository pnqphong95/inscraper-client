function scrape10_() {
  initialize();
  SpreadsheetApp.getUi().showModalDialog(HtmlService
    .createHtmlOutput('<p>Wait a few minutes to get new model medias!</p>')
    .setWidth(900), 'Scraping in process...'
  );
  services.modelScrapingService.scrapeNotUpdateRecentModels(10);
  SpreadsheetApp.getUi().showModalDialog(HtmlService
    .createHtmlOutput(Logger.getLog().replace(/(?:\r\n|\r|\n)/g, '<br>'))
    .setWidth(900), 'Scraping finished'
  );
}

function scrapeByUsername_() {
  initialize();
  const timeout = Configurer.constructTimeout();
  var ui = SpreadsheetApp.getUi();
  var response = ui.prompt('Enter model username: ');
  if (response.getSelectedButton() == ui.Button.OK) {
    SpreadsheetApp.getUi().showModalDialog(HtmlService
      .createHtmlOutput('<p>Wait a few minutes to get new model medias!</p>')
      .setWidth(900), 'Scraping in process...'
    );
    services.modelScrapingService.scrapeModelsByName(response.getResponseText(), timeout);
    SpreadsheetApp.getUi().showModalDialog(HtmlService
      .createHtmlOutput(Logger.getLog().replace(/(?:\r\n|\r|\n)/g, '<br>'))
      .setWidth(900), 'Scraping finished'
    );
  }
}

function scrape_() {
  initialize();
  SpreadsheetApp.getUi().showModalDialog(HtmlService
    .createHtmlOutput('<p>Wait a few minutes to get new model medias!</p>')
    .setWidth(900), 'Scraping in process...'
  );
  services.modelScrapingService.scrapeNotUpdateRecentModels();
  SpreadsheetApp.getUi().showModalDialog(HtmlService
    .createHtmlOutput(Logger.getLog().replace(/(?:\r\n|\r|\n)/g, '<br>'))
    .setWidth(900), 'Scraping finished'
  );
}

function download10_() {
  initialize();
  SpreadsheetApp.getUi().showModalDialog(HtmlService
    .createHtmlOutput('<p>Wait a few minutes to get media download!</p>')
    .setWidth(900), 'Download in process...'
  );
  services.mediaDownloadingService.download(10);
  SpreadsheetApp.getUi().showModalDialog(HtmlService
    .createHtmlOutput(Logger.getLog().replace(/(?:\r\n|\r|\n)/g, '<br>'))
    .setWidth(900), 'Download finished'
  );
}

function download_() {
  initialize();
  SpreadsheetApp.getUi().showModalDialog(HtmlService
    .createHtmlOutput('<p>Wait a few minutes to get media download!</p>')
    .setWidth(900), 'Download in process...'
  );
  services.mediaDownloadingService.download();
  SpreadsheetApp.getUi().showModalDialog(HtmlService
    .createHtmlOutput(Logger.getLog().replace(/(?:\r\n|\r|\n)/g, '<br>'))
    .setWidth(900), 'Download finished'
  );
}

function setupNewModels_() {
  initialize();
  SpreadsheetApp.getUi().showModalDialog(HtmlService
    .createHtmlOutput('<p>Wait a few minutes to setup new models!</p>')
    .setWidth(900), 'Setting up...'
  );
  services.modelDirectoryService.setupModelsDirectory();
  SpreadsheetApp.getUi().showModalDialog(HtmlService
    .createHtmlOutput(Logger.getLog().replace(/(?:\r\n|\r|\n)/g, '<br>'))
    .setWidth(900), 'Setup finished'
  );
}

function scanAllModels_() {
  initialize();
  SpreadsheetApp.getUi().showModalDialog(HtmlService
    .createHtmlOutput('<p>Wait a few minutes to setup new models!</p>')
    .setWidth(900), 'Setting up...'
  );
  services.modelDirectoryService.setupModelsDirectory(true);
  SpreadsheetApp.getUi().showModalDialog(HtmlService
    .createHtmlOutput(Logger.getLog().replace(/(?:\r\n|\r|\n)/g, '<br>'))
    .setWidth(900), 'Setup finished'
  );
}

function onOpen() {
  SpreadsheetApp.getUi().createAddonMenu()
    .addItem("⬇ Scrape 10-models", "scrape10_")
    .addItem("⬇ Scrape {username}", "scrapeByUsername_")
    .addItem("⬇ Scrape all", "scrape_")
    .addSeparator()
    .addItem("⬇ Download 10-models", "download10_")
    .addItem("⬇ Download all", "download_")
    .addSeparator()
    .addItem("🛠 Setup new models", "setupNewModels_")
    .addItem("🛠 Re-scan models", "scanAllModels_")
    .addToUi();
}
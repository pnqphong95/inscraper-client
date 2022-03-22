class ModelRepository {

  static instance() {
    return Configurer.initInstance('ModelRepository', () => new ModelRepository());
  }
  
  constructor() {
    this.Sheet = Configurer.openContainerFile(); 
    Tamotsu.initialize(this.Sheet);
    this.Model = Tamotsu.Table.define({ idColumn: 'Username', sheetName: 'Model', rowShift: 1 });
  }

  updateModel(model, params) {
    model['Locked'] = '';
    this.refreshUrl(model);
    if (params) {
      if (params.locked === undefined || !params.locked) {
        model['Locked'] = '';
      } else {
        model['Locked'] = 'YES';
      }
      if (params.lastUpdated) {
        model['Last Updated'] = new Date().toISOString();
      }
      if (params.lastDownloaded) {
        model['Last Downloaded'] = new Date().toISOString();
      }
    }
    model.save();
  }

  refreshUrl(model) {
    model['Metadata'] = `=HYPERLINK("https://docs.google.com/spreadsheets/d/${model['Metadata ID']}", "View")`;
    model['Photo Folder'] = `=HYPERLINK("https://drive.google.com/drive/folders/${model['Photo Folder ID']}", "Open folder")`;
  }

  getActiveUnlockedModels(amount) {
    const models = this.Model
      .where(model => ModelRepository.isActiveAndUnlocked(model))
      .order(ModelRepository.lastUpdatedComparator).all();
    return amount ? models.slice(0, amount) : models;
  }

  getModelsNotSetup(amount) {
    const models = this.Model
      .where(model => ModelRepository.isActiveAndUnlocked(model))
      .where(model => !ModelRepository.isModelSetupDone(model))
      .order(ModelRepository.lastUpdatedComparator).all();
    return amount ? models.slice(0, amount) : models;
  }

  getReadyToDownloadModels(amount) {
    const models = this.Model.where(model => ModelRepository.readyToDownload(model))
      .order(ModelRepository.lastDownloadedComparator).all();
    return amount ? models.slice(0, amount) : models.slice(0, 5);
  }

  getReadyToScrapeModels(amount) {
    const models = this.Model.where(model => ModelRepository.readyToScrape(model))
      .order(ModelRepository.lastUpdatedComparator).all();
    return amount ? models.slice(0, amount) : models.slice(0, 5);
  }

  static readyToDownload(model) {
    return ModelRepository.readyToScrape(model) && model['Photo Folder ID'] !== '';
  }

  static readyToScrape(model) {
    return ModelRepository.isActiveAndUnlocked(model) && model['Metadata ID'] !== '';
  }

  static isActiveAndUnlocked(model) {
    return model['Inactive'] === '' && model['Locked'] === '';
  }

  static isModelSetupDone(model) {
    return model['Metadata ID'] !== '' && model['Photo Folder ID'] !== '';
  }

  static lastUpdatedComparator(modelOne, modelTwo) {
    if (!modelOne['Last Updated'] && modelTwo['Last Updated']) return -1;
    if (modelOne['Last Updated'] && !modelTwo['Last Updated']) return 1;
    if (!modelOne['Last Updated'] && !modelTwo['Last Updated']) return 0;
    const lastUpdatedModelOne = new Date(modelOne['Last Updated']);
    const lastUpdatedModelTwo = new Date(modelTwo['Last Updated']);
    if (lastUpdatedModelOne < lastUpdatedModelTwo) return -1;
    if (lastUpdatedModelOne > lastUpdatedModelTwo) return 1;
    return 0;
  }

  static lastDownloadedComparator(modelOne, modelTwo) {
    if (!modelOne['Last Downloaded'] && modelTwo['Last Downloaded']) return -1;
    if (modelOne['Last Downloaded'] && !modelTwo['Last Downloaded']) return 1;
    if (!modelOne['Last Downloaded'] && !modelTwo['Last Downloaded']) return 0;
    const lastDownloadedModelOne = new Date(modelOne['Last Downloaded']);
    const lastDownloadedModelTwo = new Date(modelTwo['Last Downloaded']);
    if (lastDownloadedModelOne < lastDownloadedModelTwo) return -1;
    if (lastDownloadedModelOne > lastDownloadedModelTwo) return 1;
    return 0;
  }

}
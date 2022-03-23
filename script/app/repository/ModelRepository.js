class ModelRepository {

  static instance() {
    return Configurer.initInstance('ModelRepository', () => new ModelRepository());
  }
  
  constructor() {
    this.propertyService = Configurer.documentProps();
    this.Sheet = Configurer.openContainerFile(); 
    Tamotsu.initialize(this.Sheet);
    this.Model = Tamotsu.Table.define({ idColumn: 'Username', sheetName: 'Model', rowShift: 1 });
  }

  updateModel(model, params) {
    this.refreshUrl(model);
    if (params) {
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

  getActiveModels(amount) {
    const models = this.Model
      .where(model => !this.isModelLock(model))
      .where(model => ModelRepository.isActive(model))
      .order(ModelRepository.lastUpdatedComparator).all();
    return amount ? models.slice(0, amount) : models;
  }

  getModelsNotSetup(amount) {
    const models = this.Model
      .where(model => !this.isModelLock(model))
      .where(model => ModelRepository.isActive(model))
      .where(model => !ModelRepository.isModelSetupDone(model))
      .order(ModelRepository.lastUpdatedComparator).all();
    return amount ? models.slice(0, amount) : models;
  }

  getReadyToDownloadModels(amount) {
    const models = this.Model
      .where(model => !this.isModelLock(model))
      .where(model => ModelRepository.readyToDownload(model))
      .order(ModelRepository.lastDownloadedComparator).all();
    return amount ? models.slice(0, amount) : models.slice(0, 10);
  }

  getReadyToScrapeModels(amount) {
    const models = this.Model
      .where(model => !this.isModelLock(model))
      .where(model => ModelRepository.readyToScrape(model))
      .order(ModelRepository.lastUpdatedComparator).all();
    return amount ? models.slice(0, amount) : models.slice(0, 5);
  }

  lockModels(models) {
    const containerFileId = this.propertyService.containerFileId;
    const props = this.propertyService.props;
    const lockModelProps = {}, modelUsernames = [];
    models.forEach(model => {
      lockModelProps[`${containerFileId}:Model_Lock:${model.Username}`] = true;
      modelUsernames.push(model.Username);
    });
    console.log(`[${this.propertyService.scope}] Lock ${modelUsernames.length} ` 
      + `models for processing: ${modelUsernames}`);
    props.setProperties(lockModelProps);
  }

  unlockModels(models) {
    const containerFileId = this.propertyService.containerFileId;
    const props = this.propertyService.props;
    const modelUsernames = [];
    models.forEach(model => {
      props.deleteProperty(`${containerFileId}:Model_Lock:${model.Username}`);
      modelUsernames.push(model.Username);
    });
    console.log(`[${this.propertyService.scope}] ` 
      + `Unlocked ${modelUsernames.length} models: ${modelUsernames}`);
  }

  isModelLock(model) {
    const containerFileId = this.propertyService.containerFileId;
    const props = this.propertyService.props;
    return props.getProperty(`${containerFileId}:Model_Lock:${model.Username}`) ? true : false;
  }

  static readyToDownload(model) {
    return ModelRepository.readyToScrape(model);
  }

  static readyToScrape(model) {
    return ModelRepository.isActive(model) && ModelRepository.isModelSetupDone(model);
  }

  static isActive(model) {
    return model['Inactive'] === '';
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
class ModelLockingRepository {

  static instance() {
    return Configurer.initInstance('ModelLockingRepository', () => new ModelLockingRepository());
  }
  
  constructor() {
    this.propertyService = Configurer.documentProps();
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

  onModelLocked(items, callback) {
    try {
      this.lockModels(items);
      return callback(items);
    } finally {
      this.unlockModels(items);
    }
  }

}
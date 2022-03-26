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
    props.setProperties(lockModelProps);
    Logger.log(`[Locker] Lock ${modelUsernames.length} models: ${modelUsernames}`);
  }

  lockModel(model) {
    const lockModelProps = {};
    const props = this.propertyService.props;
    const containerFileId = this.propertyService.containerFileId;
    lockModelProps[`${containerFileId}:Model_Lock:${model.Username}`] = true;
    props.setProperties(lockModelProps);
    Logger.log(`[${model.Username}] Model is locked.`);
  }

  unlockModels(models) {
    const containerFileId = this.propertyService.containerFileId;
    const props = this.propertyService.props;
    const unlockUsernames = [];
    models.forEach(model => {
      if (this.isModelLock(model)) {
        unlockUsernames.push(model.Username);
      }
      props.deleteProperty(`${containerFileId}:Model_Lock:${model.Username}`);
    });
    if (unlockUsernames.length > 0) {
      Logger.log(`[Locker] Unlock ${unlockUsernames.length} models. \n${unlockUsernames}`);
    }
    Logger.log(`[Locker] Remaining lock: ${props.getKeys().length}`);
  }

  unlockModel(model) {
    const props = this.propertyService.props;
    const containerFileId = this.propertyService.containerFileId;
    props.deleteProperty(`${containerFileId}:Model_Lock:${model.Username}`);
    Logger.log(`[${model.Username}] Model is unlocked.`);
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
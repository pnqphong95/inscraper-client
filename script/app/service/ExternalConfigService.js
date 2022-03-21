const REQUIRED_CONFIGS = {
  loginUrl: '',
  userUrl: '',
  mediaUrl: '',
  rootMediaFolderId: ''
}
Object.freeze(REQUIRED_CONFIGS);

/**
 * @class ExternalConfigService used to load external configuration from Master Sheet.
 * It validates if required configs are properly configured in the _Master Sheet_.
 */
class ExternalConfigService {

  static delayInitializer() {
    return new ExternalConfigService(
      Configurer.initInstance('ExternalConfigRepository', () => new ExternalConfigRepository())
    );
  }

  static instance() {
    return Configurer.initInstance('ExternalConfigService', ExternalConfigService.delayInitializer);
  }

  constructor(configRepo) {
    this.configRepo = configRepo;
  }

  validateExternalConfigs() {
    const requiredConfigKeys = Object.keys(REQUIRED_CONFIGS);
    const configObj = {};
    const externalConfigs = this.configRepo.getAll();
    if (!externalConfigs) {
      throw new ConfigurationException(ExternalConfigService.errorMessages.readMasterSheetError);
    }
    for(var i = 0; i < externalConfigs.length; i++) {
      const key = externalConfigs[i]['Key'];
      const value = externalConfigs[i]['Value'];
      if (value && value !== '') {
        configObj[key] = value;
        _.remove(requiredConfigKeys, (k) => key === k);
      }
    }
    if (requiredConfigKeys.length > 0) {
      throw new ConfigurationException(
        ExternalConfigService.errorMessages.missingRequiredConfig(requiredConfigKeys));
    }
    return configObj;
  }

  static get errorMessages() {
    return {
      readMasterSheetError: 'Failed to load external config from master sheet. Make sure master sheet structure is correct.',
      missingRequiredConfig: (keys) => `Missing required configs [${keys}]. Make sure it available in master sheet.`
    }
  }

}
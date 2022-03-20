const REQUIRED_CONFIGS = {
  loginUrl: 'loginUrl',
  userUrl: 'userUrl',
  mediaUrl: 'mediaUrl'
}
Object.freeze(REQUIRED_CONFIGS);

/**
 * @class ExternalConfigService used to load external configuration from Master Sheet.
 * It validates if required configs are properly configured in the _Master Sheet_.
 */
class ExternalConfigService {

  static instance() {
    return new this(Configurer.initInstance('ExternalConfigRepository', () => new ExternalConfigRepository()));
  }

  constructor(configRepo) {
    this.configRepo = configRepo;
  }

  validateExternalConfigs() {
    const requiredConfigKeys = Object.values(REQUIRED_CONFIGS);
    const configObj = {};
    const externalConfigs = this.configRepo.getAll();
    if (!externalConfigs) {
      throw new ConfigurationException(ExternalConfigService.errorMessages.readMasterSheetError);
    }
    for(var i = 0; i < externalConfigs.length; i++) {
      const require = externalConfigs[i]['Required'];
      const key = externalConfigs[i]['Key'];
      const value = externalConfigs[i]['Value'];
      if (require && require.toLowerCase() === 'yes') {
        if (value && value !== '') {
          configObj[key] = value;
          _.remove(requiredConfigKeys, (k) => key === k);
        }
      } else {
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
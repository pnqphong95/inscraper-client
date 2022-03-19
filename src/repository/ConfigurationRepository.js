class ConfigurationRepository {

  static newInstance() {
    return new this();
  }

  constructor() {
    this.Sheet = Configurer.openContainerFile(); 
    Tamotsu.initialize(this.Sheet);
    this.Configuration = Tamotsu.Table.define({ idColumn: 'Key', sheetName: 'Configuration', rowShift: 1 });
  }

  getAllAsObject() {
    const configObj = {};
    const configs = this.Configuration.all();
    for(var i = 0; i < configs.length; i++) {
      configObj[configs[i]['Key']] = configs[i]['Value'];
    }
    return configObj;
  }

}
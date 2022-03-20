class ExternalConfigRepository {

  static instance() {
    return Configurer.initInstance('ExternalConfigRepository', () => new ExternalConfigRepository());
  }

  constructor() {
    this.Sheet = Configurer.openContainerFile(); 
    Tamotsu.initialize(this.Sheet);
    this.Configuration = Tamotsu.Table.define({ idColumn: 'Key', sheetName: 'Configuration', rowShift: 1 });
  }

  getAll() {
    return this.Configuration.all();
  }

}
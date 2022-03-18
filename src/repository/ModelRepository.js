class ModelRepository {

  static newInstance() {
    return new this();
  }
  
  constructor() {
    this.Sheet = Config.openContainerFile(); 
    Tamotsu.initialize(this.Sheet);
    this.Model = Tamotsu.Table.define({ idColumn: 'Username', sheetName: 'Model', rowShift: 1 });
  }

  activeModels(amount) {
    let models = this.Model.where({ Disable: false }).all();
    return amount ? models.slice(0, amount) : models;
  }

}
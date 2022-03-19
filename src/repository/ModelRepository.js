const MODEL_STATE = {
  NEW: 'NEW',
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE'
}
Object.freeze(MODEL_STATE);

class ModelRepository {

  static newInstance() {
    return new this();
  }
  
  constructor() {
    this.Sheet = Configurer.openContainerFile(); 
    Tamotsu.initialize(this.Sheet);
    this.Model = Tamotsu.Table.define({ idColumn: 'Username', sheetName: 'Model', rowShift: 1 });
  }

  activeModels(amount) {
    const models = this.Model.where({ State: MODEL_STATE.ACTIVE }).all();
    return amount ? models.slice(0, amount) : models;
  }

  getNewModels() {
    return this.Model.where({ State: MODEL_STATE.NEW })
      .where({ 'Metadata URL': '' }).all(); 
  }

}
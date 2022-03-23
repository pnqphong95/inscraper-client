const TEMPLATE_IDS = {
  metadataTemplateId: '1F7reJifHJcWmxKDmKd5sekGOoxuJbok55hTt-jpOszs'
}
Object.freeze(TEMPLATE_IDS);

class ModelDirectoryService {

  static delayInitializer() {
    return new ModelDirectoryService(
      Configurer.initInstance('ModelRepository', () => new ModelRepository())
    );
  }

  static instance() {
    return Configurer.initInstance('ModelDirectoryService', ModelDirectoryService.delayInitializer);
  }

  constructor(modelRepo) {
    this.modelRepo = modelRepo;
    this.metadataTemplate = DriveApp.getFileById(TEMPLATE_IDS.metadataTemplateId);
  }

  setupModelsDirectory({ rescanAll, modelCount }) {
    const metadataFolder = settings.appFolders.Metadata;
    const instagramPhotoFolder = settings.appFolders.InstagramPhoto;
    if (!metadataFolder || !instagramPhotoFolder) {
      throw new ConfigurationException(ModelDirectoryService.errorMessages.appFoldersMissing);
    }
    var models;
    try {
      if (rescanAll) {
        models = this.modelRepo.getActiveModels(modelCount); this.modelRepo.lockModels(models);
        SwissKnife.executeLoop(models, model => this.scanModelDirectory(model), {});
      } else {
        models = this.modelRepo.getModelsNotSetup(modelCount); this.modelRepo.lockModels(models);
        SwissKnife.executeLoop(models, model => this.setupModelDirectory(model), {});
      }
      return models;
    } finally {
      this.modelRepo.unlockModels(models);
    }
  }

  setupModelDirectory(model) {
    const metadataFolder = settings.appFolders.Metadata;
    const instagramPhotoFolder = settings.appFolders.InstagramPhoto;
    if (!metadataFolder || !instagramPhotoFolder) {
      throw new ConfigurationException(ModelDirectoryService.errorMessages.appFoldersMissing);
    }
    this.setupModelMetadataTemplate(model, metadataFolder);
    this.setupModelPhotoFolder(model, instagramPhotoFolder);
    this.modelRepo.updateModel(model);
  }

  scanModelDirectory(model) {
    const metadataFolder = settings.appFolders.Metadata;
    const instagramPhotoFolder = settings.appFolders.InstagramPhoto;
    if (!metadataFolder || !instagramPhotoFolder) {
      throw new ConfigurationException(ModelDirectoryService.errorMessages.appFoldersMissing);
    }
    const modelMetadata = metadataFolder.getFilesByName(model.Username);
    if (modelMetadata.hasNext()) {
      const modelMetadataId = modelMetadata.next().getId();
      model['Metadata ID'] = modelMetadataId;
      model['Last Updated'] = new Date().toISOString();
    }
    const modelPhotoFolder = instagramPhotoFolder.getFoldersByName(model.Username);
    if (modelPhotoFolder.hasNext()) {
      model['Photo Folder ID'] = modelPhotoFolder.next().getId();
      model['Last Updated'] = new Date().toISOString();
    }
    this.modelRepo.updateModel(model);
    console.log(`[${model.Username}] Check Metadata and Photo folder are up-to-date ...DONE`);
  }

  setupModelMetadataTemplate(model, metadataFolder) {
    if (!model['Metadata ID'] || model['Metadata ID'] === '') {
      const modelMetadata = ModelDirectoryService.forceCopyNew(this.metadataTemplate, metadataFolder, model.Username);
      model['Metadata ID'] = modelMetadata.getId();
      model['Last Updated'] = new Date().toISOString();
    }
  }

  setupModelPhotoFolder(model, photoFolder) {
    if (!model['Photo Folder ID'] || model['Photo Folder ID'] === '') {
      const modelPhotoFolder = ModelDirectoryService.createFolderIfNotExist(photoFolder, model.Username);
      model['Photo Folder ID'] = modelPhotoFolder.getId();
      model['Last Updated'] = new Date().toISOString();
    }
  }

  static forceCopyNew(fileToCopy, destFolder, newFileName) {
    const matches = destFolder.getFilesByName(newFileName);
    while (matches.hasNext()) {
      const match = matches.next();
      const matchNewName = match.getName() + '_deprecated';
      match.setName(matchNewName);
      console.log(`[${newFileName}] Found existing file ${match.getName()}, rename to ${matchNewName} ...DONE`);
    }
    console.log(`[${newFileName}] Clone new ${fileToCopy.getName()} to ${destFolder.getName()} ...DONE`);
    return fileToCopy.makeCopy(newFileName, destFolder);
  }

  static createFolderIfNotExist(parentFolder, folderName) {
    const matches = parentFolder.getFilesByName(folderName);
    if (matches.hasNext()) {
      return matches.next();
    }
    console.log(`[${folderName}] Create new photo folder under ${parentFolder.getName()} ...DONE`);
    return parentFolder.createFolder(folderName);
  }

  static get errorMessages() {
    return {
      appFoldersMissing: `App folder is missing doesn't setup properly. Go to root media folder and check manually.`
    }
  }

}
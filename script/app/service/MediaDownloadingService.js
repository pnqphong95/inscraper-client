class MediaDownloadingService {

  static delayInitializer() {
    return new MediaDownloadingService(ModelRepository.instance());
  }

  static instance() {
    return Configurer.initInstance('MediaDownloadingService', MediaDownloadingService.delayInitializer);
  }

  constructor(modelRepo) {
    this.modelRepo = modelRepo;
  }

  download(modelCount) {
    const downloadTimeout = settings.externalConfigs.downloadTimeout;
    const defaultTimeout = defaultSettings.externalConfigs.downloadTimeout;
    const timeout = new Date(new Date().getTime() + Number(downloadTimeout || defaultTimeout));
    const models = this.modelRepo.getActiveModelHasMetadataOrderByLastDownload(modelCount);
    console.log(`Download medias for models: ${models.map(i => i.Username)}`);
    SwissKnife.runInLoop(models, (model, index, collector) => {
      const successModel = this.downloadModelMedia(model, timeout);
      if (successModel) {
        this.modelRepo.updateHyperlink(model);
        model['Last Downloaded'] = new Date().toISOString();
        model.save();
        collector.success.push(successModel);
      }
    }, { timeout });
  }

  downloadModelMedia(model, timeout) {
    const metadataRepo = ModelMetadataRepository.instance(model);
    const medias = metadataRepo.getMediaReadyToDownload();
    if (medias.length === 0) {
      console.log(`[${model.Username}] No media to process.`);
      return model;
    } else {
      const photoFolder = DriveApp.getFolderById(model['Photo Folder ID']);
      const partitioned = MediaDownloadingService.partitionMedia(photoFolder, medias);
      const updateIdResult = this.saveDriveIdToExistingMedia(metadataRepo, partitioned.ignores, timeout);
      const downloadResult = this.downloadModelMediaByChunk(metadataRepo, photoFolder, partitioned.downloads, { timeout });
      const totalSuccess = downloadResult.success.length + updateIdResult.success.length;
      console.log(`[${model.Username}] ${totalSuccess}/${medias.length} medias are processed. ` 
        + `Download new ${downloadResult.success.length}/${partitioned.downloads.length} medias, ` 
        + `Update ${updateIdResult.success.length}/${partitioned.ignores.length} existing medias.`);
      if (totalSuccess === medias.length) {
        return model;
      }
    }
  }

  downloadModelMediaByChunk(metadataRepo, photoFolder, medias, { timeout }) {
    return SwissKnife.runCallbackInChunk(medias, (collector, workingMedias) => {
      try {
        var responses = UrlFetchApp.fetchAll(workingMedias.map(media => media['Download URL']));
        SwissKnife.runInLoop(responses, (resp, i) => {
          if (resp.getResponseCode() === 200) {
            const mediaFile = photoFolder.createFile(resp.getBlob());
            workingMedias[i]['Drive ID'] = mediaFile.getId();
            metadataRepo.updateHyperlink(workingMedias[i]); workingMedias[i].save();
            collector.success.push(workingMedias[i]);
          } else {
            collector.error.push(workingMedias[i]);
          }
        }, { timeout });
        console.log(`[${photoFolder.getName()}] Downloaded ${collector.success.length}/${medias.length} ...`);
      } catch (e) {
        const ids = workingMedias.map(i => i['Media ID']);
        console.log(`[${photoFolder.getName()}] Unable to download bundle of medias ${ids}`);
        collector.error = collector.error.concat(workingMedias);
      }
    }, { cSize: 5, timeout });
  }

  saveDriveIdToExistingMedia(metadataRepo, existingMedias, timeout) {
    return SwissKnife.runCallbackInChunk(existingMedias, (collector, workingMedias) => {
      const result = SwissKnife.runInLoop(workingMedias, (media, i, collector) => {
        metadataRepo.updateHyperlink(media); media.save();
        collector.success.push(media);
      }, {});
      collector.success = collector.success.concat(result.success);
    }, { timeout });
  }

  static partitionMedia(modelPhotoFolder, medias) {
    var downloads = [], ignores = [];
    for(var i = 0; i < medias.length; i++) {
      const url = medias[i]['Download URL'];
      try {
        var urlParts = url.split('?')[0].split('/');
        var nameWithExtension = urlParts[urlParts.length - 1];
        const matches = modelPhotoFolder.getFilesByName(nameWithExtension);
        if (!matches.hasNext()) {
          downloads.push(medias[i]);
        } else {
          medias[i]['Drive ID'] = matches.next().getId();
          ignores.push(medias[i]);
        }
      } catch (error) {
        console.log(`[${modelPhotoFolder.getName()}] Ignore media ${medias[i]['Media ID']} due to download link partition error.`, error);
        ignores.push(medias[i]);
      }
    }
    return { downloads, ignores };
  }

}
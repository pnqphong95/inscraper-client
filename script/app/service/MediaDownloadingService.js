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
    const endTime = new Date(new Date().getTime() + 5 * 60000);
    const models = this.modelRepo.getActiveModelHasMetadata(modelCount);
    SwissKnife.runInLoop(models, (model, result, endTime) => {
      const modelMetadataRepo = ModelMetadataRepository.instance(model);
      const medias = modelMetadataRepo.getMediaReadyToDownload();
      if (medias.length > 0) {
        const modelPhotoFolder = DriveApp.getFolderById(model['Photo Folder ID']);
        const partitioned = MediaDownloadingService.partitionMedia(modelPhotoFolder, medias);
        const downloadResult = this.downloadByChunk(modelPhotoFolder, partitioned.downloads, { endTime });
        // Existing file will be ignored and count as download success
        downloadResult.success = downloadResult.success.concat(partitioned.ignores);
        if (downloadResult.success.length === medias.length) {
          this.modelRepo.updateModel(model);
        }
      }
    }, { timeout: endTime });
  }

  downloadByChunk(modelPhotoFolder, medias, { endDate }) {
    return SwissKnife.runCallbackInChunk(medias, (result, workingMedias) => {
      try {
        var responses = UrlFetchApp.fetchAll(workingMedias.map(media => media['Download URL']));
        for(var i = 0; i < responses.length; i++) {
          if (responses[i].getResponseCode() === 200) {
            const file = modelPhotoFolder.createFile(responses[i].getBlob());
            workingMedias[i]['Drive ID'] = file.getId();
            result.success.push(workingMedias[i]);
          } else {
            result.error.push(workingMedias[i]);
          }
        }
        console.log(`[${modelPhotoFolder.getName()}] Downloaded ${result.success.length}/${medias.length} ...`);
      } catch (e) {
        const ids = workingMedias.map(item => item['Media ID']);
        console.log(`[${modelPhotoFolder.getName()}] Unable to download bundle of medias ${ids}`);
        result.error = result.error.concat(workingMedias);
      }
    }, { cSize: 10, timeout: endDate });
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
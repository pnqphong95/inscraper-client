class MediaScrapingService {

  static delayInitializer() {
    return new MediaScrapingService(
      ModelRepository.instance(), ModelLockingRepository.instance()
    );
  }

  static instance() {
    return Configurer.initInstance('MediaScrapingService', MediaScrapingService.delayInitializer);
  }

  constructor(modelRepo, modelLockingRepo) {
    this.modelRepo = modelRepo;
    this.modelLockingRepo = modelLockingRepo;
  }

  scrapeMediasByModelName(modelUsername, timeout) {
    const model = this.modelRepo.getModelByUsername(modelUsername);
    if (model) {
      return this.scrapeMediaSource([model], timeout);
    } else {
      Logger.log(`[${modelUsername}] Not found model by provided username.`);
    }
  }

  scrapeNotUpdateRecentModels(modelCount) {
    const timeout = Configurer.constructTimeout();
    const sessionAuth = Configurer.sessionAuth();
    const models = this.modelRepo.getReadyToScrapeModels(modelCount);
    const accessibleModels = this.filterAccessibleModels(models, sessionAuth);
    return this.scrapeMediaSource(accessibleModels, timeout);
  }

  filterAccessibleModels(models, sessionAuth) {
    return models.filter(model => {
      const followList = model['Followed By'] === '' ? [] : JSON.parse(model['Followed By']);
      const isAccessible = followList.includes(sessionAuth.Username) || model['Private Profile'] === '';
      if (!isAccessible) Logger.log(`[${model}] Model private profile is inaccessible.`);
      return isAccessible;
    });
  }

  scrapeMediaSource(models, timeout) {
    this.modelLockingRepo.onModelLocked(models, (items) => {
      SwissKnife.executeLoopWithTimeout(timeout, items, (model, i, collector) => {
        const successModel = this.fetchModelMediaSource(model, timeout);
        if (successModel) {
          this.modelRepo.updateModel(successModel, { lastUpdated: true });
          collector.success(successModel);
        }
      });
    });
  }

  fetchModelMediaSource(model, timeout) {
    const noSourceRepo = MediaNoSourceRepository.instance(model);
    const downloadRepo = MediaDownloadRepository.instance(model);
    const medias = noSourceRepo.getMediaReadyToGetSource();
    if (medias.length === 0) {
      Logger.log(`[${model.Username}] All medias are processed.`);
      // Unlock this model immediately if no media to download
      this.modelLockingRepo.unlockModel(model);
      return model;
    } else {
      const options = { timeout, pageSize: 10 };
      const result = SwissKnife.pageableLoopWithOptions(options, medias, (items, collector) => {
        const mediaShortCodes = items.map(m => m['Short Code']);
        const fetchResult = this.fetchModelMediaSourceRecursively(model, mediaShortCodes, timeout);
        // Sidecar can have multiple images, so images are child of sidecar media.
        const mediasByParent = this.transformToListParentChilds(fetchResult.successObj);
        const moveResult = this.moveMediaToDownloadList(downloadRepo, noSourceRepo, mediasByParent, timeout);
        Logger.log(`[${model.Username}] Fetch ${mediasByParent.length}/${medias.length} medias from server. `
          + `Move ${moveResult.successCount()}/${medias.length} medias to Media sheet, `);
        collector.success(moveResult.successItems);
      });
      if (result.successCount() === medias.length) {
        return model;
      }
    }
  }

  fetchModelMediaSourceRecursively(model, inputShortCodes, timeout) {
    const collector = { successObj: {}, errorShortCodes: [] };
    if (inputShortCodes.length === 0) return collector;
    if (timeout && timeout <= new Date()) return collector;
    try {
      const requestBody = MediaScrapingService.scrapingMediaRequest(inputShortCodes);
      const response = UrlFetchApp.fetch(settings.externalConfigs.mediaUrl, requestBody);
      if (response.getResponseCode() === 200) {
        const mediaData = JSON.parse(response.getContentText());
        // Collector pick-up success (mediaData.data) and error (mediaData.error_remains)
        collector.successObj = { ...collector.successObj, ...mediaData.data };
        collector.errorShortCodes = collector.errorShortCodes.concat(mediaData.error_remains)
        // Fetch recursive and continute collect remaining items (mediaData.remains)
        const subCollector = this.fetchModelMediaSourceRecursively(model, mediaData.remains, timeout);
        collector.successObj = { ...collector.successObj, ...subCollector.successObj };
        collector.errorShortCodes = collector.errorShortCodes.concat(subCollector.errorShortCodes);
      }
    } catch (error) {
      Logger.log(`[${model.Username}] Unable to fetch from shortcodes ${JSON.stringify(inputShortCodes)}\n${error}`);
      collector.errorShortCodes = collector.errorShortCodes.concat(inputShortCodes);
    }
    return collector;
  }

  moveMediaToDownloadList(downloadRepo, noSourceRepo, mediasByParent, timeout) {
    const options = { timeout, pageSize: 2 };
    return SwissKnife.pageableLoopWithOptions(options, mediasByParent, (items, collector) => {
      const moveResult = SwissKnife.executeLoopWithTimeout(timeout, items, (mediaParentPair, i, moveCollector) => {
        if (noSourceRepo.deleteMediaById(mediaParentPair.parentKey)) {
          const mediasToCreate = mediaParentPair.childMedias.map(media => {
              return {
                'Media ID': media.id,
                'Short Code': media.shortcode,
                'Type': media.type,
                'Timestamp': media.taken_at_timestamp,
                'Caption': media.caption,
                'Download URL': media.source
              };
          });
          if (mediasToCreate.length > 0) {
            const createds = downloadRepo.batchCreate(mediasToCreate);
            if (createds.length === mediasToCreate.length) {
              moveCollector.success(mediaParentPair);
            }
          }
        }
      });
      collector.allSuccess(moveResult.successItems);
    });
  }

  transformToListParentChilds(fetchResultData) {
    const parentKeys = Object.keys(fetchResultData);
    return parentKeys.map(parentKey => {
      return { parentKey, childMedias: fetchResultData[parentKey] };
    });
  }

  static scrapingMediaRequest(shortcodes) {
    const sessionAuth = Configurer.sessionAuth();
    return {
      method: 'post',
      contentType: 'application/json',
      payload: Utilities.jsonStringify({
        requestCookie: sessionAuth['Request Cookie'],
        csrfToken: sessionAuth['CSRF Token'],
        timeoutInSecond: 22,
        shortcodes
      })
    };
  }



}
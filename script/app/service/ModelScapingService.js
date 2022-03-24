class ModelScrapingService {

  static delayInitializer() {
    return new ModelScrapingService(
      ModelRepository.instance(), ModelLockingRepository.instance()
    );
  }

  static instance() {
    return Configurer.initInstance('ModelScrapingService', ModelScrapingService.delayInitializer);
  }

  constructor(modelRepo, modelLockingRepo) {
    this.modelRepo = modelRepo;
    this.modelLockingRepo = modelLockingRepo;
  }

  scrapeAndStoreModelMetadatas(modelCount) {
    const timeout = Configurer.constructTimeout();
    const models = this.modelRepo.getReadyToScrapeModels(modelCount);
    this.modelLockingRepo.onModelLocked(models, (items) => {
      const options = { pageSize: 3, timeout };
      SwissKnife.pageableLoopWithOptions(options, items, (processingItems, collector) => {
        const scrapeResult = this.scrapeModels(processingItems);
        collector.allError(scrapeResult.error);
        const storeResult = this.storeModels(scrapeResult.successItems);
        collector.allError(storeResult.error);
      });
    });
  }

  scrapeModels(models) {
    const collector = { success: [], remain: [], error: [] };
    try {
      const requests = models.map(model => ModelScrapingService.scrapingRequest(model));
      var responses = UrlFetchApp.fetchAll(requests);
      SwissKnife.executeLoop(responses, (resp, i) => {
        if (resp.getResponseCode() === 200) {
          models[i].scrapeResponse = JSON.parse(resp.getContentText());
          Logger.log(`[${models[i].Username}] Scrape model metadata ...DONE. ` 
            + `Found ${models[i].scrapeResponse.data.length} new medias.`);
          collector.success(models[i]);
        } else {
          Logger.log(`[${models[i].Username}] Scrape model metadata ...FAILED`);
          collector.error(models[i]);
        }
      }, {});
    } catch (e) {
      Logger.log(`${JSON.stringify(models.map(i => i.Username))} Scrape model metadata ...FAILED\n${e}`);
      collector.allError(models);
    }
    return collector;
  }

  storeModels(models) {
    return SwissKnife.executeLoop(models, (model, i, collector) => {
      const storeMetaResult = this.storeModelMetadatas(model);
      const modelInfo = model.scrapeResponse.user;
      model['Instagram ID'] = modelInfo.id;
      model['Name'] = modelInfo.name;
      if (storeMetaResult.undones.length === 0) {
        model['Timeline Media Count'] = modelInfo.timeline_media_count;
      } else {
        model['Timeline Media Count'] = modelInfo.timeline_media_count - storeMetaResult.undones.length;
      }
      delete model.scrapeResponse;
      this.modelRepo.updateModel(model, { lastUpdated: true });
      collector.success(model);
    }, {});
  }

  storeModelMetadatas(model) {
    const medias = model.scrapeResponse.data, dones = []; var undones = [];
    if (medias.length > 0) {
      try {
        const mediaHasSource = []; const mediaNoSource = [];
        for (var i = 0; i < medias.length; i++) {
          const media = medias[i];
          if (media.fulfilled_source) {
            mediaHasSource.push({
              'Media ID': media.id,
              'Short Code': media.shortcode,
              'Type': media.type,
              'Timestamp': media.taken_at_timestamp,
              'Caption': media.caption,
              'Download URL': media.source
            });
          } else {
            mediaNoSource.push({
              'Media ID': media.id,
              'Short Code': media.shortcode,
              'Type': media.type,
              'Timestamp': media.taken_at_timestamp,
              'Caption': media.caption,
              'Download URL': ''
            });
          }
        }
        if (mediaHasSource.length > 0) {
          dones.push(MediaDownloadRepository.instance(model).batchCreate(mediaHasSource));
        }
        if (mediaNoSource.length > 0) {
          dones.push(MediaNoSourceRepository.instance(model).batchCreate(mediaNoSource));
        }
      } catch (e) {
        undones = medias.filter(item => !dones.includes(item));
        Logger.log(`[${model.Username}] Store ${dones.length}/${medias.length}. Remaining: ${undones.length}\n${e}`);
      }
    }
    
    return { model, dones, undones };
  }

  static scrapingRequest(model) {
    const sessionAuth = Configurer.sessionAuth();
    const mediaCount = model['Timeline Media Count'] || 0;
    return {
      url: `${settings.externalConfigs.userUrl}/${model.Username}`,
      method: 'post',
      contentType: 'application/json',
      payload: Utilities.jsonStringify({
        requestCookie: sessionAuth['Request Cookie'],
        csrfToken: sessionAuth['CSRF Token'],
        last_timeline_media_count: mediaCount
      })
    };
  }

}
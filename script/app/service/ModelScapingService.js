class ModelScrapingService {

  static delayInitializer() {
    return new ModelScrapingService(ModelRepository.instance());
  }

  static instance() {
    return Configurer.initInstance('ModelScrapingService', ModelScrapingService.delayInitializer);
  }

  constructor(modelRepo) {
    this.modelRepo = modelRepo;
  }

  scrapeAndStoreModelMetadatas(modelCount) {
    const models = this.modelRepo.getReadyToScrapeModels(modelCount);
    try {
      const timeout = Configurer.constructTimeout();
      this.modelRepo.lockModels(models);
      SwissKnife.pageableLoop(models, (workingModels, collector) => {
        const scrapeResult = this.scrapeModels(workingModels);
        collector.allError(scrapeResult.error);
        const storeResult = this.storeModels(scrapeResult.successItems);
        collector.allError(storeResult.error);
      }, { timeout });
    } finally {
      this.modelRepo.unlockModels(models);
    }
  }

  scrapeModels(models) {
    const collector = { success: [], remain: [], error: [] };
    try {
      const requests = models.map(model => ModelScrapingService.scrapingRequest(model));
      var responses = UrlFetchApp.fetchAll(requests);
      SwissKnife.executeLoop(responses, (resp, i) => {
        if (resp.getResponseCode() === 200) {
          models[i].scrapeResponse = JSON.parse(resp.getContentText());
          console.log(`[${models[i].Username}] Scrape model metadata ...DONE. ` 
            + `Found ${models[i].scrapeResponse.data.length} new medias.`);
          collector.success(models[i]);
        } else {
          console.log(`[${models[i].Username}] Scrape model metadata ...FAILED`);
          collector.error(models[i]);
        }
      }, {});
    } catch (e) {
      console.log(`${JSON.stringify(models.map(i => i.Username))} Scrape model metadata ...FAILED`, e);
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
        console.log(`[${model.Username}] Store ${dones.length}/${medias.length}. Remaining: ${undones.length}`, e);
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
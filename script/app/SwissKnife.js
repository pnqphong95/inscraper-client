const SwissKnife = {

  pageableLoopWithOptions(options, list, processFunc) {
    return this.pageableLoop(list, processFunc, { 
      pageSize: options.pageSize,
      afterFunc: options.afterFunc,
      timeout: options.timeout,
      timeoutFunc: options.timeoutFunc
    });
  },

  pageableLoop: function(list, processFunc, { pageSize, afterFunc, timeout, timeoutFunc }) {
    const collector = this.collector();
    const size = pageSize || 5, endTime = timeout || new Date(new Date().getTime() + 300000);
    if (!list || !processFunc) return collector;
    var dones = [], start = 0, end = Math.min(list.length, size);
    while (dones.length < list.length) {
      if (endTime <= new Date()) {
        if (timeoutFunc) timeoutFunc(collector);
        const undones = list.filter(item => !dones.includes(item));
        collector.allRemain(undones);
        break;
      }
      const subList = list.slice(start, end);
      processFunc(subList, collector);
      dones = dones.concat(subList);
      start = start + subList.length;
      end = Math.min(list.length, end + subList.length);
    }
    if (afterFunc) afterFunc(collector);
    return collector;
  },

  executeLoopWithTimeout(timeout, list, processFunc) {
    return this.executeLoop(list, processFunc, { timeout }); 
  },
  
  executeLoop: function(list, processFunc, { timeout }) {
    const collector = this.collector();
    const dones = [], endTime = timeout || new Date(new Date().getTime() + 300000);
    for(var i = 0; i < list.length; i++) {
      if (endTime <= new Date()) {
        const undones = list.filter(item => !dones.includes(item));
        collector.allRemain(undones);
        break;
      }
      const item = list[i];
      processFunc(item, i, collector);
      dones.push(item);
    }
    return collector;
  },

  collector: function() {
    return {
      successItems: [], remainItems: [], errorItems: [],
      
      successCount: function() {
        return this.successItems.length;
      },
      
      success: function(item) {
        this.successItems.push(item);
      },

      allSuccess: function(listItem) {
        this.successItems = this.successItems.concat(listItem);
      },
      
      remain: function(item) {
        this.remainItems.push(item);
      },

      allRemain: function(listItem) {
        this.remainItems = this.remainItems.concat(listItem);
      },
      
      error: function(item) {
        this.errorItems.push(item);
      },

      allError: function(listItem) {
        this.errorItems = this.errorItems.concat(listItem);
      }

    }
  }

}
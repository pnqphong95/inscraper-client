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
    const collector = this.collector(), size = pageSize || 5;
    if (!list || !processFunc) return collector;
    var dones = [], start = 0, end = Math.min(list.length, size);
    while (dones.length < list.length) {
      if (timeout && timeout <= new Date()) {
        if (timeoutFunc) timeoutFunc(collector);
        collector.allRemain(list.filter(item => 
          !dones.includes(item) && !collector.remainItems.includes(item))
        );
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
    return this.executeLoop(list, processFunc, timeout); 
  },
  
  executeLoop: function(list, processFunc, timeout) {
    const collector = this.collector(), dones = [];
    if (!list || !processFunc) return collector;
    for(var i = 0; i < list.length; i++) {
      if (timeout && timeout <= new Date()) {
        collector.allRemain(list.filter(item => 
          !dones.includes(item) && !collector.remainItems.includes(item))
        );
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
      
      remainCount: function() {
        return this.remainItems.length;
      },
      
      success: function(item) {
        this.successItems.push(item);
        return this;
      },

      allSuccess: function(listItem) {
        this.successItems = this.successItems.concat(listItem);
        return this;
      },
      
      remain: function(item) {
        this.remainItems.push(item);
        return this;
      },

      allRemain: function(listItem) {
        this.remainItems = this.remainItems.concat(listItem);
        return this;
      },
      
      error: function(item) {
        this.errorItems.push(item);
        return this;
      },

      allError: function(listItem) {
        this.errorItems = this.errorItems.concat(listItem);
        return this;
      }

    }
  },

  timestampToDateStr(timestamp) {
    const date = new Date(timestamp * 1000);
    let mm = date.getMonth() + 1;
    let dd = date.getDate();
    if (mm < 10) mm = '0' + mm; 
    if (dd < 10) dd = '0' + dd;
    return date.getFullYear() + '' + mm + '' + dd;
  },

  prefixesByTimestamp(original, timestamp) {
    const datePostedStr = this.timestampToDateStr(timestamp);
    return 'TS_'.concat(datePostedStr, '_', original);
  }

}
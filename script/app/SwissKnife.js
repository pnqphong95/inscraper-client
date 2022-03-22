const SwissKnife = {
  runCallbackInChunk: function(listItems, cbFunc, { cSize, outChunkCbFunc, timeout, timeoutCbFunc }) {
    const collector = { success: [], remain: [], error: [] };
    const chunkSize = cSize || 5, endTime = timeout || new Date(new Date().getTime() + 300000);
    if (!listItems || !cbFunc) return collector;
    var dones = [], start = 0, end = Math.min(listItems.length, chunkSize);
    while (dones.length < listItems.length) {
      if (endTime <= new Date()) {
        if (timeoutCbFunc) timeoutCbFunc(collector);
        const undones = listItems.filter(item => !dones.includes(item));
        collector.remain = collector.remain.concat(undones);
        break;
      }
      const workingItems = listItems.slice(start, end);
      cbFunc(collector, workingItems);
      dones = dones.concat(workingItems);
      start = start + workingItems.length;
      end = Math.min(listItems.length, end + workingItems.length);
    }
    if (outChunkCbFunc) outChunkCbFunc(collector);
    return collector;
  },
  runInLoop: function(listItems, cbFunc, { timeout, timeoutCbFunc }) {
    const collector = { success: [], remain: [], error: [] };
    const dones = [], endTime = timeout || new Date(new Date().getTime() + 300000);
    for(var i = 0; i < listItems.length; i++) {
      if (endTime <= new Date()) {
        if (timeoutCbFunc) timeoutCbFunc(collector);
        const undones = listItems.filter(item => !dones.includes(item));
        collector.remain = collector.remain.concat(undones);
        break;
      }
      const item = listItems[i];
      cbFunc(item, i, collector);
      dones.push(item);
    }
    return collector;
  }
}
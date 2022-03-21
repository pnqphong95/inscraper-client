const SwissKnife = {
  runCallbackInChunk: function(listItems, cbFunc, { cSize, outChunkCbFunc, timeout, timeoutCbFunc }) {
    const result = { success: [], remain: [], error: [] };
    const chunkSize = cSize || 5, endTime = timeout || new Date(new Date().getTime() + 4 * 60000);
    if (!listItems || !cbFunc) return result;
    var dones = [], start = 0, end = Math.min(listItems.length, chunkSize);
    while (dones.length < listItems.length) {
      if (endTime <= new Date()) {
        if (timeoutCbFunc) timeoutCbFunc(result);
        const undones = listItems.filter(item => !dones.includes(item));
        result.remain = result.remain.concat(undones);
        break;
      }
      const workingItems = listItems.slice(start, end);
      cbFunc(result, workingItems);
      dones = dones.concat(workingItems);
      start = start + workingItems.length;
      end = Math.min(listItems.length, end + workingItems.length);
    }
    if (outChunkCbFunc) outChunkCbFunc(result);
    return result;
  }
}
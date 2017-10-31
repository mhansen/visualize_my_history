window.appModel = new Backbone.Model;

let throbberView = new hv.LoadingView({
  el: "#throbber",
  model: appModel
});

let loadingMessageView = new hv.LoadingView({
  el: "#loadingMessage",
  model: appModel
});

let graph = new hv.Graph({
  el: "#graph",
  model: appModel
});

appModel.set({
  loading: true,
  loadingText: 'Fetching History...'
});

console.time("Getting historyItems");
console.profile("Getting historyItems");
chrome.history.search({
  text: "",
  startTime: 0,
  maxResults: 0
}
, function(historyItems) {
  let allVisits = [];
  let c = historyItems.length;
  return historyItems.forEach(historyItem =>
    chrome.history.getVisits({url: historyItem.url}, function(visits) {
      for (let visit of Array.from(visits)) {
        visit.historyItem = historyItem;
        visit.date = new Date(visit.visitTime);
        visit.day = new Date(visit.visitTime);
        visit.day.setHours(12);
        visit.day.setMinutes(0);
        visit.day.setSeconds(0);
        visit.day.setMilliseconds(0);

        allVisits.push(visit);
      }
      // When this counter hits 0, we've finished all the async callbacks.
      c--;
      if (c === 0) {
        console.timeEnd("Getting historyItems");
        console.profileEnd("Getting historyItems");
        return appModel.set({allVisits});
      }
    })
  );
});

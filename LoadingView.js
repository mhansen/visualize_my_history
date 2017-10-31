
window.hv = window.hv || {};

window.hv.LoadingView = Backbone.View.extend({
  initialize: function(options) {
    var _this = this;
    this.model = options.model;
    return this.model.bind("change", function() {
      return _this.render();
    });
  },
  render: function() {
    if (this.model.get("loading")) {
      return $(this.el).show().text(this.model.get("loadingText"));
    } else {
      return $(this.el).hide();
    }
  }
});

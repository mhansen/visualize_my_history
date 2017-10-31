
window.hv = window.hv || {};

window.hv.Throbber = Backbone.View.extend({
  initialize: function(options) {
    var _this = this;
    this.model = options.model;
    return this.model.bind("change:throbbing", function() {
      return _this.render();
    });
  },
  render: function() {
    if (this.model.get("throbbing")) {
      return $(this.el).show();
    } else {
      return $(this.el).hide();
    }
  }
});

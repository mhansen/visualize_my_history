window.hv = window.hv || {};
window.hv.Throbber = Backbone.View.extend({
  initialize(options) {
    this.model = options.model;
    this.model.bind("change:throbbing", () => this.render());
  },
  render() {
    if (this.model.get("throbbing")) {
      $(this.el).show();
    } else {
      $(this.el).hide();
    }
  }
});
